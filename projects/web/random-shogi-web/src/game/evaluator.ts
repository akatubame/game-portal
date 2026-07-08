import { allLegalMoves, applyKnownLegalMove, attackerCount, isKingInCheck } from './rules'
import { opposite, type Move, type PieceKind, type Position, type Side } from './types'

const values: Record<PieceKind, number> = { K: 0, R: 1000, B: 850, G: 600, S: 520, N: 360, L: 320, P: 100 }
const bonus: Partial<Record<PieceKind, number>> = { R: 280, B: 240, S: 120, N: 160, L: 150, P: 220 }

export function evaluate(position: Position, side: Side): number {
  const score = (owner: Side) => {
    let total = 0
    position.board.forEach((row, r) =>
      row.forEach((piece, c) => {
        if (piece?.owner !== owner) return
        total += values[piece.kind] + (piece.promoted ? bonus[piece.kind] ?? 0 : 0)
        total += Math.max(0, 4 - Math.abs(4 - c)) * 3
        if (piece.kind !== 'K') total += (owner === 'sente' ? 8 - r : r) * (['R', 'B'].includes(piece.kind) ? 8 : 4)
        if (piece.kind !== 'K') {
          const attackers = attackerCount(position, [r, c], opposite(owner))
          const defenders = attackerCount(position, [r, c], owner)
          if (attackers > 0 && defenders === 0) total -= Math.round(values[piece.kind] * 0.58)
          else if (attackers > defenders) total -= Math.round(values[piece.kind] * 0.18)
        }
      }),
    )
    Object.entries(position.hands[owner]).forEach(([kind, count]) => (total += (count ?? 0) * values[kind as PieceKind] * 0.9))
    if (isKingInCheck(position, owner)) total -= 360
    if (isKingInCheck(position, opposite(owner))) total += 240
    total += kingSafety(position, owner)
    return total
  }
  const sente = score('sente') - score('gote')
  return Math.round(side === 'sente' ? sente : -sente)
}

function kingSafety(position: Position, owner: Side): number {
  let kingRow = -1
  let kingColumn = -1
  position.board.forEach((row, r) =>
    row.forEach((piece, c) => {
      if (piece?.owner === owner && piece.kind === 'K') {
        kingRow = r
        kingColumn = c
      }
    }),
  )
  if (kingRow < 0) return -20_000
  let safety = 0
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue
      const r = kingRow + dr
      const c = kingColumn + dc
      if (r < 0 || r > 8 || c < 0 || c > 8) continue
      const piece = position.board[r][c]
      if (piece?.owner === owner && ['G', 'S'].includes(piece.kind)) safety += 42
      if (attackerCount(position, [r, c], opposite(owner)) > 0) safety -= 38
    }
  }
  return safety
}

export function chooseMove(position: Position, difficulty: 'easy' | 'normal' | 'hard'): Move | null {
  const moves = allLegalMoves(position)
  if (!moves.length) return null
  const side = position.turn
  const scored = moves.map((move) => {
    const next = applyKnownLegalMove(position, move)
    const captured = move.captured ? values[move.captured.kind] : 0
    const check = isKingInCheck(next, opposite(side)) ? 180 : 0
    let score = evaluate(next, side) + captured + check
    if (difficulty === 'hard') {
      const replies = allLegalMoves(next)
        .slice(0, 20)
        .map((reply) => evaluate(applyKnownLegalMove(next, reply), side))
      if (replies.length) score = Math.min(...replies)
    }
    score += Math.random() * (difficulty === 'easy' ? 800 : difficulty === 'normal' ? 100 : 16)
    return { move, score }
  })
  scored.sort((a, b) => b.score - a.score)
  if (difficulty === 'easy') return scored[Math.floor(Math.random() * Math.max(1, Math.ceil(scored.length / 2)))].move
  if (difficulty === 'normal') return scored[Math.floor(Math.random() * Math.min(3, scored.length))].move
  return scored[0].move
}
