import assert from "node:assert/strict";
const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function value(board, turn) {
  for (const [a,b,c] of lines) if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a] === "X" ? 1 : -1;
  const empty = board.map((x,i) => x ? -1 : i).filter(i => i >= 0);
  if (!empty.length) return 0;
  const scores = empty.map(i => { const next = [...board]; next[i] = turn; return value(next, turn === "X" ? "O" : "X"); });
  return turn === "X" ? Math.max(...scores) : Math.min(...scores);
}
const errors = [];
try {
  for (const result of ["win", "lose", "draw"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("**/*", r => new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort());
    await context.addInitScript(() => { Math.random = () => 0.99; if (/^https?:$/.test(location.protocol)) localStorage.setItem("game-shelf-language", "en"); });
    const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
    await page.clock.install(); await page.goto(base + "/?game=ticTacToe");
    await page.locator(".tic-shell").waitFor(); await page.clock.pauseAt(new Date(Date.now() + 1000));
    async function languages() {
      const before = await page.locator(".lead").innerText();
      assert.doesNotMatch(await page.locator(".tic-shell").innerText(), /[ぁ-んァ-ヶ一-龯]/);
      await page.locator(".language-switcher select").selectOption("ja");
      assert.match(await page.locator(".lead").innerText(), /[ぁ-んァ-ヶ一-龯]/);
      await page.locator(".language-switcher select").selectOption("en");
      assert.equal(await page.locator(".lead").innerText(), before);
    }
    await languages();
    await page.locator(".tic-difficulty button").nth(result === "win" ? 0 : 2).click();
    for (let turn = 0; turn < 5; turn++) {
      const board = (await page.locator(".tic-cell").allTextContents()).map(s => s.trim());
      let index = turn;
      if (result !== "win") {
        const candidates = board.map((x,i) => x ? null : { index: i, value: value(board.map((x,j) => j === i ? "X" : x), "O") }).filter(Boolean);
        candidates.sort((a,b) => result === "draw" ? b.value-a.value : a.value-b.value);
        index = candidates[0].index;
      }
      await page.locator(".tic-cell").nth(index).click();
      await languages();
      await page.clock.runFor(450);
      await languages();
      if ((await page.locator(".tic-record").innerText()).includes("Finished")) break;
    }
    assert.match(await page.locator(".lead").innerText(), result === "win" ? /You win!/ : result === "lose" ? /CPU wins/ : /A draw!/);
    const record = await page.evaluate(() => JSON.parse(localStorage.getItem("game-shelf-tic-tac-toe-record")));
    assert.equal(record.wins + record.losses + record.draws, 1);
    assert.equal(record[result === "win" ? "wins" : result === "lose" ? "losses" : "draws"], 1);
    if (result === "win") {
      await page.locator(".ranking-submit button").click();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("game-shelf-ranking-tic-tac-toe-easy"))[0].score), 1);
    } else assert.equal(await page.locator(".ranking-submit").count(), 0);
    await page.getByRole("button", { name: "New game", exact: true }).click();
    assert.equal(await page.locator(".tic-cell.is-x, .tic-cell.is-o").count(), 0);
    await context.close(); console.log(`三目ならべ: ${result}の完走・思考中と終了後の日英往復・戦績1回更新・再開を確認`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
