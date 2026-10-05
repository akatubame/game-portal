import assert from "node:assert/strict";

const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const origin = new URL(base).origin;
const japanese = /[ぁ-んァ-ヶ一-龯]/;
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];

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
  await checkLanguage(page, game === "typing");
  return { page, context };
}

async function checkLanguage(page, allowJapanesePhrase = false) {
  const shell = page.locator(".puzzle-shell");
  const englishMessage = await shell.locator(".lead").innerText();
  const values = await shell.locator(".score-panel strong").allInnerTexts();
  const phrase = allowJapanesePhrase ? await shell.locator(".typing-japanese").innerText() : "";
  assert.doesNotMatch((await shell.innerText()).replace(phrase, ""), japanese);
  const attributes = await shell.locator("[aria-label], [title], [placeholder]").evaluateAll(nodes =>
    nodes.map(node => ["aria-label", "title", "placeholder"].map(key => node.getAttribute(key) ?? "").join(" ")).join("\n"));
  assert.doesNotMatch(attributes, japanese);
  await page.locator(".language-switcher select").selectOption("ja");
  assert.match(await shell.locator(".lead").innerText(), japanese);
  await page.locator(".language-switcher select").selectOption("en");
  assert.equal(await shell.locator(".lead").innerText(), englishMessage);
  assert.deepEqual(await shell.locator(".score-panel strong").allInnerTexts(), values);
}

try {
  {
    const { page, context } = await open("2048");
    await page.locator(".board-2048").click();
    await page.keyboard.press("ArrowLeft");
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("slide15");
    await page.locator(".slide15-tile.is-movable").first().click();
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "1");
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("hitBlow");
    await page.locator(".hitblow-options button").first().click();
    for (const digit of "9876") await page.locator(".hitblow-keypad button").filter({ hasText: new RegExp(`^${digit}$`) }).click();
    await page.locator(".hitblow-actions .primary-button").click();
    assert.match(await page.locator(".lead").innerText(), /Correct!.*1 try/);
    await page.locator(".ranking-submit").waitFor();
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("floodFill");
    await page.locator(".flood-options button").first().click();
    await page.locator(".flood-palette button:not([disabled])").first().click();
    assert.match(await page.locator(".lead").innerText(), /moves left|Cleared the board/);
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("sameGame");
    await page.locator(".same-options button").first().click();
    await page.locator("button.same-cell").first().click();
    assert.match(await page.locator(".lead").innerText(), /Board clear bonus/);
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "4469");
    await page.locator(".ranking-submit").waitFor();
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("pegSolitaire");
    await page.locator(".control-row .primary-button").click();
    await page.locator(".peg-cell").nth(22).click();
    await page.locator(".peg-cell").nth(24).click();
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "31");
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("hanoi");
    await page.locator(".hanoi-options button").first().click();
    for (const [from, to] of [[0, 2], [0, 1], [2, 1], [0, 2], [1, 0], [1, 2], [0, 2]]) {
      await page.locator(".hanoi-peg").nth(from).click();
      await page.locator(".hanoi-peg").nth(to).click();
    }
    assert.match(await page.locator(".lead").innerText(), /Solved in 7 moves/);
    await page.locator(".ranking-submit").waitFor();
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("waterSort");
    await page.locator(".watersort-bottle").nth(3).click();
    assert.match(await page.locator(".lead").innerText(), /empty bottle/);
    await page.locator(".watersort-bottle").first().click();
    await page.locator(".watersort-bottle").nth(3).click();
    assert.equal(await page.locator(".score-panel strong").nth(1).innerText(), "1");
    await page.locator(".control-row .ghost-button").first().click();
    assert.match(await page.locator(".lead").innerText(), /Undid one move/);
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("lightsOut");
    await page.locator(".light-cell").first().click();
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "1");
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("minesweeper");
    await page.locator(".mine-cell").first().click();
    await page.getByRole("button", { name: "Flag Mode" }).click();
    await page.locator(".mine-cell:not(.is-revealed)").first().click();
    await checkLanguage(page);
    await context.close();
  }
  {
    const { page, context } = await open("typing");
    await page.locator(".typing-start-button").click();
    const reading = await page.locator(".typing-reading").innerText();
    await page.locator(".typing-input").fill(reading);
    assert.ok(Number(await page.locator(".score-panel strong").first().innerText()) > 0);
    await checkLanguage(page, true);
    await context.close();
  }
  {
    const { page, context } = await open("simonSays");
    await page.locator(".control-row .primary-button").click();
    await checkLanguage(page);
    await page.clock.runFor(1800);
    await page.locator(".simon-pad.is-blue").click();
    assert.equal(await page.locator(".score-panel strong").first().innerText(), "2");
    await checkLanguage(page);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log("第11段階: 12ゲームの操作・結果・日英往復・盤面数値維持を確認");
} finally {
  await browser.close();
}
