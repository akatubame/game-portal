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
    if (value !== null && predicate(value)) return value;
    await page.waitForTimeout(50);
  }
  throw Error(`${key}: 保存状態が期待と異なります`);
}

async function cleared(page, key) {
  await page.waitForFunction(key => localStorage.getItem(key) === null, key);
  await page.locator(".ranking-submit").waitFor();
}

try {
  {
    const { page, context } = await open("wordGuess");
    const key = "game-shelf-progress-word-guess-v1";
    await page.locator(".control-row .primary-button").click();
    const initial = await progress(page, key, value => value.attempts.length === 0);
    const wrong = initial.answer === "ABOUT" ? "ABOVE" : "ABOUT";
    await page.keyboard.type(wrong.toLowerCase());
    await page.locator(".wordguess-actions .primary-button").click();
    await page.keyboard.type("ap");
    const saved = await progress(page, key, value => value.attempts.length === 1 && value.input === "AP");
    await page.reload();
    await page.locator(".wordguess-tile").first().waitFor();
    assert.equal(await page.locator(".wordguess-score strong").nth(1).innerText(), "5");
    assert.equal(await page.locator(".wordguess-tile").nth(5).innerText(), "A");
    assert.equal(saved.attempts[0].guess, wrong);
    await page.locator(".wordguess-actions .ghost-button").click();
    await page.locator(".wordguess-actions .ghost-button").click();
    await page.keyboard.type(saved.answer.toLowerCase());
    await page.locator(".wordguess-actions .primary-button").click();
    await cleared(page, key);
    await page.locator(".control-row .primary-button").click();
    await progress(page, key, value => value.attempts.length === 0 && value.input === "");
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, answer: "ZZZZZ", input: "", attempts: [] })), key);
    await page.reload();
    await page.locator(".wordguess-tile").first().waitFor();
    assert.match(await page.locator(".wordguess-progress").innerText(), /Idle/);
    await context.close();
    console.log("Word Guess: 判定履歴・入力途中の復元、クリア、無効な答えの拒否を確認");
  }
  {
    const { page, context } = await open("poker");
    const key = "game-shelf-progress-poker-v1";
    await page.locator(".control-row .primary-button").click();
    await page.locator(".poker-card").first().click();
    await page.locator(".poker-card").nth(2).click();
    const saved = await progress(page, key, value => value.selectedIndexes.length === 2);
    assert.equal(saved.deck.length, 47);
    await page.reload();
    await page.locator(".poker-card").first().waitFor();
    assert.equal(await page.locator(".poker-card.is-selected").count(), 2);
    assert.match(await page.locator(".poker-result").innerText(), /2 selected/);
    await page.locator(".control-row .ghost-button").first().click();
    await cleared(page, key);
    await page.locator(".control-row .primary-button").click();
    const fresh = await progress(page, key, value => value.selectedIndexes.length === 0);
    fresh.deck[0] = fresh.hand[0];
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value: fresh });
    await page.reload();
    await page.locator(".poker-placeholder").waitFor();
    assert.equal(await page.locator(".poker-card").count(), 0);
    await context.close();
    console.log("ポーカー: 山札・手札・交換選択の復元、交換、重複カードの拒否を確認");
  }
  {
    const { page, context } = await open("yachtDice");
    const key = "game-shelf-progress-yacht-dice-v1";
    await page.locator(".yacht-controls .ghost-button").click();
    await page.locator(".yacht-controls .primary-button").click();
    await page.locator(".yacht-dice-row button").first().click();
    const saved = await progress(page, key, value => value.rollsLeft === 2 && value.held[0]);
    await page.reload();
    await page.locator(".yacht-dice-row button").first().waitFor();
    assert.equal(await page.locator(".yacht-score strong").nth(2).innerText(), "2");
    assert.equal(await page.locator(".yacht-dice-row button.is-held").count(), 1);
    assert.equal(await page.locator(".yacht-dice-row button").first().getAttribute("aria-label"), `die 1: ${saved.dice[0]} held`);
    await page.locator(".yacht-sheet button").first().click();
    const scored = await progress(page, key, value => value.scores.ones !== undefined && value.rollsLeft === 3);
    assert.equal(scored.lastScored.id, "ones");
    for (let category = 1; category < 13; category += 1) {
      await page.locator(".yacht-controls .primary-button").click();
      await page.locator(".yacht-sheet button").nth(category).click();
    }
    await cleared(page, key);
    await page.locator(".yacht-controls .ghost-button").click();
    await progress(page, key, value => Object.keys(value.scores).length === 0);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, dice: [7, 1, 1, 1, 1], held: [false, false, false, false, false], rollsLeft: 2, scores: {}, lastScored: null })), key);
    await page.reload();
    await page.locator(".yacht-dice-row button").first().waitFor();
    assert.match(await page.locator(".yacht-progress").innerText(), /Idle/);
    await context.close();
    console.log("ヨットダイス: サイコロ・ホールド・スコア表の復元、全13役の完走、不正な目の拒否を確認");
  }
  {
    const { page, context } = await open("simonSays");
    const key = "game-shelf-progress-simon-says-v1";
    await page.locator(".control-row .primary-button").click();
    const first = await progress(page, key, value => value.sequence.length === 1);
    await page.waitForFunction(() => [...document.querySelectorAll(".simon-pad")].some(button => !button.disabled));
    await page.locator(`.simon-pad.is-${first.sequence[0]}`).click();
    const second = await progress(page, key, value => value.sequence.length === 2);
    await page.waitForFunction(() => [...document.querySelectorAll(".simon-pad")].some(button => !button.disabled));
    await page.locator(`.simon-pad.is-${second.sequence[0]}`).click();
    assert.match(await page.locator(".simon-score strong").nth(1).innerText(), /2\/2/);
    await page.reload();
    await page.locator(".simon-pad").first().waitFor();
    assert.match(await page.locator(".simon-progress").innerText(), /Showing sequence/);
    await page.waitForFunction(() => [...document.querySelectorAll(".simon-pad")].some(button => !button.disabled));
    assert.match(await page.locator(".simon-score strong").nth(1).innerText(), /1\/2/);
    const wrong = ["green", "red", "yellow", "blue"].find(color => color !== second.sequence[0]);
    await page.locator(`.simon-pad.is-${wrong}`).click();
    await cleared(page, key);
    await page.locator(".control-row .primary-button").click();
    await progress(page, key, value => value.sequence.length === 1);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, sequence: ["purple"] })), key);
    await page.reload();
    await page.locator(".simon-pad").first().waitFor();
    assert.match(await page.locator(".simon-progress").innerText(), /Idle/);
    await context.close();
    console.log("Simon Says: 入力途中の再提示、失敗時削除、無効な色の拒否を確認");
  }
  {
    const { page, context } = await open("memory");
    const key = "game-shelf-progress-memory-v1";
    await page.locator(".memory-card").first().click();
    const initial = await progress(page, key, value => value.selectedCardId === value.cards[0].id && value.moves === 0);
    await page.reload();
    await page.locator(".memory-card").first().waitFor();
    assert.equal(await page.locator(".memory-card.is-visible:not(.is-matched)").count(), 1);
    const other = initial.cards.findIndex(card => card.pairId !== initial.cards[0].pairId);
    await page.locator(".memory-card").nth(other).click();
    await page.waitForFunction(key => {
      const raw = localStorage.getItem(key);
      return raw && JSON.parse(raw).selectedCardId !== null;
    }, key);
    await page.reload();
    await page.locator(".memory-card").first().waitFor();
    assert.equal(await page.locator(".memory-card.is-visible:not(.is-matched)").count(), 1);
    assert.equal(await page.locator(".memory-stats strong").first().innerText(), "0");
    await page.locator(".control-row .primary-button").click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    await page.locator(".memory-card").first().click();
    const fresh = await progress(page, key, value => value.cards.length === 12);
    const pairs = Array.from({ length: 6 }, (_, pair) => fresh.cards.flatMap((card, index) => card.pairId === String(pair) ? [index] : []));
    const selectedPair = Number(fresh.cards[0].pairId);
    const order = [selectedPair, ...pairs.map((_, index) => index).filter(index => index !== selectedPair)];
    for (let step = 0; step < order.length; step += 1) {
      const [first, second] = pairs[order[step]];
      if (step > 0) await page.locator(".memory-card").nth(first).click();
      await page.locator(".memory-card").nth(step === 0 && second === 0 ? first : second).click();
      await page.waitForFunction(expected => document.querySelectorAll(".memory-card.is-matched").length === expected, (step + 1) * 2);
    }
    await cleared(page, key);
    await context.close();
    console.log("神経衰弱: 1枚目・判定待ちの復元、全ペア完走、新規開始を確認");
  }
  assert.deepEqual(errors, []);
  console.log("Phase 16のブラウザ検証に成功しました。");
} finally {
  await browser.close();
}
