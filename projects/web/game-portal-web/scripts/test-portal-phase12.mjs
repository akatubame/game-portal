import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const origin = new URL(base).origin;
const japanese = /[ぁ-んァ-ヶ一-龯]/;
const errors = [];
const browser = await chromium.launch({ channel: "msedge", headless: true });

async function checkLanguage(page) {
  // 終局後のReact effectが停止時刻を反映するのを待つ。仮想時計は進めない。
  await page.waitForTimeout(50);
  const shell = page.locator(".puzzle-shell");
  const lead = await shell.locator(".lead").innerText();
  const scores = await shell.locator(".score-panel strong").allInnerTexts();
  assert.doesNotMatch(await shell.innerText(), japanese);
  const attributes = await shell.locator("[aria-label], [title], [placeholder]").evaluateAll(nodes =>
    nodes.map(node => ["aria-label", "title", "placeholder"].map(key => node.getAttribute(key) ?? "").join(" ")).join("\n"));
  assert.doesNotMatch(attributes, japanese);
  await page.locator(".language-switcher select").selectOption("ja");
  assert.match(await shell.locator(".lead").innerText(), japanese);
  await page.locator(".language-switcher select").selectOption("en");
  assert.equal(await shell.locator(".lead").innerText(), lead);
  assert.deepEqual(await shell.locator(".score-panel strong").allInnerTexts(), scores);
}

async function open(game) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(() => {
    Math.random = () => 0.99;
    if (/^https?:$/.test(location.protocol)) localStorage.setItem("game-shelf-language", "en");
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(`${game}: ${error.message}`));
  await page.clock.install();
  await page.goto(`${base}/?game=${game}`);
  await page.locator(".puzzle-shell[data-native-i18n]").waitFor();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await checkLanguage(page);
  return { page, context };
}

try {
  {
    const source = await readFile(new URL("../src/games/sudoku/puzzles.ts", import.meta.url), "utf8");
    const { sudokuPuzzles } = await import("data:text/javascript;base64," + Buffer.from(ts.transpile(source, { module: ts.ModuleKind.ESNext })).toString("base64"));
    const { page, context } = await open("sudoku");
    const puzzle = sudokuPuzzles[0];
    for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) if (!puzzle.puzzle[row][col]) {
      await page.locator(".sudoku-cell").nth(row * 9 + col).click();
      await page.locator(".number-pad button").nth(puzzle.solution[row][col] - 1).click();
    }
    await page.locator(".ranking-submit").waitFor();
    assert.match(await page.locator(".lead").innerText(), /Complete! Solved/);
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("snake");
    await page.locator(".control-row .primary-button").click();
    await page.evaluate(() => { const input = document.createElement("input"); input.id = "qa-input"; document.body.append(input); });
    await page.locator("#qa-input").press("w");
    assert.equal(await page.locator("#qa-input").inputValue(), "w");
    for (let tick = 0; tick < 12 && !/Apple collected/.test(await page.locator(".lead").innerText()); tick++) await page.clock.runFor(150);
    assert.match(await page.locator(".lead").innerText(), /Apple collected/);
    await checkLanguage(page);
    for (let tick = 0; tick < 20 && !/Game over/.test(await page.locator(".lead").innerText()); tick++) await page.clock.runFor(150);
    assert.match(await page.locator(".lead").innerText(), /Game over/);
    await page.locator(".ranking-submit").waitFor();
    await checkLanguage(page);
    await context.close();
  }
  for (const game of ["breakout", "pong"]) {
    const { page, context } = await open(game);
    if (game === "pong") await page.locator(".pong-difficulty button").first().click();
    await page.locator(".control-row .primary-button").click();
    const paddle = page.locator(game === "breakout" ? ".breakout-paddle" : ".pong-paddle.is-player");
    const positionBefore = await paddle.getAttribute("style");
    await page.evaluate(() => { const input = document.createElement("input"); input.id = "qa-input"; document.body.append(input); });
    await page.locator("#qa-input").press(game === "breakout" ? "d" : "w");
    assert.equal(await page.locator("#qa-input").inputValue(), game === "breakout" ? "d" : "w");
    assert.equal(await paddle.getAttribute("style"), positionBefore);
    await page.locator(".control-row .ghost-button").first().click();
    assert.match(await page.locator(".lead").innerText(), /Paused/);
    await checkLanguage(page);
    await page.locator(".control-row .ghost-button").first().click();
    assert.match(await page.locator(".lead").innerText(), /Resumed/);
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("reversi");
    await page.locator(".control-row .primary-button").click();
    await page.locator(".reversi-cell.is-legal").first().click();
    assert.match(await page.locator(".lead").innerText(), /CPU is thinking/);
    await checkLanguage(page);
    await page.clock.runFor(550);
    assert.match(await page.locator(".lead").innerText(), /CPU flipped/);
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("solitaire");
    await page.locator(".solitaire-stock-area .solitaire-slot").first().click();
    assert.equal(await page.locator(".score-panel strong").nth(1).innerText(), "1");
    await checkLanguage(page);
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Clear best" }).click();
    assert.equal(await page.locator(".score-panel strong").nth(1).innerText(), "1");
    await context.close();
  }
  {
    const { page, context } = await open("nonogram");
    const rows = ["01010", "11111", "11111", "01110", "00100"];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) if (rows[row][col] === "1") {
      await page.locator(`.nonogram-cell[data-row="${row}"][data-column="${col}"]`).click();
    }
    await page.locator(".ranking-submit").waitFor();
    assert.match(await page.locator(".lead").innerText(), /Solved Heart in/);
    await checkLanguage(page);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log("第12段階: 7ゲームの操作・英語表示・日英往復・クリア/終了を確認");
} finally {
  await browser.close();
}
