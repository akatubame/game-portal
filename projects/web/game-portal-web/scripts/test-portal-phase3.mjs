import assert from "node:assert/strict";
const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const browser = await chromium.launch({channel:"msedge",headless:true});
const errors = [];
async function open(game) {
  const context = await browser.newContext({viewport:{width:390,height:844}});
  await context.route("**/*", r => new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort());
  await context.addInitScript(() => {if (/^https?:$/.test(location.protocol)) localStorage.setItem("game-shelf-language","ja");});
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.clock.install();
  await page.goto(base+"/?game="+game);
  await page.locator(".puzzle-shell").waitFor();
  await page.clock.pauseAt(new Date(Date.now()+1000));
  return {page,context};
}
try {
  for (const game of ["memory","slide15","lightsOut","hanoi","sudoku","minesweeper","mazeEscape","hitBlow"]) {
    const {page,context} = await open(game);
    if (game==="memory") await page.locator(".memory-card").first().click();
    else if (game==="slide15") await page.locator(".slide15-tile.is-movable").first().click();
    else if (game==="lightsOut") await page.locator(".lights-out-board button").first().click();
    else if (game==="sudoku") {
      await page.locator(".sudoku-cell:not(.is-given)").first().click();
      await page.locator(".number-pad button").first().click();
    } else if (game==="minesweeper") await page.locator(".minesweeper-board button").nth(40).click();
    else await page.locator(".control-row .primary-button").click();
    await page.clock.fastForward(31250);
    if (game === "lightsOut") {
      assert.match(await page.locator(".lights-out-progress").innerText(), /0:31/);
    } else {
      const time = page.locator(".score-panel > div").filter({has:page.locator("span", {hasText:/^(Time|時間)$/})}).locator("strong");
      assert.equal(await time.innerText(),game==="minesweeper"?"031":"0:31",game);
    }
    await context.close();
    console.log(game+": 通知遅延31秒を反映");
  }
  const {page,context} = await open("memory");
  const symbols = await page.locator(".memory-card-front").allTextContents();
  const pairs = [...new Set(symbols)].map(symbol=>symbols.map((s,i)=>s===symbol?i:-1).filter(i=>i>=0));
  for(const [a,b] of pairs) {
    await page.locator(".memory-card").nth(a).click();
    await page.locator(".memory-card").nth(b).click();
    await page.clock.runFor(750);
  }
  const finished = await page.locator(".score-panel strong").nth(1).innerText();
  assert.equal(await page.locator(".ranking-submit strong").innerText(),finished);
  await page.clock.fastForward(10000);
  assert.equal(await page.locator(".score-panel strong").nth(1).innerText(),finished);
  await page.locator(".ranking-submit input").fill("クリア");
  await page.locator(".ranking-submit button").click();
  await page.locator(".language-switcher select").selectOption("en");
  assert.equal(await page.locator(".lead").innerText(), "Cleared! You found every pair.");
  assert.equal(await page.locator(".rule-card h2").innerText(), "How to Play");
  await page.locator(".language-switcher select").selectOption("ja");
  assert.match(await page.locator(".lead").innerText(), /クリア！/);
  await page.locator(".language-switcher select").selectOption("en");
  assert.equal(await page.locator(".ranking-list strong").innerText(),"クリア");
  assert.equal(await page.locator(".ranking-card h2").innerText(),"Ranking");
  await page.locator(".ranking-clear").click();
  assert.equal(await page.locator(".ranking-list li").count(),1);
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  assert.equal(await page.locator(".ranking-list li").count(),1);
  await page.locator(".ranking-clear").click();
  await page.getByRole("button",{name:"Delete",exact:true}).click();
  assert.equal(await page.locator(".ranking-list li").count(),0);
  await context.close();
  assert.deepEqual(errors,[]);
  console.log("終了記録・時間停止・ユーザー名保持・削除確認: 成功");
} finally {await browser.close();}
