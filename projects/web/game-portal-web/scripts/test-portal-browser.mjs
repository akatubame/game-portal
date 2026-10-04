import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
// ワークスペースに導入済みのPlaywrightを利用。別配置時は環境変数でモジュールURLを指定する。
const { chromium } = await import(process.env.PORTAL_PLAYWRIGHT_MODULE ??
  new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url).href);
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
async function context(language = "ja", mode = "normal") {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route("**/*", route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  await ctx.addInitScript(({ language, mode }) => {
    // 新しいタブのabout:blankには保存領域がないため、初期化はHTTPページだけで行う。
    if (!/^https?:$/.test(location.protocol)) return;
    localStorage.setItem("game-shelf-language", language);
    if (mode === "invalid") {
      localStorage.setItem("game-shelf-reaction-history", "{}");
      localStorage.setItem("game-shelf-nonogram-record", "null");
      localStorage.setItem("game-shelf-blackjack-record", "{}");
    }
    if (mode === "blocked") {
      for (const method of ["getItem", "setItem", "removeItem"])
        Storage.prototype[method] = () => { throw new DOMException("テスト用保存拒否", "SecurityError"); };
    }
  }, { language, mode });
  ctx.on("page", page => page.on("pageerror", error => errors.push(error.message)));
  return ctx;
}
async function open(ctx, game) {
  const page = await ctx.newPage();
  await page.goto(base + "/?game=" + game);
  await page.locator(".puzzle-shell").waitFor();
  return page;
}
async function moduleSource(relative) {
  const source = await readFile(new URL(relative, import.meta.url), "utf8");
  return import("data:text/javascript;base64," + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext }
  }).outputText).toString("base64"));
}
try {
  const ctx = await context();
  let page = await open(ctx, "minesweeper");
  const cells = page.locator(".minesweeper-board button");
  await cells.nth(0).click({ button: "right" });
  await cells.nth(0).click({ button: "right" });
  await cells.nth(40).click();
  assert.doesNotMatch(await page.locator(".lead").innerText(), /クリア|地雷を踏み/);
  assert.ok(await page.locator(".minesweeper-board .is-revealed").count() < 81);
  await page.close();
  console.log("マインスイーパー: 初手前の旗操作後も正しく開く");

  page = await open(ctx, "memory");
  const symbols = await page.locator(".memory-card-front").allTextContents();
  const partner = symbols.findIndex((s, i) => i > 0 && s === symbols[0]);
  await page.locator(".memory-card").nth(0).click();
  await page.locator(".memory-card").nth(partner).click();
  await page.getByRole("button", { name: "リセット", exact: true }).click();
  await page.waitForTimeout(1100);
  assert.equal(await page.locator(".memory-card.is-matched").count(), 0);
  assert.equal(await page.locator(".memory-card.is-visible").count(), 0);
  // 難易度変更時も古いカードのタイマーが混入しない。
  await page.locator(".memory-card").nth(0).click();
  await page.locator(".memory-card").nth(1).click();
  await page.locator(".memory-side select").selectOption("normal");
  await page.waitForTimeout(1100);
  assert.equal(await page.locator(".memory-card.is-visible").count(), 0);
  await page.close();
  console.log("神経衰弱: 判定待ち中のリセット・難易度変更を確認");

  page = await open(ctx, "snake");
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole("button", { name: "挑戦", exact: true }).click();
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  });
  await page.clock.runFor(150);
  assert.equal(await page.locator(".snake-overlay").count(), 0);
  assert.equal(await page.locator(".snake-cell").evaluateAll(cells => cells.findIndex(c => c.classList.contains("is-head"))), 8 * 18 + 8);
  await page.clock.resume();
  await page.close();
  console.log("スネーク: 1ティック内の二重方向入力で逆走しない");

  page = await open(ctx, "poker");
  await page.locator(".language-switcher select").selectOption("en");
  await page.waitForTimeout(150);
  await page.locator(".language-switcher select").selectOption("ja");
  await page.getByRole("button", { name: "配る", exact: true }).click();
  await page.waitForTimeout(150);
  assert.match(await page.locator(".lead").innerText(), /交換したいカードを選んでください/);
  await page.close();
  console.log("言語切替: 英語から日本語へ戻した後も進行説明が更新される");

  const { sudokuPuzzles } = await moduleSource("../src/games/sudoku/puzzles.ts");
  for (const language of ["ja", "en"]) {
    page = await open(ctx, "sudoku");
    await page.locator(".language-switcher select").selectOption(language);
    await page.locator(".sudoku-side select").selectOption(String(sudokuPuzzles.length - 1));
    const puzzle = sudokuPuzzles.at(-1);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!puzzle.puzzle[r][c]) {
      await page.locator(".sudoku-cell").nth(r * 9 + c).click();
      await page.locator(".number-pad button").nth(puzzle.solution[r][c] - 1).click();
    }
    assert.match(await page.locator(".lead").innerText(), language === "ja" ? /クリア|完成|正解/ : /Clear|Solved|Complete|solved|clear/i);
    assert.equal(await page.locator(".sudoku-cell.is-mistake").count(), 0);
    await page.close();
  }
  console.log("数独: 改訂問題を日英両モードで最後まで入力してクリア");
  await ctx.close();

  const { games } = await moduleSource("../src/games/gamesRegistry.ts");
  const published = games.filter(g => g.kind === "internal" && g.status === "available");
  for (const mode of ["normal", "blocked", "invalid"]) {
    const smoke = await context("en", mode);
    for (const game of published) {
      const p = await open(smoke, game.id);
      assert.ok((await p.locator(".puzzle-shell").innerText()).length > 20, game.id);
      if (mode === "blocked") await p.locator(".storage-notice").waitFor();
      await p.close();
    }
    await smoke.close();
    console.log("公開" + published.length + "ゲーム起動確認: " + mode);
  }
  assert.deepEqual(errors, []);
  console.log("ブラウザ回帰テスト成功（未捕捉例外なし）");
} finally {
  await browser.close();
}
