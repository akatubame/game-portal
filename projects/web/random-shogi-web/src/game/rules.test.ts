import { describe, expect, it } from 'vitest'
import { allLegalMoves, applyMove, canPromote, isKingInCheck, legalDrops } from './rules'
import type { Position } from './types'

const pawnMate = (): Position => {
  const position: Position = { board: Array.from({ length: 9 }, () => Array(9).fill(null)), hands: { sente: { P: 1 }, gote: {} }, turn: 'sente', moveNumber: 81 }
  position.board[8][8] = { owner: 'sente', kind: 'K', promoted: false }
  position.board[2][4] = { owner: 'sente', kind: 'G', promoted: false }
  position.board[0][4] = { owner: 'gote', kind: 'K', promoted: false }
  for (const col of [3, 5]) {
    position.board[0][col] = { owner: 'gote', kind: 'L', promoted: false }
    position.board[1][col] = { owner: 'gote', kind: 'P', promoted: false }
  }
  return position
}

describe('合法手の境界条件', () => {
  it('打ち歩詰めを盤面候補・COM候補・実行のすべてで拒否する', () => {
    const position = pawnMate()
    expect(legalDrops(position, 'sente', 'P')).not.toContainEqual([1, 4])
    expect(allLegalMoves(position).some((m) => !m.from && m.to[0] === 1 && m.to[1] === 4)).toBe(false)
    expect(() => applyMove(position, { kind: 'P', to: [1, 4] })).toThrow()
  })
  it('玉が逃げられる歩打ち王手は禁止しない', () => {
    const position = pawnMate()
    position.board[0][3] = null
    expect(legalDrops(position, 'sente', 'P')).toContainEqual([1, 4])
    const next = applyMove(position, { kind: 'P', to: [1, 4] })
    expect(isKingInCheck(next, 'gote')).toBe(true)
    expect(allLegalMoves(next).length).toBeGreaterThan(0)
  })
  it('玉で歩を取れる場合は禁止しない', () => {
    const position = pawnMate()
    position.board[2][4] = null
    expect(legalDrops(position, 'sente', 'P')).toContainEqual([1, 4])
  })
  it('後手の打ち歩詰めも拒否する', () => {
    const original = pawnMate()
    const position: Position = { ...original, turn: 'gote', hands: { sente: {}, gote: { P: 1 } }, board: original.board.slice().reverse().map((row) => row.slice().reverse().map((piece) => piece ? { ...piece, owner: piece.owner === 'sente' ? 'gote' : 'sente' } : null)) }
    expect(legalDrops(position, 'gote', 'P')).not.toContainEqual([7, 4])
  })
  it('成れない位置での成り・駒種の偽装・成駒打ちを拒否する', () => {
    const position = pawnMate()
    position.board[6][0] = { owner: 'sente', kind: 'P', promoted: false }
    expect(() => applyMove(position, { from: [6, 0], to: [5, 0], kind: 'P', promote: true })).toThrow()
    expect(() => applyMove(position, { from: [6, 0], to: [5, 0], kind: 'R' })).toThrow()
    expect(() => applyMove(position, { to: [5, 1], kind: 'P', promote: true })).toThrow()
    expect(canPromote(position.board[2][4]!, 2, 1)).toBe(false)
  })
});
