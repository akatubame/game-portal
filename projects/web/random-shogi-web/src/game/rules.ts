import { clonePosition } from './sfen'
import { opposite, type Move, type Piece, type PieceKind, type Position, type Side, type Square } from './types'

const promotable = new Set<PieceKind>(['R', 'B', 'S', 'N', 'L', 'P'])
const inside = (r: number, c: number) => r >= 0 && r < 9 && c >= 0 && c < 9
const key = ([r, c]: Square) => `${r},${c}`

export function legalTargets(position: Position, from: Square): Square[] {
  const piece = position.board[from[0]]?.[from[1]]
  if (!piece || piece.owner !== position.turn) return []
  return rawTargets(position, from, piece).filter((to) => {
    const next = applyMoveUnchecked(position, { from, to, kind: piece.kind, promote: mustPromote(piece, to[0]) })
    return !isKingInCheck({ ...next, turn: piece.owner }, piece.owner)
  })
}

export function legalDrops(position: Position, side: Side, kind: PieceKind): Square[] {
  if (position.turn !== side || (position.hands[side][kind] ?? 0) <= 0) return []
  const result: Square[] = []
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (position.board[r][c]) continue
      if (deadDrop(side, kind, r)) continue
      if (kind === 'P' && position.board.some((row) => row[c]?.owner === side && row[c]?.kind === 'P' && !row[c]?.promoted)) continue
      const next = applyDropUnchecked(position, { to: [r, c], kind })
      if (!isKingInCheck({ ...next, turn: side }, side)) result.push([r, c])
    }
  }
  return result
}

export function applyMove(position: Position, move: Move): Position {
  if (move.from) {
    if (!legalTargets(position, move.from).some((to) => key(to) === key(move.to))) throw new Error('合法手ではありません')
    return applyMoveUnchecked(position, move)
  }
  if (!legalDrops(position, position.turn, move.kind).some((to) => key(to) === key(move.to))) throw new Error('打てない場所です')
  return applyDropUnchecked(position, move)
}

export function applyKnownLegalMove(position: Position, move: Move): Position {
  return move.from ? applyMoveUnchecked(position, move) : applyDropUnchecked(position, move)
}

function applyMoveUnchecked(position: Position, move: Move): Position {
  const next = clonePosition(position)
  const from = move.from!
  const piece = next.board[from[0]][from[1]]!
  const captured = next.board[move.to[0]][move.to[1]]
  next.board[from[0]][from[1]] = null
  next.board[move.to[0]][move.to[1]] = {
    ...piece,
    promoted: piece.promoted || Boolean(move.promote) || mustPromote(piece, move.to[0]),
  }
  if (captured && captured.kind !== 'K') {
    next.hands[piece.owner][captured.kind] = (next.hands[piece.owner][captured.kind] ?? 0) + 1
  }
  next.turn = opposite(position.turn)
  next.moveNumber += 1
  return next
}

function applyDropUnchecked(position: Position, move: Move): Position {
  const next = clonePosition(position)
  next.board[move.to[0]][move.to[1]] = { owner: position.turn, kind: move.kind, promoted: false }
  const count = next.hands[position.turn][move.kind] ?? 0
  if (count <= 1) delete next.hands[position.turn][move.kind]
  else next.hands[position.turn][move.kind] = count - 1
  next.turn = opposite(position.turn)
  next.moveNumber += 1
  return next
}

export function allLegalMoves(position: Position): Move[] {
  const moves: Move[] = []
  position.board.forEach((row, r) =>
    row.forEach((piece, c) => {
      if (piece?.owner !== position.turn) return
      for (const to of legalTargets(position, [r, c])) {
        const can = canPromote(piece, r, to[0])
        moves.push({ from: [r, c], to, kind: piece.kind, captured: position.board[to[0]][to[1]], promote: mustPromote(piece, to[0]) })
        if (can && !mustPromote(piece, to[0])) moves.push({ from: [r, c], to, kind: piece.kind, captured: position.board[to[0]][to[1]], promote: true })
      }
    }),
  )
  Object.entries(position.hands[position.turn]).forEach(([kind, count]) => {
    if (!count) return
    legalDrops(position, position.turn, kind as PieceKind).forEach((to) => moves.push({ to, kind: kind as PieceKind }))
  })
  return moves
}

export function hasAnyLegalMove(position: Position, side: Side) {
  return allLegalMoves({ ...position, turn: side }).length > 0
}

export function isKingInCheck(position: Position, side: Side): boolean {
  let king: Square | undefined
  position.board.forEach((row, r) =>
    row.forEach((piece, c) => {
      if (piece?.owner === side && piece.kind === 'K') king = [r, c]
    }),
  )
  if (!king) return true
  return position.board.some((row, r) =>
    row.some((piece, c) => piece?.owner === opposite(side) && rawTargets(position, [r, c], piece, true).some((target) => key(target) === key(king!))),
  )
}

export function attackerCount(position: Position, square: Square, side: Side): number {
  let count = 0
  position.board.forEach((row, rowIndex) =>
    row.forEach((piece, columnIndex) => {
      if (piece?.owner !== side) return
      if (rawTargets(position, [rowIndex, columnIndex], piece, true).some((target) => key(target) === key(square))) count += 1
    }),
  )
  return count
}

export function canPromote(piece: Piece, fromRow: number, toRow: number) {
  if (piece.promoted || !promotable.has(piece.kind)) return false
  return promotionRows(piece.owner).has(fromRow) || promotionRows(piece.owner).has(toRow)
}

export function mustPromote(piece: Piece, toRow: number) {
  if (piece.promoted) return false
  if (piece.kind === 'P' || piece.kind === 'L') return toRow === (piece.owner === 'sente' ? 0 : 8)
  if (piece.kind === 'N') return piece.owner === 'sente' ? toRow <= 1 : toRow >= 7
  return false
}

function rawTargets(position: Position, from: Square, piece: Piece, includeKing = false): Square[] {
  const result: Square[] = []
  const forward = piece.owner === 'sente' ? 1 : -1
  const add = (dr: number, dc: number) => {
    const r = from[0] + dr * forward
    const c = from[1] + dc
    if (!inside(r, c)) return false
    const target = position.board[r][c]
    if (target?.owner === piece.owner) return false
    if (target?.kind === 'K' && !includeKing) return false
    result.push([r, c])
    return !target
  }
  const slide = (dr: number, dc: number) => {
    for (let n = 1; add(dr * n, dc * n); n += 1) {}
  }
  const gold: Square[] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]]
  const silver: Square[] = [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]]
  const orthogonal: Square[] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  const diagonal: Square[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  if (piece.promoted && ['S', 'N', 'L', 'P'].includes(piece.kind)) gold.forEach(([r, c]) => add(r, c))
  else if (piece.kind === 'K') [...orthogonal, ...diagonal].forEach(([r, c]) => add(r, c))
  else if (piece.kind === 'R') {
    orthogonal.forEach(([r, c]) => slide(r, c))
    if (piece.promoted) diagonal.forEach(([r, c]) => add(r, c))
  } else if (piece.kind === 'B') {
    diagonal.forEach(([r, c]) => slide(r, c))
    if (piece.promoted) orthogonal.forEach(([r, c]) => add(r, c))
  } else if (piece.kind === 'G') gold.forEach(([r, c]) => add(r, c))
  else if (piece.kind === 'S') silver.forEach(([r, c]) => add(r, c))
  else if (piece.kind === 'N') {
    add(-2, -1)
    add(-2, 1)
  } else if (piece.kind === 'L') slide(-1, 0)
  else if (piece.kind === 'P') add(-1, 0)
  return result
}

const promotionRows = (side: Side) => new Set(side === 'sente' ? [0, 1, 2] : [6, 7, 8])
const deadDrop = (side: Side, kind: PieceKind, row: number) =>
  (['P', 'L'].includes(kind) && row === (side === 'sente' ? 0 : 8)) ||
  (kind === 'N' && (side === 'sente' ? row <= 1 : row >= 7))
