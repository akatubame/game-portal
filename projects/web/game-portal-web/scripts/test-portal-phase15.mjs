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
  await page.waitForFunction(({ key }) => localStorage.getItem(key) !== null, { key });
  const value = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  assert.ok(predicate(value), `${key}: 保存状態が期待と異なります`);
  return value;
}

async function cleared(page, key) {
  await page.waitForFunction(key => localStorage.getItem(key) === null, key);
  await page.locator(".ranking-submit").waitFor();
}

function solveWater(start) {
  const key = bottles => JSON.stringify(bottles);
  const queue = [{ bottles: start, path: [] }], seen = new Set([key(start)]);
  for (let head = 0; head < queue.length; head += 1) {
    const { bottles, path } = queue[head];
    if (bottles.every(bottle => bottle.length === 0 || (bottle.length === 4 && bottle.every(color => color === bottle[0])))) return path;
    for (let from = 0; from < bottles.length; from += 1) for (let to = 0; to < bottles.length; to += 1) {
      if (from === to || bottles[from].length === 0 || bottles[to].length === 4) continue;
      const color = bottles[from].at(-1);
      if (bottles[to].length && bottles[to].at(-1) !== color) continue;
      const next = bottles.map(bottle => [...bottle]);
      while (next[from].at(-1) === color && next[to].length < 4) next[to].push(next[from].pop());
      const nextKey = key(next);
      if (!seen.has(nextKey)) { seen.add(nextKey); queue.push({ bottles: next, path: [...path, [from, to]] }); }
    }
  }
  throw Error("Water Sortの解がありません");
}

function mazePath(maze, size, from) {
  const queue = [{ index: from, path: [] }], seen = new Set([from]);
  for (let head = 0; head < queue.length; head += 1) {
    const { index, path } = queue[head];
    if (index === maze.length - 1) return path;
    for (const [direction, offset] of [["top", -size], ["right", 1], ["bottom", size], ["left", -1]]) {
      if (maze[index].walls[direction]) continue;
      const next = index + offset;
      if (!seen.has(next)) { seen.add(next); queue.push({ index: next, path: [...path, direction] }); }
    }
  }
  throw Error(`迷路のゴールへ到達できません: ${JSON.stringify({ size, from, reached: seen.size, cells: maze.length, openings: maze.filter(cell => !cell.walls.top || !cell.walls.right || !cell.walls.bottom || !cell.walls.left).length })}`);
}

const moveLabels = { top: "Move up", right: "Move right", bottom: "Move down", left: "Move left" };

try {
  {
    const { page, context } = await open("waterSort");
    const key = "game-shelf-progress-water-sort-v1";
    await page.locator(".watersort-bottle").nth(0).click();
    await page.locator(".watersort-bottle").nth(3).click();
    const saved = await progress(page, key, value => value.moves === 1 && value.history.length === 1);
    await page.reload();
    await page.locator(".watersort-bottle").first().waitFor();
    assert.equal(await page.locator(".watersort-score strong").nth(1).innerText(), "1");
    assert.deepEqual(await page.locator(".watersort-bottle").evaluateAll(nodes => nodes.map(node =>
      Array.from(node.querySelectorAll(".watersort-layer")).map(layer =>
        ["red", "blue", "green", "yellow", "purple", "orange"].find(color => layer.classList.contains(`is-${color}`))))), saved.bottles);
    await page.locator(".control-row .ghost-button").first().click();
    await page.waitForFunction(key => localStorage.getItem(key) === null, key);
    await page.locator(".watersort-levels button").nth(1).click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    await page.locator(".watersort-levels button").first().click();
    const solution = solveWater(saved.history[0].bottles);
    assert.ok(solution.length > 0);
    for (const [from, to] of solution) {
      await page.locator(".watersort-bottle").nth(from).click();
      await page.locator(".watersort-bottle").nth(to).click();
    }
    await cleared(page, key);
    await context.close();
    console.log("Water Sort: 盤面・履歴の復元、Undo、ステージ変更、完走を確認");
  }
  {
    const { page, context } = await open("minesweeper");
    const key = "game-shelf-progress-minesweeper-v1";
    await page.locator(".control-row .ghost-button").click();
    await page.locator(".mine-cell").first().click();
    const ready = await progress(page, key, value => value.status === "ready" && value.board[0][0].flagged);
    assert.equal(ready.board.flat().filter(cell => cell.hasMine).length, 0);
    await page.reload();
    await page.locator(".mine-cell").first().waitFor();
    assert.ok(await page.locator(".mine-cell").first().evaluate(node => node.classList.contains("is-flagged")));
    await page.locator(".mine-cell").first().click();
    await page.waitForFunction(key => localStorage.getItem(key) === null, key);
    await page.locator(".control-row .ghost-button").click();
    await page.locator(".mine-cell").first().click();
    const saved = await progress(page, key, value => value.status === "playing" && value.board[0][0].revealed);
    assert.equal(saved.board.flat().filter(cell => cell.hasMine).length, 10);
    await page.reload();
    await page.locator(".mine-cell").first().waitFor();
    assert.match(await page.locator(".mine-progress").innerText(), /Exploring/);
    assert.equal(await page.locator(".mine-cell.is-revealed").count(), saved.board.flat().filter(cell => cell.revealed).length);
    await page.locator(".control-row .primary-button").click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, difficultyId: "easy", status: "playing", flagMode: false, seconds: 1, board: [[{ row: 0, column: 0, hasMine: false, adjacentMines: 0, revealed: true, flagged: false }]] })), key);
    await page.reload();
    await page.locator(".mine-cell").first().waitFor();
    assert.match(await page.locator(".mine-progress").innerText(), /Not started/);
    await page.locator(".mine-cell").first().click();
    const fresh = await progress(page, key, value => value.status === "playing");
    for (const cell of fresh.board.flat()) {
      if (cell.hasMine || cell.revealed) continue;
      if (await page.locator(".mine-progress").innerText().then(text => text.includes("Cleared"))) break;
      const target = page.locator(".mine-cell").nth(cell.row * 9 + cell.column);
      if (!await target.evaluate(node => node.classList.contains("is-revealed"))) await target.click();
    }
    await cleared(page, key);
    await context.close();
    console.log("マインスイーパー: 初手前の旗・安全な初手、盤面、タイマー、新規開始、完走を確認");
  }
  {
    const { page, context } = await open("hitBlow");
    const key = "game-shelf-progress-hit-blow-v1";
    await page.locator(".control-row .primary-button").click();
    const initial = await progress(page, key, value => value.guesses.length === 0);
    const wrong = initial.answer.slice(1) + initial.answer[0];
    for (const digit of wrong) await page.getByRole("button", { name: digit, exact: true }).click();
    await page.locator(".hitblow-actions .primary-button").click();
    await page.getByRole("button", { name: initial.answer[0], exact: true }).click();
    const saved = await progress(page, key, value => value.guesses.length === 1 && value.input.length === 1);
    await page.reload();
    await page.locator(".hitblow-keypad button").first().waitFor();
    assert.equal(await page.locator(".hitblow-score strong").first().innerText(), "1");
    assert.equal(await page.locator(".hitblow-history li strong").first().innerText(), wrong);
    assert.equal(await page.locator(".hitblow-input .is-filled").first().innerText(), saved.input);
    await page.locator(".hitblow-actions .ghost-button").click();
    for (const digit of saved.answer) await page.getByRole("button", { name: digit, exact: true }).click();
    await page.locator(".hitblow-actions .primary-button").click();
    await cleared(page, key);
    await page.locator(".control-row .primary-button").click();
    const next = await progress(page, key, value => value.guesses.length === 0 && value.input === "");
    assert.equal(next.difficulty, "normal");
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, difficulty: "normal", answer: "1111", input: "", guesses: [], seconds: 1 })), key);
    await page.reload();
    await page.locator(".hitblow-keypad button").first().waitFor();
    assert.match(await page.locator(".hitblow-progress").innerText(), /Ready/);
    await context.close();
    console.log("Hit & Blow: 推理履歴・入力・時間の復元、正解、新規開始、不正な答えの拒否を確認");
  }
  {
    const { page, context } = await open("mazeEscape");
    const key = "game-shelf-progress-maze-escape-v1";
    await page.locator(".maze-options button").first().click();
    const initial = await progress(page, key, value => value.difficulty === "small" && value.moves === 0);
    const first = mazePath(initial.maze, 9, 0)[0];
    await page.getByRole("button", { name: moveLabels[first] }).click();
    const saved = await progress(page, key, value => value.moves === 1);
    await page.reload();
    await page.locator(".maze-cell").first().waitFor();
    assert.equal(await page.locator(".maze-score strong").first().innerText(), "1");
    assert.equal(await page.locator(".maze-cell.is-player").count(), 1);
    assert.equal(await page.locator(".maze-cell").nth(saved.playerIndex).evaluate(node => node.classList.contains("is-player")), true);
    await page.locator(".control-row .primary-button").click();
    const fresh = await progress(page, key, value => value.moves === 0);
    assert.notEqual(fresh.maze.length, 0);
    await page.evaluate(({ key, value }) => {
      value.maze[0].walls.right = !value.maze[1].walls.left;
      localStorage.setItem(key, JSON.stringify(value));
    }, { key, value: fresh });
    await page.reload();
    await page.locator(".maze-cell").first().waitFor();
    assert.match(await page.locator(".maze-progress").innerText(), /Idle/);
    await page.locator(".maze-options button").first().click();
    await page.waitForFunction(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const value = JSON.parse(raw);
      return value.maze?.length === 81 && value.maze[0].walls.right === value.maze[1].walls.left;
    }, key);
    const final = await progress(page, key, value => value.moves === 0);
    for (const direction of mazePath(final.maze, 9, 0)) await page.getByRole("button", { name: moveLabels[direction] }).click();
    await cleared(page, key);
    await context.close();
    console.log("迷路脱出: 迷路・手数の復元、壁の不整合拒否、再生成、ゴール到達を確認");
  }
  assert.deepEqual(errors, []);
  console.log("Phase 15のブラウザ検証に成功しました。");
} finally {
  await browser.close();
}
