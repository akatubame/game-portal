import assert from "node:assert/strict";

const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const origin = new URL(base).origin;
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];

async function open(game) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(() => localStorage.setItem("game-shelf-language", "en"));
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(`${game}: ${error.message}`));
  await page.goto(`${base}/?game=${game}`);
  await page.locator(".puzzle-shell").waitFor();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(50);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${game}: ${width}pxで横方向に${overflow}pxはみ出しています`);
  }
  return { page, context };
}

async function progress(page, key, predicate = () => true) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = await page.evaluate(key => {
      const raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    }, key);
    if (value && predicate(value)) return value;
    await page.waitForTimeout(50);
  }
  throw Error(`${key}: 保存状態が期待と異なります`);
}

async function removed(page, key) {
  await page.waitForFunction(key => localStorage.getItem(key) === null, key);
}

try {
  {
    const { page, context } = await open("blackjack");
    const key = "game-shelf-progress-blackjack-v1";
    for (let count = 0; count < 15; count += 1) {
      await page.locator(".control-row .primary-button").click();
      if (await page.locator(".control-row .ghost-button").last().isEnabled()) break;
    }
    const saved = await progress(page, key, value => value.playerHand.length === 2);
    assert.equal(saved.deck.length, 48);
    await page.reload();
    await page.locator(".blackjack-card").first().waitFor();
    assert.equal(await page.locator(".blackjack-card.is-hidden").count(), 1);
    assert.match(await page.locator(".blackjack-stats").innerText(), /Your turn/);
    await page.locator(".control-row .ghost-button").last().click();
    await removed(page, key);
    await page.locator(".ranking-submit").waitFor();
    saved.deck[0] = saved.playerHand[0];
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value: saved });
    await page.reload();
    await page.locator(".blackjack-shell").waitFor();
    assert.match(await page.locator(".blackjack-stats").innerText(), /Idle/);
    await context.close();
    console.log("ブラックジャック: 山札・手札の復元、Stand、重複カード拒否を確認");
  }
  {
    const { page, context } = await open("nim");
    const key = "game-shelf-progress-nim-v1";
    await page.locator(".control-row .primary-button").click();
    await page.getByRole("button", { name: "take 1 from pile 1" }).click();
    const cpu = await progress(page, key, value => value.turn === "cpu");
    assert.equal(cpu.piles[0], 2);
    await page.reload();
    await page.locator(".nim-pile").first().waitFor();
    await page.waitForFunction(key => {
      const raw = localStorage.getItem(key);
      return raw && JSON.parse(raw).turn === "player";
    }, key);
    for (let step = 0; step < 12; step += 1) {
      if (await page.locator(".nim-progress").innerText().then(text => /Win|Loss/.test(text))) break;
      const state = await progress(page, key, value => value.turn === "player");
      const pileIndex = state.piles.findIndex(pile => pile > 0);
      await page.getByRole("button", { name: `take ${state.piles[pileIndex]} from pile ${pileIndex + 1}` }).click();
      await page.waitForFunction(key => {
        const raw = localStorage.getItem(key);
        return raw === null || JSON.parse(raw).turn === "player";
      }, key);
    }
    await removed(page, key);
    await page.locator(".control-row .primary-button").click();
    await progress(page, key, value => value.turn === "player");
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, setup: "classic", difficulty: "normal", piles: [8, 0, 0], turn: "player" })), key);
    await page.reload();
    await page.locator(".nim-pile").first().waitFor();
    assert.match(await page.locator(".nim-progress").innerText(), /Idle/);
    await context.close();
    console.log("Nim: COM手番の復元と再開、終局時削除、不正な石数の拒否を確認");
  }
  {
    const { page, context } = await open("ticTacToe");
    const key = "game-shelf-progress-tic-tac-toe-v1";
    await page.locator(".control-row .primary-button").click();
    await page.locator(".tic-cell").first().click();
    await progress(page, key, value => value.turn === "O" && value.board[0] === "X");
    await page.reload();
    await page.locator(".tic-cell").first().waitFor();
    await page.waitForFunction(() => document.querySelectorAll(".tic-cell.is-o").length === 1);
    const ticNearWin = { version: 1, board: ["X", "X", null, "O", "O", null, null, null, null], turn: "X", difficulty: "normal" };
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value: ticNearWin });
    await page.reload();
    await page.locator(".tic-cell").nth(2).click();
    await removed(page, key);
    await page.locator(".control-row .primary-button").click();
    await progress(page, key, value => value.board.every(cell => cell === null));
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, board: ["X", "X", null, null, null, null, null, null, null], turn: "X", difficulty: "normal" })), key);
    await page.reload();
    await page.locator(".tic-cell").first().waitFor();
    assert.match(await page.locator(".tic-record").innerText(), /Idle/);
    await context.close();
    console.log("三目並べ: COM手番復元、終局、手数不整合の拒否を確認");
  }
  {
    const { page, context } = await open("connectFour");
    const key = "game-shelf-progress-connect-four-v1";
    await page.locator(".control-row .primary-button").click();
    await page.getByRole("button", { name: "Drop in column 1" }).click();
    await progress(page, key, value => value.turn === "yellow" && value.board[35] === "red");
    await page.reload();
    await page.locator(".connect-cell").first().waitFor();
    await page.waitForFunction(() => document.querySelectorAll(".connect-cell.is-yellow").length === 1);
    const connectBoard = Array(42).fill(null);
    for (const index of [35, 28, 21]) connectBoard[index] = "red";
    for (const index of [36, 29, 22]) connectBoard[index] = "yellow";
    await page.evaluate(({ key, board }) => localStorage.setItem(key, JSON.stringify({ version: 1, board, turn: "red", difficulty: "normal" })), { key, board: connectBoard });
    await page.reload();
    await page.getByRole("button", { name: "Drop in column 1" }).click();
    await removed(page, key);
    await page.locator(".control-row .primary-button").click();
    await progress(page, key, value => value.board.every(cell => cell === null));
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, board: ["red", ...Array(41).fill(null)], turn: "yellow", difficulty: "normal" })), key);
    await page.reload();
    await page.locator(".connect-cell").first().waitFor();
    assert.match(await page.locator(".connect-record").innerText(), /Idle/);
    await context.close();
    console.log("コネクトフォー: COM手番復元、終局、浮いた石の拒否を確認");
  }
  {
    const { page, context } = await open("oneToFifty");
    const key = "game-shelf-progress-one-to-fifty-v1";
    await page.locator(".control-row .primary-button").click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "3", exact: true }).click();
    const saved = await progress(page, key, value => value.nextNumber === 2 && value.mistakes === 1);
    await page.reload();
    await page.locator(".one50-cell").first().waitFor();
    assert.equal(await page.locator(".one50-score strong").first().innerText(), "2");
    assert.equal(await page.locator(".one50-score strong").nth(2).innerText(), "1");
    assert.equal(await page.locator(".one50-cell.is-target").count(), 0);
    assert.deepEqual(await page.locator(".one50-cell").evaluateAll(nodes => nodes.map(node => node.textContent.trim() || null)), saved.board.map(cell => cell.value === null ? null : String(cell.value)));
    for (let number = 2; number <= 50; number += 1) await page.getByRole("button", { name: String(number), exact: true }).click();
    await removed(page, key);
    await page.locator(".ranking-submit").waitFor();
    await page.locator(".control-row .primary-button").click();
    await progress(page, key, value => value.nextNumber === 1);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, board: Array.from({ length: 25 }, (_, id) => ({ id, value: 1 })), nextNumber: 2, mistakes: 0, elapsedMs: 1000 })), key);
    await page.reload();
    await page.locator(".one50-cell").first().waitFor();
    assert.equal(await page.locator(".one50-cell:not([disabled])").count(), 0);
    await context.close();
    console.log("1to50: 盤面・ミス数・遅延ヒントの復元、50まで完走、重複数字の拒否を確認");
  }
  {
    const { page, context } = await open("solitaire");
    const key = "game-shelf-progress-solitaire-v1";
    await page.getByRole("button", { name: "Draw from stock" }).click();
    const saved = await progress(page, key, value => value.moves === 1 && value.state.waste.length === 1);
    await page.reload();
    await page.locator(".solitaire-card-button").first().waitFor();
    assert.equal(await page.locator(".solitaire-score strong").nth(1).innerText(), "1");
    const rankLabel = ({ 1: "A", 11: "J", 12: "Q", 13: "K" })[saved.state.waste[0].rank] ?? String(saved.state.waste[0].rank);
    assert.match(await page.getByRole("button", { name: "Select waste card" }).innerText(), new RegExp(rankLabel));
    await page.locator(".control-row .primary-button").click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    const suits = ["spades", "hearts", "diamonds", "clubs"];
    const foundations = Object.fromEntries(suits.map(suit => [suit, Array.from({ length: suit === "spades" ? 12 : 13 }, (_, index) => ({ id: `${suit}-${index + 1}`, suit, rank: index + 1, faceUp: true }))]));
    const nearWin = { version: 1, state: { stock: [], waste: [{ id: "spades-13", suit: "spades", rank: 13, faceUp: true }], foundations, tableau: Array.from({ length: 7 }, () => []) }, moves: 99, elapsedMs: 4000 };
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value: nearWin });
    await page.reload();
    await page.getByRole("button", { name: "Select waste card" }).click();
    await page.getByRole("button", { name: "♠ foundation" }).click();
    await removed(page, key);
    await page.locator(".ranking-submit").waitFor();
    saved.state.stock[0] = saved.state.waste[0];
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value: saved });
    await page.reload();
    await page.locator(".solitaire-card-button").first().waitFor();
    assert.equal(await page.locator(".solitaire-score strong").nth(1).innerText(), "0");
    await context.close();
    console.log("ソリティア: 52枚の復元、新規配り直し、完成、重複カードの拒否を確認");
  }
  assert.deepEqual(errors, []);
  console.log("Phase 17のブラウザ検証に成功しました。");
} finally {
  await browser.close();
}
