import assert from "node:assert/strict";

const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const origin = new URL(base).origin;
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];

async function open(game) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript((fixed2048) => {
    localStorage.setItem("game-shelf-language", "en");
    if (fixed2048) Math.random = () => 0.99;
  }, game === "2048");
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
  return { context, page };
}

async function progress(page, key) {
  await page.waitForFunction(key => localStorage.getItem(key) !== null, key, { timeout: 5000 });
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
}

try {
  {
    const { page, context } = await open("2048");
    const key = "game-shelf-progress-2048-v1";
    await page.keyboard.press("ArrowLeft");
    const saved = await progress(page, key);
    assert.equal(saved.version, 1);
    assert.equal(saved.moves, 1);
    await page.reload();
    assert.equal(Number(await page.locator(".score-panel strong").first().innerText()), saved.score);
    assert.deepEqual(await page.locator(".tile-2048").allInnerTexts(), saved.board.flat().map(value => value ? String(value) : ""));
    await page.locator(".control-row .primary-button").click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, board: [[4]], score: 99999, moves: 1 })), key);
    await page.reload();
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "0");
    assert.equal(JSON.parse(await page.evaluate(key => localStorage.getItem(key), key)).score, 99999);
    await context.close();
    console.log("2048: 盤面・点数の復元、初期化、破損データの隔離を確認");
  }
  {
    const { page, context } = await open("slide15");
    const key = "game-shelf-progress-slide15-v1";
    await page.locator(".slide15-tile.is-movable").first().click();
    const saved = await progress(page, key);
    assert.equal(saved.moves, 1);
    await page.reload();
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "1");
    assert.deepEqual(await page.locator(".slide15-tile").allInnerTexts(), saved.board.map(value => value ? String(value) : ""));
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "{}").seconds >= 1, key, { timeout: 5000 });
    await page.goto(base);
    const elapsed = (await progress(page, key)).seconds;
    await page.waitForTimeout(1300);
    await page.goto(`${base}/?game=slide15`);
    await page.locator(".slide15-tile").first().waitFor();
    const resumed = await progress(page, key);
    assert.ok(resumed.seconds <= elapsed + 1, "ページを離れている間にタイマーが進まないこと");
    await page.locator(".control-row .primary-button").click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    await context.close();
    console.log("15パズル: 盤面・手数の復元とシャッフル時の破棄を確認");
  }
  {
    const { page, context } = await open("sudoku");
    const key = "game-shelf-progress-sudoku-v1";
    await page.locator(".sudoku-cell[aria-label*='empty']").first().click();
    await page.locator(".control-row button").filter({ hasText: "Hint" }).click();
    const saved = await progress(page, key);
    assert.equal(saved.assisted, true);
    assert.equal(saved.puzzleId, "easy-01");
    await page.reload();
    assert.equal(await page.locator(".select-label select").inputValue(), "0");
    assert.deepEqual(await page.locator(".sudoku-cell").allInnerTexts(), saved.grid.flat().map(value => value ? String(value) : ""));
    await page.locator(".select-label select").selectOption("1");
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, puzzleId: "easy-01", grid: Array.from({ length: 9 }, () => Array(9).fill(9)), seconds: 10, assisted: false, showMistakes: true })), key);
    await page.reload();
    assert.equal(await page.locator(".select-label select").inputValue(), "0");
    assert.ok((await page.locator(".sudoku-cell").allInnerTexts()).some(value => value === ""));
    await context.close();
    console.log("数独: ヒント利用・盤面・問題選択の復元と問題切替時の破棄を確認");
  }
  {
    const { page, context } = await open("nonogram");
    const key = "game-shelf-progress-nonogram-v1";
    await page.locator('.nonogram-cell[data-row="0"][data-column="1"]').click();
    await page.locator(".nonogram-toolbar button").filter({ hasText: "Show answer" }).click();
    const saved = await progress(page, key);
    assert.equal(saved.assisted, true);
    assert.equal(saved.showAnswer, true);
    assert.equal(saved.moves, 1);
    await page.reload();
    assert.equal(await page.locator(".score-panel strong").nth(1).innerText(), "1");
    assert.deepEqual(await page.locator(".nonogram-cell").evaluateAll(nodes => nodes.map(node => node.classList.contains("is-filled") ? "filled" : node.classList.contains("is-marked") ? "marked" : "unknown")), saved.grid.flat());
    assert.match(await page.locator(".nonogram-toolbar button.is-active").allInnerTexts().then(values => values.join(" ")), /Show answer/);
    await page.locator(".control-row .primary-button").click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, puzzleId: "heart5", grid: [["filled"]], moves: 1, tool: "fill", showAnswer: false, assisted: false })), key);
    await page.reload();
    assert.equal(await page.locator(".score-panel strong").nth(1).innerText(), "0");
    await context.close();
    console.log("イラストロジック: 盤面・手数・補助利用の復元とやり直し時の破棄を確認");
  }
  {
    const { page, context } = await open("2048");
    const key = "game-shelf-ranking-2048-score";
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify([{ id: "legacy", name: "Legacy", score: 123, recordedAt: "2025-01-01T00:00:00.000Z" }])), key);
    await page.reload();
    assert.match(await page.locator(".ranking-list").innerText(), /Legacy[\s\S]*123/);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify([{ id: "broken", name: "Bad", score: "oops", recordedAt: "2025-01-01T00:00:00.000Z" }])), key);
    await page.reload();
    assert.equal(await page.locator(".ranking-list").count(), 0);
    await context.close();
    console.log("ランキング: displayのない旧記録を維持し、不正なスコアを除外");
  }
  assert.deepEqual(errors, []);
  console.log("第13段階: 4ゲームの途中保存・再開と共通ランキング互換を確認");
} finally {
  await browser.close();
}
