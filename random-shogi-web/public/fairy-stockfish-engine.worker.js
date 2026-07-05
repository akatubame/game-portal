/* global Stockfish, importScripts */

const ENGINE_ROOT = new URL('fairy-stockfish/', self.location.href).href
const THINKING_TIME_MS = 2300
let enginePromise
let taskQueue = Promise.resolve()

function waitFor(engine, command, expected) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      engine.removeMessageListener(listener)
      reject(new Error(`Engine timeout: ${expected}`))
    }, 8000)
    const listener = (line) => {
      const text = String(line)
      if (!text.startsWith(expected)) return
      clearTimeout(timeout)
      engine.removeMessageListener(listener)
      resolve(text)
    }
    engine.addMessageListener(listener)
    engine.postMessage(command)
  })
}

async function createEngine() {
  importScripts(`${ENGINE_ROOT}stockfish.js`)
  const engine = await Stockfish({
    locateFile: (name) => `${ENGINE_ROOT}${name}`,
    mainScriptUrlOrBlob: `${ENGINE_ROOT}stockfish.js`,
  })
  await waitFor(engine, 'uci', 'uciok')
  engine.postMessage('setoption name UCI_Variant value shogi')
  engine.postMessage('setoption name Skill Level value 20')
  engine.postMessage('setoption name Hash value 48')
  const threads = Math.min(2, Math.max(1, self.navigator.hardwareConcurrency || 1))
  engine.postMessage(`setoption name Threads value ${threads}`)
  await waitFor(engine, 'isready', 'readyok')
  return engine
}

function getEngine() {
  if (!enginePromise) enginePromise = createEngine()
  return enginePromise
}

self.onmessage = (event) => {
  taskQueue = taskQueue.then(() => handleMessage(event))
}

async function handleMessage(event) {
  try {
    const engine = await getEngine()
    if (event.data.warmup) {
      self.postMessage({ ready: true })
      return
    }
    engine.postMessage('stop')
    engine.postMessage(`position sfen ${event.data.sfen}`)
    const result = await waitFor(engine, `go movetime ${THINKING_TIME_MS}`, 'bestmove ')
    const bestmove = result.split(/\s+/)[1]
    self.postMessage({ bestmove })
  } catch (error) {
    enginePromise = undefined
    self.postMessage({ error: error instanceof Error ? error.message : String(error) })
  }
}
