import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const { chromium } = await import(new URL("../../random-shogi-web/node_modules/playwright/index.mjs", import.meta.url));
const base=process.env.PORTAL_TEST_URL ?? "http://127.0.0.1:4180";
const browser=await chromium.launch({channel:"msedge",headless:true});
const errors=[];
async function open(game) {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route("**/*",r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await context.addInitScript(()=>{
    if(!/^https?:$/.test(location.protocol))return;
    localStorage.setItem("game-shelf-language","ja");
    localStorage.setItem("game-shelf-sudoku-best-times",JSON.stringify({"easy-01":99}));
    localStorage.setItem("game-shelf-nonogram-record",JSON.stringify({heart5:99}));
    localStorage.setItem("game-shelf-reaction-best",JSON.stringify({milliseconds:123,recordedAt:"2026-10-05"}));
  });
  const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/?game="+game);await page.locator(".puzzle-shell").waitFor();
  return {page,context};
}
try {
  const src=await readFile(new URL("../src/games/sudoku/puzzles.ts",import.meta.url),"utf8");
  const {sudokuPuzzles}=await import("data:text/javascript;base64,"+Buffer.from(ts.transpile(src,{module:ts.ModuleKind.ESNext})).toString("base64"));
  for(const assisted of [false,true]) {
    const {page,context}=await open("sudoku");
    if(assisted)await page.getByRole("button",{name:"ヒント",exact:true}).click();
    const p=sudokuPuzzles[0];
    for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!p.puzzle[r][c]){
      await page.locator(".sudoku-cell").nth(r*9+c).click();
      await page.locator(".number-pad button").nth(p.solution[r][c]-1).click();
    }
    await page.locator(".ranking-submit").waitFor();
    const category=assisted?"assisted":"unassisted";
    await page.waitForFunction(key=>{
      const raw=localStorage.getItem("game-shelf-sudoku-best-times");
      return raw&&JSON.parse(raw)[key]>0;
    },"easy-01--"+category+"-v1");
    const data=await page.evaluate(()=>JSON.parse(localStorage.getItem("game-shelf-sudoku-best-times")));
    assert.equal(data["easy-01"],99);
    assert.ok(data["easy-01--"+category+"-v1"]>0);
    assert.equal(data["easy-01--"+(assisted?"unassisted":"assisted")+"-v1"],undefined);
    await page.locator(".ranking-submit button").click();
    assert.ok(await page.evaluate(key=>localStorage.getItem(key),"game-shelf-ranking-sudoku-easy-01--"+category+"-v1"));
    await page.locator(".language-switcher select").selectOption("en");
    assert.match(await page.locator(".assisted-record-notice > p").innerText(),assisted?/Assisted record/:/Unassisted record/);
    await context.close();
    console.log("数独: "+category+"の保存・ランキングと旧記録保持");
  }
  for(const assisted of [false,true]) {
    const {page,context}=await open("nonogram");
    if(assisted){await page.getByRole("button",{name:"答え確認",exact:true}).click();await page.getByRole("button",{name:"答え確認",exact:true}).click();}
    const rows=["01010","11111","11111","01110","00100"];
    for(let r=0;r<5;r++)for(let c=0;c<5;c++)if(rows[r][c]==="1")await page.locator('.nonogram-cell[data-row="'+r+'"][data-column="'+c+'"]').click();
    await page.locator(".ranking-submit").waitFor();
    // クリア後の答え表示では確定した区分を変えない。
    await page.getByRole("button",{name:"答え確認",exact:true}).click();
    const data=await page.evaluate(()=>JSON.parse(localStorage.getItem("game-shelf-nonogram-record")));
    const category=assisted?"assisted":"unassisted";
    assert.equal(data.heart5,99);
    assert.ok(data["heart5--"+category+"-v1"]>0);
    await page.locator(".ranking-submit button").click();
    assert.ok(await page.evaluate(key=>localStorage.getItem(key),"game-shelf-ranking-nonogram-heart5--"+category+"-v1"));
    await context.close();console.log("イラストロジック: "+category+"の区分とクリア後の固定");
  }
  const games=["aimTrainer","blackjack","breakout","colorJudge","connectFour","floodFill","hanoi","hitBlow","mazeEscape","mentalMath","nim","nonogram","oneToFifty","pegSolitaire","poker","pong","reaction","reversi","sameGame","simonSays","snake","solitaire","ticTacToe","typing","waterSort","whackMole","wordGuess","yachtDice"];
  for(const game of games){
    const {page,context}=await open(game);
    const button=await page.getByRole("button",{name:/^(ベスト削除|記録リセット|戦績リセット|記録削除)$/}).first().elementHandle();
    assert.ok(button,game);
    const before=await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort()));
    let count=0;
    page.once("dialog",async d=>{count++;assert.match(d.message(),/初期化/);await d.dismiss();});
    await button.click();
    assert.equal(count,1,game);
    assert.equal(await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort())),before,game);
    await page.locator(".language-switcher select").selectOption("en");
    page.once("dialog",async d=>{count++;assert.match(d.message(),/Reset this game's saved records/);await d.accept();});
    await button.click();
    assert.equal(count,2,game);
    assert.ok(await page.locator(".puzzle-shell").isVisible());
    if(game==="reaction")assert.equal(await page.evaluate(()=>localStorage.getItem("game-shelf-reaction-best")),null);
    await context.close();
  }
  console.log("28ゲーム: 日本語でキャンセル・英語で確定を確認");
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
