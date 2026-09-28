import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestCom } from './comRequest'
import { allLegalMoves } from './rules'
import { moveToFairyNotation } from './sfen'
import type { Position } from './types'

class FakeWorker {
  onmessage: Worker['onmessage'] = null
  onerror: Worker['onerror'] = null
  postMessage = vi.fn()
  terminate = vi.fn()
  emit(data: unknown) { this.onmessage?.call(this as unknown as Worker, { data } as MessageEvent) }
}
const position: Position = {
  board: Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) =>
    r === 0 && c === 0 ? { owner: 'gote', kind: 'K', promoted: false } :
    r === 8 && c === 8 ? { owner: 'sente', kind: 'K', promoted: false } : null)),
  hands: { sente: {}, gote: {} }, turn: 'gote', moveNumber: 81,
}
const setup = () => {
  vi.useFakeTimers()
  const primary = new FakeWorker()
  const fallback = new FakeWorker()
  const complete = vi.fn()
  const discardPrimary = vi.fn()
  const cancel = requestCom({ position, difficulty: 'hard', primary: () => primary, fallback: () => fallback, complete, discardPrimary })
  const requestId = primary.postMessage.mock.calls[0][0].requestId
  return { primary, fallback, complete, cancel, requestId, discardPrimary }
}
afterEach(() => vi.useRealTimers())
describe('COM要求の寿命', () => {
  it('普通は600ms、難は2000msを外部エンジンへ要求する', () => {
    vi.useFakeTimers()
    for (const difficulty of ['normal', 'hard'] as const) {
      const primary = new FakeWorker()
      const cancel = requestCom({ position, difficulty, primary: () => primary, fallback: () => new FakeWorker(), complete: vi.fn(), discardPrimary: vi.fn() })
      expect(primary.postMessage.mock.calls[0][0].thinkingTimeMs).toBe(difficulty === 'normal' ? 600 : 2000)
      cancel()
    }
  })
  it('投了・待ったなどの取消後はキューに残った応答も無視する', () => {
    const { primary, complete, cancel, requestId } = setup()
    const oldHandler = primary.onmessage!
    cancel()
    oldHandler.call(primary as unknown as Worker, { data: { requestId, bestmove: moveToFairyNotation(allLegalMoves(position)[0], position.turn) } } as MessageEvent)
    vi.runAllTimers()
    expect(primary.terminate).toHaveBeenCalledOnce()
    expect(complete).not.toHaveBeenCalled()
  })
  it('旧要求IDを無視し、正しい応答だけ一度適用してエンジンを再利用する', () => {
    const { primary, complete, requestId, cancel } = setup()
    const bestmove = moveToFairyNotation(allLegalMoves(position)[0], position.turn)
    primary.emit({ requestId: requestId - 1, bestmove })
    expect(complete).not.toHaveBeenCalled()
    primary.emit({ requestId, bestmove })
    primary.emit({ requestId, bestmove })
    cancel()
    vi.runAllTimers()
    expect(complete).toHaveBeenCalledOnce()
    expect(primary.terminate).not.toHaveBeenCalled()
  })
  it('初期化停止時は内蔵COMへ移り、内蔵COMも停止したら合法手で継続する', () => {
    const { primary, fallback, complete, discardPrimary } = setup()
    vi.advanceTimersByTime(15000)
    expect(primary.terminate).toHaveBeenCalledOnce()
    expect(discardPrimary).toHaveBeenCalledWith(primary)
    expect(fallback.postMessage).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(6000)
    expect(complete).toHaveBeenCalledWith(allLegalMoves(position)[0])
    expect(fallback.terminate).toHaveBeenCalledOnce()
  })
  it('代替COMの不正な投了応答を誤った勝利にしない', () => {
    const { primary, fallback, complete, requestId } = setup()
    primary.emit({ requestId, error: '起動失敗' })
    fallback.emit(null)
    expect(complete).toHaveBeenCalledWith(allLegalMoves(position)[0])
  })
  it('代替COM移行後に取り消した場合も応答を無視する', () => {
    const { primary, fallback, complete, requestId, cancel } = setup()
    primary.emit({ requestId, error: '起動失敗' })
    const handler = fallback.onmessage!
    cancel()
    handler.call(fallback as unknown as Worker, { data: allLegalMoves(position)[0] } as MessageEvent)
    vi.runAllTimers()
    expect(complete).not.toHaveBeenCalled()
  })
})
