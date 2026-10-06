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

async function progress(page, key, expectedMoves = null) {
  await page.waitForFunction(({ key, expectedMoves }) => {
    const raw = localStorage.getItem(key);
    return raw !== null && (expectedMoves === null || JSON.parse(raw).moves === expectedMoves);
  }, { key, expectedMoves }, { timeout: 5000 });
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
}

async function displayedColors(page, selector, colors) {
  return page.locator(selector).evaluateAll((nodes, palette) => nodes.map(node =>
    palette.find(color => node.classList.contains(`is-${color}`)) ?? null), colors);
}

async function reloadGame(page, selector) {
  await page.reload();
  await page.locator(selector).first().waitFor();
}

async function expectProgressCleared(page, key) {
  await page.waitForFunction(key => localStorage.getItem(key) === null, key, { timeout: 5000 });
  await page.locator(".ranking-submit").waitFor();
}

try {
  {
    const { page, context } = await open("lightsOut");
    const key = "game-shelf-progress-lights-out-v1";
    await page.locator(".select-label select").selectOption("normal");
    const target = await page.locator(".light-cell").evaluateAll(nodes => {
      const size = Math.sqrt(nodes.length);
      const lit = nodes.map(node => node.classList.contains("is-lit"));
      for (let index = 0; index < nodes.length; index++) {
        const row = Math.floor(index / size), col = index % size;
        const next = [...lit];
        for (const [r, c] of [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]])
          if (r >= 0 && r < size && c >= 0 && c < size) next[r * size + c] = !next[r * size + c];
        if (next.some(Boolean)) return index;
      }
      return -1;
    });
    assert.ok(target >= 0);
    await page.locator(".light-cell").nth(target).click();
    const saved = await progress(page, key, 1);
    assert.equal(saved.difficultyId, "normal");
    await reloadGame(page, ".light-cell");
    assert.equal(await page.locator(".select-label select").inputValue(), "normal");
    assert.deepEqual(await page.locator(".light-cell").evaluateAll(nodes => nodes.map(node => node.classList.contains("is-lit"))), saved.board.flat());
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "1");
    await page.locator(".control-row .primary-button").click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    const nearlyCleared = Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) =>
      (row === 0 && col === 0) || (row === 1 && col === 0) || (row === 0 && col === 1)));
    await page.evaluate(({ key, board }) => localStorage.setItem(key, JSON.stringify({ version: 1, difficultyId: "normal", board, moves: 1, seconds: 3 })), { key, board: nearlyCleared });
    await reloadGame(page, ".light-cell");
    await page.locator(".light-cell").first().click();
    await expectProgressCleared(page, key);
    await context.close();
    console.log("ライツアウト: 難易度・盤面・手数の復元と新盤面での破棄を確認");
  }
  {
    const { page, context } = await open("hanoi");
    const key = "game-shelf-progress-hanoi-v1";
    await page.locator(".hanoi-options button").filter({ hasText: "3 disks" }).click();
    await page.locator(".hanoi-peg").first().click();
    await page.locator(".hanoi-peg").last().click();
    const saved = await progress(page, key, 1);
    assert.equal(saved.diskCount, 3);
    await reloadGame(page, ".hanoi-peg");
    assert.deepEqual(await page.locator(".hanoi-peg").evaluateAll(nodes => nodes.map(node =>
      Array.from(node.querySelectorAll(".hanoi-disk")).map(disk => Number(disk.textContent)))), saved.pegs);
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "1");
    await page.locator(".hanoi-options button").filter({ hasText: "4 disks" }).click();
    const fresh = await progress(page, key, 0);
    assert.equal(fresh.diskCount, 4);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, diskCount: 3, pegs: [[1, 2, 3], [], []], moves: 1, seconds: 10 })), key);
    await reloadGame(page, ".hanoi-peg");
    assert.match(await page.locator(".hanoi-progress").innerText(), /Idle/);
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "0");
    await page.locator(".hanoi-options button").filter({ hasText: "3 disks" }).click();
    for (const [from, to] of [[0, 2], [0, 1], [2, 1], [0, 2], [1, 0], [1, 2], [0, 2]]) {
      await page.locator(".hanoi-peg").nth(from).click();
      await page.locator(".hanoi-peg").nth(to).click();
    }
    await expectProgressCleared(page, key);
    await context.close();
    console.log("ハノイ: 円盤・手数・難易度の復元、開始し直し、不正な積み順の拒否を確認");
  }
  {
    const { page, context } = await open("pegSolitaire");
    const key = "game-shelf-progress-peg-solitaire-v1";
    await page.locator(".control-row .primary-button").click();
    await page.locator(".peg-cell").nth(3 * 7 + 1).click();
    await page.locator(".peg-cell").nth(3 * 7 + 3).click();
    const saved = await progress(page, key, 1);
    assert.equal(saved.board.filter(cell => cell === "peg").length, 31);
    await reloadGame(page, ".peg-cell");
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "31");
    assert.deepEqual(await page.locator(".peg-cell").evaluateAll(nodes => nodes.map(node =>
      node.classList.contains("is-peg") ? "peg" : node.classList.contains("is-empty") ? "empty" : "invalid")), saved.board);
    await page.locator(".control-row .primary-button").click();
    const fresh = await progress(page, key, 0);
    assert.equal(fresh.board.filter(cell => cell === "peg").length, 32);
    const nearWin = Array.from({ length: 49 }, (_, index) => {
      const row = Math.floor(index / 7), col = index % 7;
      if ((row < 2 || row > 4) && (col < 2 || col > 4)) return "invalid";
      return row === 3 && (col === 1 || col === 2) ? "peg" : "empty";
    });
    await page.evaluate(({ key, board }) => localStorage.setItem(key, JSON.stringify({ version: 1, board, moves: 30 })), { key, board: nearWin });
    await reloadGame(page, ".peg-cell");
    await page.locator(".peg-cell").nth(3 * 7 + 1).click();
    await page.locator(".peg-cell").nth(3 * 7 + 3).click();
    await expectProgressCleared(page, key);
    await context.close();
    console.log("ペグ・ソリティア: 盤面・残数・手数の復元と新規開始を確認");
  }
  {
    const { page, context } = await open("floodFill");
    const key = "game-shelf-progress-flood-fill-v1";
    await page.locator(".control-row .primary-button").click();
    await page.locator(".flood-palette button:not(.is-current)").first().click();
    const saved = await progress(page, key, 1);
    await reloadGame(page, ".flood-cell");
    assert.deepEqual(await displayedColors(page, ".flood-cell", ["coral", "gold", "mint", "sky", "violet", "rose"]), saved.board);
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "1");
    await page.locator(".control-row .primary-button").click();
    const fresh = await progress(page, key, 0);
    assert.equal(fresh.difficulty, "normal");
    const nearWin = Array.from({ length: 100 }, (_, index) => index === 99 ? "gold" : "coral");
    await page.evaluate(({ key, board }) => localStorage.setItem(key, JSON.stringify({ version: 1, difficulty: "normal", board, moves: 1 })), { key, board: nearWin });
    await reloadGame(page, ".flood-cell");
    await page.locator(".flood-palette button.is-gold").click();
    await expectProgressCleared(page, key);
    await context.close();
    console.log("Flood Fill: 盤面・手数の復元と新規開始を確認");
  }
  {
    const { page, context } = await open("sameGame");
    const key = "game-shelf-progress-same-game-v1";
    await page.locator(".control-row .primary-button").click();
    const target = await page.locator(".same-cell").evaluateAll(nodes => {
      const columns = 10;
      const color = node => ["coral", "gold", "mint", "sky", "violet"].find(value => node.classList.contains(`is-${value}`));
      for (let index = 0; index < nodes.length; index++) {
        const current = color(nodes[index]);
        if (current && ((index % columns < columns - 1 && color(nodes[index + 1]) === current) ||
          (index + columns < nodes.length && color(nodes[index + columns]) === current))) return index;
      }
      return -1;
    });
    assert.ok(target >= 0);
    await page.locator(".same-cell").nth(target).click();
    const saved = await page.waitForFunction(key => {
      const raw = localStorage.getItem(key);
      return raw !== null && JSON.parse(raw).lastRemoved > 0;
    }, key, { timeout: 5000 }).then(() => progress(page, key));
    await reloadGame(page, ".same-cell");
    assert.deepEqual(await displayedColors(page, ".same-cell", ["coral", "gold", "mint", "sky", "violet"]), saved.board);
    assert.equal(Number(await page.locator(".score-panel strong").first().innerText()), saved.score);
    assert.equal(Number(await page.locator(".score-panel strong").nth(2).innerText()), saved.lastRemoved);
    await page.locator(".control-row .primary-button").click();
    const fresh = await page.waitForFunction(key => {
      const raw = localStorage.getItem(key);
      return raw !== null && JSON.parse(raw).lastRemoved === 0;
    }, key, { timeout: 5000 }).then(() => progress(page, key));
    assert.equal(fresh.score, 0);
    const nearWin = Array.from({ length: 100 }, (_, index) => index < 2 ? "coral" : null);
    await page.evaluate(({ key, board }) => localStorage.setItem(key, JSON.stringify({ version: 1, difficulty: "normal", board, score: 10, lastRemoved: 2 })), { key, board: nearWin });
    await reloadGame(page, ".same-cell");
    await page.locator(".same-cell").first().click();
    await expectProgressCleared(page, key);
    await context.close();
    console.log("さめがめ: 盤面・点数・直前消去数の復元と新規開始を確認");
  }
  assert.deepEqual(errors, []);
  console.log("第14段階: 5ゲームの途中保存・再開・クリア時の破棄と320px/390px表示を確認");
} finally {
  await browser.close();
}
