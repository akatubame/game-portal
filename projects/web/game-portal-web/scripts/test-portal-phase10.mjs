import assert from "node:assert/strict";
const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
const japanese = /[ぁ-んァ-ヶ一-龯]/;
async function open(game) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", r => new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort());
  await context.addInitScript(() => {
    Math.random = () => 0.99;
    if (/^https?:$/.test(location.protocol)) localStorage.setItem("game-shelf-language", "en");
  });
  const page = await context.newPage(); page.on("pageerror", e => errors.push(`${game}: ${e.message}`));
  await page.clock.install(); await page.goto(base + "/?game=" + game);
  await page.locator(".puzzle-shell[data-native-i18n]").waitFor();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await languages(page);
  return { page, context };
}
async function languages(page) {
  // 仮想時計は停止したまま、Reactの終局判定effectによる描画だけを待つ。
  await page.waitForTimeout(50);
  const message = await page.locator(".lead").innerText();
  const score = await page.locator(".score-panel").innerText();
  assert.doesNotMatch(await page.locator(".puzzle-shell").innerText(), japanese);
  const attributes = await page.locator(".puzzle-shell [aria-label], .puzzle-shell [title], .puzzle-shell [placeholder]").evaluateAll(nodes => nodes.map(n => [n.getAttribute("aria-label"), n.getAttribute("title"), n.getAttribute("placeholder")].join(" ")).join("\n"));
  assert.doesNotMatch(attributes, japanese);
  await page.locator(".language-switcher select").selectOption("ja");
  assert.match(await page.locator(".lead").innerText(), japanese);
  await page.locator(".language-switcher select").selectOption("en");
  assert.equal(await page.locator(".lead").innerText(), message);
  assert.equal(await page.locator(".score-panel").innerText(), score);
}
async function result(page, key, expected, reset = true) {
  await page.locator(".ranking-submit").waitFor();
  await languages(page);
  const before = await page.locator(".ranking-submit p").innerText();
  if (reset) {
    page.once("dialog", d => d.accept());
    await page.locator(".control-row .ghost-button").click();
    assert.equal(await page.locator(".ranking-submit p").innerText(), before);
  }
  await page.clock.fastForward(5000);
  assert.equal(await page.locator(".ranking-submit p").innerText(), before);
  await page.locator(".ranking-submit button").click();
  const entries = await page.evaluate(key => JSON.parse(localStorage.getItem("game-shelf-ranking-" + key)), key);
  assert.equal(entries[0].score, expected);
}
try {
  for (const game of ["aimTrainer", "mentalMath", "colorJudge", "whackMole"]) {
    const { page, context } = await open(game);
    await page.locator(".control-row .primary-button").click();
    await languages(page);
    if (game === "aimTrainer") {
      for (let i = 0; i < 8; i++) await page.locator(".aim-target").click();
      assert.match(await page.locator(".lead").innerText(), /8 hits in a row/); await languages(page);
      await page.locator(".aim-arena").click({ position: { x: 60, y: 80 } });
      assert.match(await page.locator(".lead").innerText(), /Miss/); await languages(page);
    } else if (game === "mentalMath") {
      const input = page.locator(".mental-math-input");
      for (let i = 0; i < 5; i++) { await input.fill("144"); await input.press("Enter"); }
      assert.match(await page.locator(".lead").innerText(), /5 in a row/); await languages(page);
      await input.fill("0"); await input.press("Enter");
      assert.match(await page.locator(".lead").innerText(), /answer was 144/); await languages(page);
    } else if (game === "colorJudge") {
      for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Different", exact: true }).click();
      assert.match(await page.locator(".lead").innerText(), /5 combo/); await languages(page);
      await page.getByRole("button", { name: "Match", exact: true }).click();
      assert.match(await page.locator(".lead").innerText(), /Incorrect/); await languages(page);
    } else {
      await page.locator(".whack-hole.is-mole").click(); await languages(page);
      for (let i = 1; i < 5; i++) { await page.clock.runFor(720); await page.locator(".whack-hole.is-mole").click(); }
      assert.match(await page.locator(".lead").innerText(), /5 combo/); await languages(page);
      await page.locator(".whack-hole.is-empty").first().click(); await languages(page);
      await page.evaluate(() => { Math.random = () => 0; }); await page.clock.runFor(720);
      await page.locator(".whack-hole.is-golden").first().click();
      assert.match(await page.locator(".lead").innerText(), /Golden mole/); await languages(page);
      await page.evaluate(() => { Math.random = () => 0.2; }); await page.clock.runFor(720);
      await page.locator(".whack-hole.is-bomb").first().click();
      assert.match(await page.locator(".lead").innerText(), /Bomb/); await languages(page);
    }
    await page.clock.fastForward(61000);
    await page.locator(".ranking-submit").waitFor();
    assert.match(await page.locator(".lead").innerText(), /Finished/);
    const score = Number(await page.locator(".score-panel strong").first().innerText());
    const keys = { aimTrainer: "aim-trainer-score", mentalMath: "mental-math-score", colorJudge: "color-judge-score", whackMole: "whack-mole-score" };
    const bestKeys = { aimTrainer: "aim-trainer-best", mentalMath: "mental-math-best", colorJudge: "color-judge-best", whackMole: "whack-mole-best" };
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem("game-shelf-" + key)).score, bestKeys[game]), score);
    await result(page, keys[game], score);
    await page.locator(".control-row .primary-button").click();
    assert.equal(await page.locator(".ranking-submit").count(), 0);
    await context.close(); console.log(`${game}: コンボ・ミス・時間切れ・日英往復・ベスト/ランキング一致・再開を確認`);
  }
  {
    const { page, context } = await open("oneToFifty");
    await page.locator(".control-row .primary-button").click();
    await page.locator(".one50-cell").filter({ hasText: /^2$/ }).click();
    assert.match(await page.locator(".lead").innerText(), /Find 1/); await languages(page);
    await page.clock.runFor(2700); assert.equal(await page.locator(".one50-cell.is-target").count(), 0);
    await page.clock.runFor(200); assert.equal(await page.locator(".one50-cell.is-target").count(), 1);
    for (let n = 1; n <= 50; n++) {
      await page.locator(".one50-cell").filter({ hasText: new RegExp(`^${n}$`) }).click();
      if (n === 25) await languages(page);
    }
    assert.match(await page.locator(".lead").innerText(), /Cleared!.*2.90.*misses: 1/);
    await result(page, "one-to-fifty-time", 2900);
    await page.locator(".control-row .primary-button").click(); assert.equal(await page.locator(".ranking-submit").count(), 0);
    await context.close(); console.log("1to50: ミス・遅延ヒント・50まで完走・2900ms保存・再開を確認");
  }
  {
    const { page, context } = await open("wordGuess");
    await page.evaluate(() => { Math.random = () => 0; });
    await page.locator(".control-row .primary-button").click();
    // 実際の入力欄にフォーカスがある場合、グローバルキー操作が文字入力を奪わないこと。
    await page.evaluate(() => { const input = document.createElement("input"); input.id = "qa-input"; document.body.append(input); });
    await page.locator("#qa-input").pressSequentially("abc");
    assert.equal(await page.locator("#qa-input").inputValue(), "abc");
    assert.equal(await page.locator(".wordguess-tile.is-filled").count(), 0);
    await page.locator(".wordguess-grid").click(); await page.keyboard.type("abc"); await page.keyboard.press("Enter");
    assert.match(await page.locator(".lead").innerText(), /all five letters/); await languages(page);
    await page.locator(".wordguess-grid").click(); await page.keyboard.type("de"); await page.keyboard.press("Enter");
    assert.match(await page.locator(".lead").innerText(), /candidate list/); await languages(page);
    await page.locator(".wordguess-grid").click();
    for (let i = 0; i < 5; i++) await page.keyboard.press("Backspace");
    await page.keyboard.type("above"); await page.keyboard.press("Enter"); await languages(page);
    await page.locator(".wordguess-grid").click(); await page.keyboard.type("about"); await page.keyboard.press("Enter");
    assert.match(await page.locator(".lead").innerText(), /Solved in 2 tries/);
    await result(page, "word-guess-attempts", 2);
    await page.locator(".control-row .primary-button").click();
    for (let i = 0; i < 6; i++) { await page.keyboard.type("above"); await page.keyboard.press("Enter"); }
    assert.match(await page.locator(".lead").innerText(), /answer was ABOUT/); await languages(page);
    assert.equal(await page.locator(".ranking-submit").count(), 0);
    await context.close(); console.log("Word Guess: 入力欄保護・短文/辞書エラー・勝利/敗北・記録・日英往復を確認");
  }
  for (const win of [true, false]) {
    const { page, context } = await open("connectFour");
    await page.locator(".connect-difficulty button").first().click();
    for (let i = 0; i < 4; i++) {
      await page.locator(".connect-drop-row button").nth(win ? 0 : i % 2).click();
      await languages(page); await page.clock.runFor(450); await languages(page);
    }
    assert.match(await page.locator(".lead").innerText(), win ? /You win/ : /CPU wins/);
    assert.match(await page.locator(".connect-record").innerText(), /Finished/);
    if (win) await result(page, "connect-four-easy", 1);
    await context.close(); console.log(`コネクトフォー: ${win ? "勝利" : "敗北"}・COM思考中の日英切替を確認`);
  }
  for (const win of [true, false]) {
    const { page, context } = await open("nim");
    await page.locator(".nim-difficulty button").nth(win ? 0 : 2).click();
    for (let turn = 0; turn < 20; turn++) {
      const piles = await page.locator(".nim-stones").evaluateAll(nodes => nodes.map(n => n.children.length));
      if (!piles.some(Boolean)) break;
      const xor = piles.reduce((a,b) => a ^ b, 0);
      let index = win ? piles.findIndex(n => (n ^ xor) < n) : piles.findIndex(n => n > 0);
      if (index < 0) index = piles.findIndex(n => n > 0);
      const take = win ? (xor ? piles[index] - (piles[index] ^ xor) : 1) : piles[index];
      await page.locator(".nim-take-row").nth(index).locator("button").nth(take - 1).click();
      await languages(page); await page.clock.runFor(550); await languages(page);
    }
    assert.match(await page.locator(".lead").innerText(), win ? /Victory/ : /CPU took the last stone/);
    if (win) await result(page, "nim-classic-easy", 1);
    await context.close(); console.log(`Nim: ${win ? "勝利" : "敗北"}・石を取った数と山番号の日英表示を確認`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
