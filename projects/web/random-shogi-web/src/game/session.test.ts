import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validatedEntries } from './positions'
import { applyMove, allLegalMoves } from './rules'
import { filterHistory, isSession, loadHistory, loadSession, recordHistory, retryGame, saveSession, SESSION_KEY, type Session } from './session'
const fixture = async (): Promise<Session> => {
  const entry = (await validatedEntries())[0]
  const game = { seed: entry.seed, position: entry.position, playerSide: entry.position.turn, difficulty: 'normal' as const }
  return { version: 1, id: 'test', updatedAt: 1, game, position: entry.position, snapshots: [{ position: entry.position, message: '開始局面', lastMove: [] }], undoStack: [], lastMove: [], message: '開始局面', result: null }
}
beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) })
})
afterEach(() => vi.unstubAllGlobals())
describe('対局の復元と履歴', () => {
  it('開始局面とCOM手番の途中局面を復元できる', async () => {
    const session = await fixture()
    const move = allLegalMoves(session.position)[0]
    session.position = applyMove(session.position, move)
    session.lastMove = move.from ? [move.from, move.to] : [move.to]
    session.undoStack = [session.snapshots[0]]
    session.snapshots.push({ position: session.position, message: '指した手', lastMove: session.lastMove })
    expect(saveSession(session)).toBe(true)
    expect(loadSession()).toEqual(session)
    expect(session.position.turn).not.toBe(session.game.playerSide)
  })
  it('破損した棋譜・盤面・難易度を拒否する', async () => {
    const session = await fixture()
    expect(isSession({ ...session, snapshots: [] })).toBe(false)
    expect(isSession({ ...session, game: { ...session.game, difficulty: 'invalid' } })).toBe(false)
    expect(isSession({ ...session, position: { ...session.position, board: [] } })).toBe(false)
    localStorage.setItem(SESSION_KEY, '{broken')
    expect(loadSession()).toBeNull()
  })
  it('同局面再挑戦では盤面を複製し、先後入替では担当だけを変更する', async () => {
    const { game } = await fixture()
    const retry = retryGame(game)
    const swapped = retryGame(game, true)
    expect(retry.position).toEqual(game.position)
    expect(retry.position).not.toBe(game.position)
    expect(swapped.position.turn).toBe(game.position.turn)
    expect(swapped.playerSide).not.toBe(game.playerSide)
  })
  it('同じ対局の結果を重複登録せず難易度と勝敗で絞り込む', async () => {
    const session = { ...await fixture(), result: '詰み。あなたの勝ちです。' }
    recordHistory(session)
    recordHistory(session)
    recordHistory({ ...session, id: 'loss', result: '投了。あなたの負けです。', game: { ...session.game, difficulty: 'hard' } })
    const history = loadHistory()
    expect(history).toHaveLength(2)
    expect(filterHistory(history, 'normal', 'win')).toHaveLength(1)
    expect(filterHistory(history, 'hard', 'win')).toHaveLength(0)
    expect(filterHistory(history, 'all', 'loss')).toHaveLength(1)
  })
  it('容量不足を通知し、例外を画面まで伝播させない', async () => {
    const session = await fixture()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('容量不足') } })
    expect(saveSession(session)).toBe(false)
    expect(recordHistory({ ...session, result: '指せる手がありません。' }).saved).toBe(false)
  })
})
