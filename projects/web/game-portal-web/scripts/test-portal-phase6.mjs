import assert from "node:assert/strict";
const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
try {
  for (const game of ["ticTacToe", "connectFour", "nim", "blackjack", "wordGuess"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("**/*", r => new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort());
    await context.addInitScript(() => {
      Math.random = () => 0.99;
      if (/^https?:$/.test(location.protocol)) localStorage.setItem("game-shelf-language", "ja");
    });
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(base + "/?game=" + game);
    await page.locator(".puzzle-shell").waitFor();
    if (game === "ticTacToe") {
      await page.locator(".tic-difficulty button").first().click();
      for (const index of [0, 1, 2]) { await page.locator(".tic-cell").nth(index).click(); await page.waitForTimeout(600); }
    } else if (game === "connectFour") {
      await page.locator(".connect-difficulty button").first().click();
      for (let i = 0; i < 4; i++) { await page.locator(".connect-drop-row button").first().click(); await page.waitForTimeout(600); }
    } else if (game === "nim") {
      await page.locator(".nim-difficulty button").first().click();
      for (let turn = 0; turn < 30 && !await page.locator(".ranking-submit").count(); turn++) {
        const piles = await page.locator(".nim-stones").evaluateAll(nodes => nodes.map(n => n.children.length));
        const xor = piles.reduce((a, b) => a ^ b, 0);
        let index = piles.findIndex(n => (n ^ xor) < n);
        if (index < 0) index = piles.findIndex(n => n > 0);
        if (index < 0) break;
        const take = xor ? piles[index] - (piles[index] ^ xor) : 1;
        await page.locator(".nim-take-row").nth(index).locator("button").nth(take - 1).click();
        await page.waitForTimeout(650);
      }
    } else if (game === "blackjack") {
      await page.locator(".control-row .primary-button").click();
      if (!await page.locator(".ranking-submit").count()) await page.getByRole("button", { name: "スタンド", exact: true }).click();
    } else {
      await page.evaluate(() => { Math.random = () => 0; });
      await page.locator(".control-row .primary-button").click();
      await page.keyboard.type("about"); await page.keyboard.press("Enter");
    }
    await page.locator(".ranking-submit").waitFor();
    const before = await page.locator(".ranking-submit p").innerText();
    const expectedScore = Number((await page.locator(".ranking-submit strong").innerText()).match(/\d+/)[0]);
    const reset = page.getByRole("button", { name: /^(戦績リセット|記録リセット)$/ });
    page.once("dialog", d => d.dismiss()); await reset.click();
    assert.equal(await page.locator(".ranking-submit p").innerText(), before);
    page.once("dialog", d => d.accept()); await reset.click();
    assert.equal(await page.locator(".ranking-submit p").innerText(), before, game + "の今回の記録を保持");
    await page.locator(".language-switcher select").selectOption("en");
    await page.locator(".language-switcher select").selectOption("ja");
    assert.equal(await page.locator(".ranking-submit p").innerText(), before);
    await page.locator(".ranking-submit button").click();
    const saved = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("game-shelf-ranking-")).flatMap(key => JSON.parse(localStorage.getItem(key))));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].score, expectedScore, game + "の保存スコアも終了時の値");
    assert.equal(await page.locator(".ranking-submit button").isDisabled(), true);
    await page.locator(".control-row .primary-button").click();
    assert.equal(await page.locator(".ranking-submit").count(), 0, game + "の次ゲームで結果解除");
    await context.close();
    console.log(game + ": 終了・削除取消/確定・言語切替・登録・再開を確認");
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
