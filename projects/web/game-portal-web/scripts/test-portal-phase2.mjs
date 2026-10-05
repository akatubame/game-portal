import assert from "node:assert/strict";
const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
async function open(game) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", r => new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort());
  await context.addInitScript(() => {
    if (!/^https?:$/.test(location.protocol)) return;
    localStorage.setItem("game-shelf-language", "ja");
    Math.random = () => 0;
  });
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(base + "/?game=" + game);
  await page.locator(".puzzle-shell").waitFor();
  return { page, context };
}
try {
  {
    const { page, context } = await open("2048");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "4");
    await page.evaluate(() => { const input = document.createElement("input"); input.id = "keyboard-test"; document.body.append(input); input.focus(); });
    const board = await page.locator(".puzzle-shell").innerText();
    await page.locator("#keyboard-test").pressSequentially("wasd");
    assert.equal(await page.locator("#keyboard-test").inputValue(), "wasd");
    assert.equal(await page.locator(".puzzle-shell").innerText(), board);
    await context.close();
    console.log("2048: StrictModeでも2+2が4点、入力欄のWASDはゲームに伝わらない");
  }
  {
    const { page, context } = await open("ticTacToe");
    await page.evaluate(() => { Math.random = () => 0.99; });
    await page.locator(".tic-difficulty button").first().click();
    for (const index of [0, 1, 2]) {
      await page.locator(".tic-cell").nth(index).click();
      await page.waitForTimeout(700);
    }
    await page.locator(".ranking-submit").waitFor();
    await page.locator(".ranking-submit input").fill("テスト");
    await page.locator(".ranking-submit button").click();
    await page.locator(".language-switcher select").selectOption("en");
    assert.equal(await page.locator(".ranking-submit button").isDisabled(), true);
    await page.locator(".language-switcher select").selectOption("ja");
    await page.locator(".tic-difficulty button").last().click();
    assert.equal(await page.locator(".ranking-submit").count(), 0);
    assert.equal(await page.locator(".tic-cell.is-x").count(), 0);
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".ranking-list li").count(), 0);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("game-shelf-tic-tac-toe-record")).streak), 0);
    await context.close();
    console.log("三目ならべ: 勝利登録後の難易度変更で結果・ランキングを混在させない");
  }
  {
    const { page, context } = await open("reaction");
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.getByRole("button", { name: "スタート", exact: true }).click();
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "記録リセット", exact: true }).click();
    await page.clock.fastForward(5000);
    assert.ok(await page.locator(".reaction-target.is-idle").count());
    assert.equal(await page.locator(".ranking-submit").count(), 0);
    await context.close();
    console.log("反射神経: 待機中に記録リセットしても後から開始されない");
  }
  {
    const { page, context } = await open("nonogram");
    const cell = page.locator(".nonogram-cell.is-unknown").first();
    const row = await cell.getAttribute("data-row"), col = await cell.getAttribute("data-column");
    const target = page.locator('.nonogram-cell[data-row="' + row + '"][data-column="' + col + '"]');
    await target.focus();
    await page.keyboard.press("Enter");
    assert.equal(await target.getAttribute("aria-pressed"), "true");
    await page.keyboard.press("Space");
    assert.equal(await target.getAttribute("aria-pressed"), "false");
    await context.close();
    console.log("イラストロジック: Enter/Spaceで塗り・解除できる");
  }
  {
    const { page, context } = await open("simonSays");
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.locator(".control-row .primary-button").click();
    for (let level = 1; level <= 12; level++) {
      await page.clock.fastForward(20000);
      for (let i = 0; i < level; i++) await page.locator(".simon-pad.is-green").click();
    }
    assert.equal(await page.locator(".simon-score strong").nth(2).innerText(), "120");
    assert.match(await page.locator(".ranking-submit strong").innerText(), /120/);
    const best = await page.evaluate(() => JSON.parse(localStorage.getItem("game-shelf-simon-says-best")));
    assert.equal(best.score, 120);
    await context.close();
    console.log("Simon Says: 12ラウンド完走時の画面・保存・ランキングは120点");
  }
  for (const [game, duration] of [["aimTrainer", 30], ["typing", 60], ["mentalMath", 60], ["colorJudge", 30], ["whackMole", 30]]) {
    const { page, context } = await open(game);
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.locator(".control-row .primary-button").click();
    // 間隔タイマーを1回しか実行せず、実時間だけ大きく進める。
    await page.clock.fastForward(3000);
    await page.locator(".control-row .primary-button").click();
    await page.clock.fastForward((duration - 1) * 1000);
    assert.equal(await page.locator(".ranking-submit").count(), 0);
    await page.clock.fastForward(2000);
    await page.locator(".ranking-submit").waitFor();
    assert.match(await page.locator(".ranking-submit strong").innerText(), /0/);
    await context.close();
    console.log(game + ": バックグラウンド相当の時間経過で終了");
  }
  assert.deepEqual(errors, []);
  console.log("第2段階のブラウザ回帰テスト成功");
} finally {
  await browser.close();
}
