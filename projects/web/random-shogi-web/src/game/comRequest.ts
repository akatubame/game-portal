import { allLegalMoves } from './rules'
import { moveToFairyNotation, positionToSfen } from './sfen'
import type { Difficulty, Move, Position } from './types'

type EngineWorker = Pick<Worker, 'onmessage' | 'onerror' | 'postMessage' | 'terminate'>
let sequence = 0

// 一つの局面の要求を所有する。中断後の応答や旧要求の応答は反映しない。
export function requestCom(options: {
  position: Position
  difficulty: Difficulty
  primary: () => EngineWorker
  fallback: () => EngineWorker
  discardPrimary: (worker: EngineWorker) => void
  complete: (move: Move | null) => void
}) {
  const requestId = ++sequence
  const legal = allLegalMoves(options.position)
  let stage: 'primary' | 'fallback' | 'done' = 'primary'
  let worker: EngineWorker | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const stop = (discard: boolean) => {
    clearTimeout(timer)
    if (!worker) return
    worker.onmessage = null
    worker.onerror = null
    if (discard) {
      worker.terminate()
      if (stage === 'primary') options.discardPrimary(worker)
    }
    worker = null
  }
  const complete = (move: Move | null) => {
    if (stage === 'done') return
    stop(stage === 'fallback')
    stage = 'done'
    options.complete(move)
  }
  const emergency = () => complete(legal[0] ?? null)
  const fallback = () => {
    if (stage !== 'primary') return
    stop(true)
    stage = 'fallback'
    try {
      worker = options.fallback()
      worker.onmessage = (event) => {
        if (stage !== 'fallback') return
        const proposed = event.data as Move | null
        const move = proposed && legal.find((candidate) =>
          candidate.kind === proposed.kind && Boolean(candidate.promote) === Boolean(proposed.promote) &&
          String(candidate.from) === String(proposed.from) && String(candidate.to) === String(proposed.to))
        // エンジン障害や不正な投了応答を、プレイヤーの勝利に変換しない。
        complete(move || legal[0] || null)
      }
      worker.onerror = () => { if (stage === 'fallback') emergency() }
      timer = setTimeout(() => { if (stage === 'fallback') emergency() }, 6000)
      worker.postMessage({ position: options.position, difficulty: options.difficulty })
    } catch { emergency() }
  }
  if (options.difficulty === 'easy') fallback()
  else {
    try {
      worker = options.primary()
      worker.onmessage = (event) => {
        if (stage !== 'primary' || event.data.requestId !== requestId || event.data.ready) return
        const notation = typeof event.data.bestmove === 'string' ? event.data.bestmove.toLowerCase() : ''
        const move = legal.find((candidate) => moveToFairyNotation(candidate, options.position.turn).toLowerCase() === notation)
        if (event.data.error || !move) fallback()
        else complete(move)
      }
      worker.onerror = () => { if (stage === 'primary') fallback() }
      // WASM初期化自体が停止した場合も上限を設ける。
      timer = setTimeout(fallback, 15000)
      worker.postMessage({ sfen: positionToSfen(options.position), requestId, thinkingTimeMs: options.difficulty === 'normal' ? 600 : 2000 })
    } catch { fallback() }
  }
  return () => {
    if (stage === 'done') return
    stop(true)
    stage = 'done'
  }
}
