import assert from "node:assert/strict";
const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const base = process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
try {
  for (const mode of ["time", "moves"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("**/*", route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    await context.addInitScript(mode => {
      if (!/^https?:$/.test(location.protocol)) return;
      localStorage.setItem("game-shelf-language", "ja");
      const record = { size: 9, moves: mode === "time" ? 1 : 9999, seconds: 100, recordedAt: "2026-10-05" };
      localStorage.setItem("game-shelf-maze-escape-best", JSON.stringify({ 9: record }));
      if (mode === "moves") localStorage.setItem("game-shelf-maze-escape-time-best", JSON.stringify({ 9: { ...record, seconds: 0 } }));
    }, mode);
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install();
    await page.goto(base + "/?game=mazeEscape");
    await page.locator(".maze-shell").waitFor();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.locator(".maze-options button").first().click();
    const path = await page.locator(".maze-cell").evaluateAll(cells => {
      const size = Math.sqrt(cells.length);
      const queue = [[0, []]];
      const visited = new Set([0]);
      for (let q = 0; q < queue.length; q++) {
        const [index, route] = queue[q];
        if (index === cells.length - 1) return route;
        for (const [border, delta, key] of [["borderTopWidth", -size, "ArrowUp"], ["borderRightWidth", 1, "ArrowRight"], ["borderBottomWidth", size, "ArrowDown"], ["borderLeftWidth", -1, "ArrowLeft"]]) {
          const next = index + delta;
          if (cells[index].style[border] === "0px" && !visited.has(next)) {
            visited.add(next); queue.push([next, [...route, key]]);
          }
        }
      }
      throw Error("ゴールへの経路がありません");
    });
    await page.clock.fastForward(12000);
    for (const key of path) await page.keyboard.press(key);
    await page.locator(".ranking-submit").waitFor();
    const records = await page.evaluate(() => ["best", "time-best"].map(suffix => JSON.parse(localStorage.getItem("game-shelf-maze-escape-" + suffix))[9]));
    if (mode === "time") { assert.equal(records[0].moves, 1); assert.equal(records[1].seconds, 12); }
    else { assert.equal(records[0].moves, path.length); assert.equal(records[1].seconds, 0); }
    const before = await page.locator(".lead").innerText();
    page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("button", { name: "ベスト削除", exact: true }).click();
    assert.equal(await page.locator(".lead").innerText(), before);
    await page.locator(".language-switcher select").selectOption("en");
    assert.match(await page.locator(".lead").innerText(), /Escaped!/);
    assert.doesNotMatch(await page.locator(".maze-shell").innerText(), /[ぁ-んァ-ヶ一-龯]/);
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Reset best records", exact: true }).click();
    assert.match(await page.locator('[data-maze-best="time"]').innerText(), /No record yet/);
    assert.match(await page.locator('[data-maze-best="moves"]').innerText(), /No record yet/);
    assert.match(await page.locator(".lead").innerText(), new RegExp(path.length + " moves / 0:12"));
    await page.clock.fastForward(30000);
    assert.equal(await page.locator(".maze-score > div").nth(1).locator("strong").innerText(), "0:12");
    await page.locator(".ranking-submit button").click();
    const ranking = await page.evaluate(() => JSON.parse(localStorage.getItem("game-shelf-ranking-maze-escape-9")));
    assert.equal(ranking[0].score, 12);
    await page.getByRole("button", { name: "New game", exact: true }).click();
    assert.equal(await page.locator(".ranking-submit").count(), 0);
    await context.close();
    console.log(`迷路: ${mode}の独立更新・日英表示・削除後の結果保持・ランキングを確認`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
