import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// OSにインストール済みのEdgeを使う。個人のプロファイルは開かない。
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true })
const base = process.env.SHOGI_URL || 'http://127.0.0.1:4174/'
const errors = []
try {
  for (const language of ['ja', 'en']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await context.addInitScript((language) => localStorage.setItem('game-shelf-language', language), language)
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    const label = (ja, en) => language === 'ja' ? ja : en
    const session = () => page.evaluate(() => JSON.parse(localStorage.getItem('random-shogi-session-v1')))
    await page.goto(base)
    await page.getByRole('button', { name: label('プレイ開始', 'Start game'), exact: true }).click()
    await page.locator('.board').waitFor()
    await page.waitForFunction(() => localStorage.getItem('random-shogi-session-v1'))
    const initial = await session()
    let moved = false
    const pieces = page.locator('.square').filter({ has: page.locator('.piece:not(.opponent)') })
    for (let i = 0; i < await pieces.count(); i++) {
      await pieces.nth(i).click()
      if (await page.locator('.square.target').count()) {
        page.once('dialog', (dialog) => dialog.dismiss())
        await page.locator('.square.target').first().click()
        moved = true
        break
      }
    }
    assert.ok(moved, '合法手をクリックできること')
    await page.waitForFunction((n) => JSON.parse(localStorage.getItem('random-shogi-session-v1')).position.moveNumber >= n + 2, initial.position.moveNumber)
    await page.getByRole('button', { name: label('待った', 'Undo'), exact: true }).click()
    await page.waitForFunction((n) => JSON.parse(localStorage.getItem('random-shogi-session-v1')).position.moveNumber === n, initial.position.moveNumber)
    await page.reload()
    await page.getByRole('button', { name: label('対局再開', 'Resume game'), exact: true }).click()
    assert.equal((await session()).id, initial.id)
    await page.getByRole('button', { name: label('投了', 'Resign'), exact: true }).click()
    await page.getByRole('button', { name: label('確認', 'OK'), exact: true }).click()
    assert.ok((await page.locator('.result-banner').innerText()).includes(label('負け', 'lose')))
    await page.getByRole('button', { name: label('ホーム', 'Home'), exact: true }).click()
    await page.getByRole('button', { name: label('対局履歴', 'Game history'), exact: true }).click()
    assert.equal(await page.locator('.history-item').count(), 1)
    await page.getByLabel(label('結果', 'Result'), { exact: true }).selectOption('win')
    assert.equal(await page.locator('.history-item').count(), 0)
    await page.getByLabel(label('結果', 'Result'), { exact: true }).selectOption('loss')
    await page.getByRole('button', { name: label('先後を入れ替えて再挑戦', 'Retry as the other side'), exact: true }).click()
    await page.waitForFunction((side) => JSON.parse(localStorage.getItem('random-shogi-session-v1')).game.playerSide !== side, initial.game.playerSide)
    await page.waitForFunction((n) => JSON.parse(localStorage.getItem('random-shogi-session-v1')).position.moveNumber > n, initial.position.moveNumber)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '390px幅で横スクロールしないこと')
    await page.screenshot({ path: join(tmpdir(), `game-shelf-shogi-${language}.png`), fullPage: true })
    console.log(`将棋 ${language}：指し手・COM応答・待った・再読込復元・投了・履歴・フィルタ・先後入替・スマホ幅 OK`)
    await context.close()
  }
  for (const language of ['ja', 'en']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await context.addInitScript((language) => localStorage.setItem('game-shelf-language', language), language)
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    const label = (ja, en) => language === 'ja' ? ja : en
    await page.goto(process.env.MAHJONG_URL || 'http://127.0.0.1:4173/')
    await page.getByRole('button', { name: label('対局開始', 'Start game'), exact: true }).click()
    await page.locator('.game-header').waitFor()
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('.tile img')].every((img) => img.complete && img.naturalWidth > 0)), '牌画像の読込')
    await page.screenshot({ path: join(tmpdir(), `game-shelf-mahjong-${language}.png`), fullPage: true })
    let finished = false
    for (let i = 0; i < 100; i++) {
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('yonmai.snapshot.v2')))
      if (saved.game.phase === 'roundResult') { finished = true; break }
      if (await page.locator('.actions .win').count()) await page.locator('.actions .win').click()
      else if (await page.locator('.actions .ron').count()) await page.locator('.actions .ron').click()
      else await page.locator('.hand-tiles .tile:not([disabled])').first().click()
      // 人間の連続タップ防止時間を超える間隔でプレイする。
      await page.waitForTimeout(180)
    }
    assert.ok(finished, '実際の操作で局が終了すること')
    const result = await page.locator('.modal').innerText()
    if (language === 'en') assert.ok(!/[一-龯ぁ-んァ-ヶ]/.test(result.replace(/[萬筒索東南西北白發中]/g, '')), result)
    await page.reload()
    await page.locator('.modal').waitFor()
    assert.equal(await page.locator('.modal').innerText(), result, '結果画面の再読込復元')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '麻雀390px幅で横スクロールしないこと')
    console.log(`麻雀 ${language}：牌画像・打牌・局終了・結果翻訳・結果復元・スマホ幅 OK`)
    await context.close()
  }
  assert.deepEqual(errors, [], 'ブラウザ実行時エラーがないこと')
  console.log(`画面確認用PNG：${tmpdir()}/game-shelf-{shogi,mahjong}-{ja,en}.png`)
} finally { await browser.close() }
