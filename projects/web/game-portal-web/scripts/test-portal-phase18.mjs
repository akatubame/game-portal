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

async function inject(page, key, value) {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value });
  await page.reload();
  await page.locator(".puzzle-shell").waitFor();
}

try {
  {
    const { page, context } = await open("reversi");
    const key = "game-shelf-progress-reversi-v1";
    await page.getByRole("button", { name: "New game" }).click();
    await page.locator(".reversi-cell.is-legal").first().click();
    const saved = await progress(page, key, value => value.board.filter(Boolean).length >= 5);
    await page.reload();
    await page.locator(".reversi-cell").first().waitFor();
    await page.waitForTimeout(650);
    assert.ok((await progress(page, key)).board.filter(Boolean).length >= saved.board.filter(Boolean).length);
    const board = Array(64).fill("black");
    board[0] = null;
    board[1] = "white";
    board[8] = "white";
    await inject(page, key, { version: 1, board, turn: "black", difficulty: "normal", lastMove: 2 });
    await page.locator(".reversi-cell").first().click();
    await removed(page, key);
    await page.getByRole("button", { name: "New game" }).click();
    await progress(page, key, value => value.board.filter(Boolean).length === 4);
    await inject(page, key, { version: 1, board: ["black", ...Array(63).fill(null)], turn: "black", difficulty: "normal", lastMove: 0 });
    assert.match(await page.locator(".reversi-record").innerText(), /Ready/);
    await context.close();
    console.log("リバーシ: 手番復元、終局削除、新規対局、不正盤面拒否を確認");
  }
  {
    const { page, context } = await open("snake");
    const key = "game-shelf-progress-snake-v1";
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Pause" }).click();
    const saved = await progress(page, key, value => value.snake.length === 3);
    await page.reload();
    await page.locator(".snake-overlay").getByText("PAUSED").waitFor();
    assert.equal(await page.locator(".snake-cell.is-head").count(), 1);
    await page.getByRole("button", { name: "Resume" }).click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).snake[0].x > 8, key);
    await page.getByRole("button", { name: "Pause" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await progress(page, key, value => value.snake[0].x === 8);
    await inject(page, key, { ...saved, snake: [{ x: 17, y: 9 }, { x: 16, y: 9 }, { x: 15, y: 9 }], food: { x: 13, y: 9 }, direction: "right" });
    await page.getByRole("button", { name: "Resume" }).click();
    await page.locator(".snake-overlay").getByText("GAME OVER").waitFor();
    await removed(page, key);
    await inject(page, key, { ...saved, food: saved.snake[0] });
    assert.match(await page.locator(".snake-progress").innerText(), /Ready/);
    await context.close();
    console.log("スネーク: 一時停止復元、移動継続、壁衝突終了、不正食物拒否を確認");
  }
  {
    const { page, context } = await open("breakout");
    const key = "game-shelf-progress-breakout-v1";
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Pause" }).click();
    const saved = await progress(page, key);
    await page.reload();
    await page.locator(".breakout-overlay").getByText("PAUSED").waitFor();
    await page.getByRole("button", { name: "Resume" }).click();
    await progress(page, key, value => value.ball.y !== saved.ball.y);
    await page.getByRole("button", { name: "Pause" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Pause" }).click();
    await progress(page, key, value => value.lives === 3 && value.bricks.every(brick => brick.alive));
    await inject(page, key, { ...saved, lives: 1, ball: { x: 0, y: 419, vx: 4.2, vy: 4.8 } });
    await page.getByRole("button", { name: "Resume" }).click();
    await page.locator(".breakout-overlay").getByText("GAME OVER").waitFor();
    await removed(page, key);
    await inject(page, key, { ...saved, bricks: saved.bricks.map(brick => ({ ...brick, id: "bad" })) });
    assert.match(await page.locator(".breakout-progress").innerText(), /Ready/);
    await context.close();
    console.log("ブロック崩し: 一時停止復元、球の継続、残機0終了、不正ブロック拒否を確認");
  }
  {
    const { page, context } = await open("pong");
    const key = "game-shelf-progress-pong-v1";
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Pause" }).click();
    const saved = await progress(page, key);
    await page.reload();
    await page.locator(".pong-overlay").getByText("PAUSED").waitFor();
    await page.getByRole("button", { name: "Resume" }).click();
    await progress(page, key, value => value.ball.x !== saved.ball.x);
    await page.getByRole("button", { name: "Pause" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Pause" }).click();
    await progress(page, key, value => value.playerScore === 0 && value.cpuScore === 0);
    await inject(page, key, { ...saved, playerScore: 4, ball: { x: 637, y: 200, vx: 5.2, vy: 0 } });
    await page.getByRole("button", { name: "Resume" }).click();
    await page.locator(".pong-overlay").getByText("MATCH END").waitFor();
    await removed(page, key);
    await inject(page, key, { ...saved, playerScore: 5 });
    assert.match(await page.locator(".pong-progress").innerText(), /Ready/);
    await context.close();
    console.log("ポン: 一時停止復元、ラリー継続、5点決着、不正得点拒否を確認");
  }
  assert.deepEqual(errors, []);
  console.log("Phase 18のブラウザ検証に成功しました。");
} finally {
  await browser.close();
}
