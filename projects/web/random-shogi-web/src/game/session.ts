import { isLegalHirate, type NewGame } from './positions'
import { clonePosition, positionToSfen } from './sfen'
import { opposite, type Position, type Snapshot } from './types'

export interface Session {
  version: 1
  id: string
  updatedAt: number
  game: NewGame
  position: Position
  snapshots: Snapshot[]
  undoStack: Snapshot[]
  lastMove: Snapshot['lastMove']
  message: string
  result: string | null
}
export const SESSION_KEY = 'random-shogi-session-v1'
export const HISTORY_KEY = 'random-shogi-history-v1'
export const newSessionId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
export function readSetting(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
export function writeSetting(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true } catch { return false }
}
const isPosition = (value: unknown): value is Position => {
  try {
    const p = value as Position
    return !!p && ['sente', 'gote'].includes(p.turn) && Number.isSafeInteger(p.moveNumber) && p.moveNumber > 0 &&
      p.board.every((row) => row.every((piece) => piece === null || typeof piece?.promoted === 'boolean')) && isLegalHirate(p)
  } catch { return false }
}
const isSquares = (value: unknown): value is Snapshot['lastMove'] => Array.isArray(value) && value.length <= 2 && value.every((square) =>
  Array.isArray(square) && square.length === 2 && square.every((n) => Number.isInteger(n) && n >= 0 && n < 9))
const isSnapshot = (value: unknown): value is Snapshot => {
  const s = value as Snapshot
  return !!s && typeof s.message === 'string' && isSquares(s.lastMove) && isPosition(s.position)
}
export function isSession(value: unknown): value is Session {
  const s = value as Session
  if (!s || s.version !== 1 || typeof s.id !== 'string' || !s.id || !Number.isFinite(s.updatedAt) ||
      !s.game || !['sente', 'gote'].includes(s.game.playerSide) || !['easy', 'normal', 'hard'].includes(s.game.difficulty) ||
      !s.game.seed || !['id', 'title', 'sfen', 'phase', 'category', 'note'].every((key) => typeof s.game.seed[key as keyof typeof s.game.seed] === 'string') ||
      !isPosition(s.game.position) || !isPosition(s.position) || !isSquares(s.lastMove) || typeof s.message !== 'string' ||
      (s.result !== null && typeof s.result !== 'string') || !Array.isArray(s.snapshots) || !s.snapshots.length || s.snapshots.length > 2000 ||
      !s.snapshots.every(isSnapshot) || !Array.isArray(s.undoStack) || s.undoStack.length > 1000 || !s.undoStack.every(isSnapshot)) return false
  return positionToSfen(s.snapshots[0].position) === positionToSfen(s.game.position) &&
    positionToSfen(s.snapshots.at(-1)!.position) === positionToSfen(s.position) &&
    s.undoStack.every((undo) => undo.position.turn === s.game.playerSide && s.snapshots.some((item) => positionToSfen(item.position) === positionToSfen(undo.position)))
}
export function loadSession(): Session | null {
  try {
    const value: unknown = JSON.parse(readSetting(SESSION_KEY, 'null'))
    return isSession(value) ? value : null
  } catch { return null }
}
export function loadHistory(): Session[] {
  try {
    const value: unknown = JSON.parse(readSetting(HISTORY_KEY, '[]'))
    return Array.isArray(value) ? value.slice(0, 50).filter(isSession).filter((s) => s.result !== null) : []
  } catch { return [] }
}
export function saveSession(session: Session): boolean {
  if (session.snapshots.length > 2000 || session.undoStack.length > 1000) return false
  return writeSetting(SESSION_KEY, JSON.stringify(session))
}
export function recordHistory(session: Session): { history: Session[]; saved: boolean } {
  const history = [session, ...loadHistory().filter((item) => item.id !== session.id)].slice(0, 50)
  return { history, saved: writeSetting(HISTORY_KEY, JSON.stringify(history)) }
}
export function retryGame(game: NewGame, swap = false): NewGame {
  return { ...game, position: clonePosition(game.position), playerSide: swap ? opposite(game.playerSide) : game.playerSide }
}
export function filterHistory(history: Session[], difficulty: string, outcome: string): Session[] {
  return history.filter((item) => (difficulty === 'all' || item.game.difficulty === difficulty) &&
    (outcome === 'all' || (outcome === 'win' ? item.result?.includes('勝ち') : outcome === 'loss' ? item.result?.includes('負け') : item.result === '指せる手がありません。')))
}
