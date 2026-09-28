import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const base = process.env.PORTAL_URL || 'http://127.0.0.1:4175'
const seeds = JSON.parse(await readFile(new URL('../src/game/androidPositions.json', import.meta.url), 'utf8'))
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addInitScript(() => localStorage.setItem('game-shelf-language', 'en'))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  let navigations = 0
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations++ })
  await page.goto(base + '/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  assert.equal(navigations, 1, '初回SW導入時に自動リロードしないこと')
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')))
  await page.getByRole('button', { name: 'Update and reload', exact: true }).waitFor()
  assert.equal(navigations, 1, '他タブ由来のSW変更でも対局を強制リロードしないこと')
  await page.getByRole('button', { name: 'Update and reload', exact: true }).click()
  await page.waitForLoadState('load')
  await page.goto(base + '/games/random-shogi/')
  assert.equal(await page.evaluate(() => crossOriginIsolated), true, 'WASMの分離ヘッダー')
  const engineResult = await page.evaluate((sfen) => new Promise((resolve) => {
    const worker = new Worker(new URL('fairy-stockfish-engine.worker.js', location.href))
    const done = (value) => { clearTimeout(timer); worker.terminate(); resolve(value) }
    const timer = setTimeout(() => done({ error: 'WASM応答時間超過' }), 25000)
    worker.onerror = (event) => done({ error: event.message })
    worker.onmessage = (event) => { if (event.data.requestId === 999) done(event.data) }
    worker.postMessage({ sfen, requestId: 999 })
  }), seeds[0].sfen)
  assert.ok(engineResult.bestmove, JSON.stringify(engineResult))
  await context.setOffline(true)
  await page.goto(base + '/games/yonmai-mahjong/')
  await page.getByRole('button', { name: 'Start game', exact: true }).click()
  await page.locator('.game-header').waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('.tile img')].every((img) => img.complete && img.naturalWidth > 0))
  await page.goto(base + '/games/random-shogi/')
  await page.getByRole('button', { name: 'Start game', exact: true }).click()
  await page.locator('.board').waitFor()
  assert.deepEqual(errors, [])
  console.log('本番内包URL：WASM実応答・初回導入・更新確認・明示再読み込み・両ゲームのオフライン起動 OK')
  await context.close()
} finally { await browser.close() }
