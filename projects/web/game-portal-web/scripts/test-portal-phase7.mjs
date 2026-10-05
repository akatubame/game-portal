import assert from "node:assert/strict";
const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const errors = [];
async function open(game) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", r => new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort());
  await context.addInitScript(() => { if (/^https?:$/.test(location.protocol)) localStorage.setItem("game-shelf-language", "en"); });
  const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.clock.install();
  await page.goto(base + "/?game=" + game);
  await page.locator(".puzzle-shell").waitFor();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  return { page, context };
}
async function checkLanguage(page, pattern) {
  assert.match(await page.locator(".lead").innerText(), pattern);
  assert.doesNotMatch(await page.locator(".puzzle-shell").innerText(), /[ぁ-んァ-ヶ一-龯]/);
  await page.locator(".language-switcher select").selectOption("ja");
  assert.match(await page.locator(".lead").innerText(), /[ぁ-んァ-ヶ一-龯]/);
  await page.locator(".language-switcher select").selectOption("en");
  assert.match(await page.locator(".lead").innerText(), pattern);
}
try {
  {
    const { page, context } = await open("blackjack");
    await checkLanguage(page, /Deal/);
    for (const [ranks, hit, expected] of [
      [["A", "10", "K", "8"], false, /Blackjack!/],
      [["10", "10", "9", "7"], false, /You win!/],
      [["10", "10", "6", "8"], false, /Dealer wins/],
      [["10", "10", "7", "7"], false, /Push!/],
      [["10", "10", "9", "8", "5"], true, /Bust!/]
    ]) {
      await page.evaluate(ranks => {
        const deck = Array.from({ length: 52 }, (_, i) => i);
        const labels = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        const prefix = [];
        for (const rank of ranks) prefix.push(deck.find(i => labels[i % 13] === rank && !prefix.includes(i)));
        const desired = [...prefix, ...deck.filter(i => !prefix.includes(i))];
        const randoms = [];
        for (let i = 51; i > 0; i--) {
          const j = deck.indexOf(desired[i]); randoms.push((j + 0.1) / (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        Math.random = () => randoms.shift() ?? 0.5;
      }, ranks);
      await page.getByRole("button", { name: "Deal", exact: true }).click();
      if (!await page.locator(".ranking-submit").count()) {
        await checkLanguage(page, /Hit to draw/);
        await page.getByRole("button", { name: hit ? "Hit" : "Stand", exact: true }).click();
      }
      await checkLanguage(page, expected);
    }
    await context.close(); console.log("ブラックジャック: 待機・進行・5種類の終了結果の日英往復を確認");
  }
  {
    const { page, context } = await open("reaction");
    await page.evaluate(() => { Math.random = () => 0; });
    await checkLanguage(page, /Press Start/);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await checkLanguage(page, /Not yet/);
    await page.locator(".reaction-target").click();
    await checkLanguage(page, /Too soon/);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.clock.runFor(1400);
    await checkLanguage(page, /Now!/);
    await page.clock.runFor(250);
    await page.locator(".reaction-target").click();
    await checkLanguage(page, /250ms/);
    assert.match(await page.locator(".reaction-progress").innerText(), /Finished/);
    page.once("dialog", d => d.accept());
    await page.getByRole("button", { name: "Reset records", exact: true }).click();
    await checkLanguage(page, /Press Start/);
    await context.close(); console.log("反射神経: 待機・フライング・合図・測定・リセットの日英往復を確認");
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
