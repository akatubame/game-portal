import assert from "node:assert/strict";
const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const errors = [];
async function open(game) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", r => new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort());
  await context.addInitScript(() => {
    if (!/^https?:$/.test(location.protocol)) return;
    localStorage.setItem("game-shelf-language", "en");
    Math.random = () => 0.99;
    localStorage.setItem("game-shelf-poker-record", JSON.stringify({ plays: 3, bestHand: "フルハウス", bestScore: 600 }));
  });
  const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.goto(base + "/?game=" + game); await page.locator(".puzzle-shell").waitFor();
  return { page, context };
}
async function checkLanguage(page) {
  const before = await page.locator(".lead").innerText();
  assert.doesNotMatch(await page.locator(".puzzle-shell").innerText(), /[ぁ-んァ-ヶ一-龯]/);
  await page.locator(".language-switcher select").selectOption("ja");
  assert.match(await page.locator(".lead").innerText(), /[ぁ-んァ-ヶ一-龯]/);
  await page.locator(".language-switcher select").selectOption("en");
  assert.equal(await page.locator(".lead").innerText(), before);
}
try {
  {
    const { page, context } = await open("poker");
    await checkLanguage(page);
    assert.match(await page.locator(".poker-record").innerText(), /Full House/);
    await page.getByRole("button", { name: "Deal", exact: true }).click();
    for (const index of [0, 1]) await page.locator(".poker-card").nth(index).click();
    assert.equal(await page.locator('.poker-card[aria-pressed="true"]').count(), 2);
    assert.match(await page.locator(".poker-result").innerText(), /2 selected/);
    await checkLanguage(page);
    await page.locator(".poker-card").first().click();
    assert.match(await page.locator(".poker-result").innerText(), /1 selected/);
    await page.getByRole("button", { name: "Exchange selected cards", exact: true }).click();
    await checkLanguage(page);
    assert.match(await page.locator(".lead").innerText(), /1 card exchanged/);
    assert.equal(await page.locator(".poker-card:disabled").count(), 5);
    await page.getByRole("button", { name: "Deal", exact: true }).click();
    await page.getByRole("button", { name: "Exchange selected cards", exact: true }).click();
    await checkLanguage(page);
    assert.match(await page.locator(".lead").innerText(), /0 cards exchanged.*Straight Flush/);
    await page.locator(".ranking-submit button").click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("game-shelf-ranking-poker-hand-score"))[0].score), 800);
    await context.close(); console.log("ポーカー: 交換枚数・選択解除・交換なし・役表示・旧最高役・ランキングを確認");
  }
  {
    const { page, context } = await open("yachtDice");
    await page.evaluate(() => { Math.random = () => 0; });
    await checkLanguage(page);
    await page.getByRole("button", { name: "New game", exact: true }).click();
    await checkLanguage(page);
    const labels = await page.locator(".yacht-sheet button strong").allTextContents();
    for (let i = 0; i < 13; i++) {
      await page.getByRole("button", { name: "Roll", exact: true }).click();
      if (i === 0) {
        await page.locator(".yacht-dice-row button").first().click();
        await page.getByRole("button", { name: "Roll", exact: true }).click();
        assert.equal(await page.locator(".yacht-dice-row button.is-held").count(), 1);
        await page.getByRole("button", { name: "Roll", exact: true }).click();
        assert.equal(await page.getByRole("button", { name: "Roll", exact: true }).isDisabled(), true);
        await checkLanguage(page);
      }
      await page.locator(".yacht-sheet button").nth(i).click();
      await checkLanguage(page);
      if (i < 12) assert.ok((await page.locator(".lead").innerText()).includes(labels[i]));
    }
    assert.match(await page.locator(".lead").innerText(), /Game over! Total score: 70 points/);
    const result = await page.locator(".ranking-submit p").innerText();
    page.once("dialog", d => d.accept());
    await page.getByRole("button", { name: "Clear best", exact: true }).click();
    assert.equal(await page.locator(".ranking-submit p").innerText(), result);
    await page.locator(".ranking-submit button").click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("game-shelf-ranking-yacht-dice-score"))[0].score), 70);
    await page.getByRole("button", { name: "New game", exact: true }).click();
    assert.equal(await page.locator(".ranking-submit").count(), 0);
    await context.close(); console.log("ヨットダイス: ホールド・ロール上限・13ラウンド完走・日英役名・70点の保存・再開を確認");
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
