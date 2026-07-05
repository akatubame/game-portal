import { evaluate } from './evaluator'
import { allLegalMoves, applyKnownLegalMove, isKingInCheck, legalTargets } from './rules'
import { opposite, type Move, type PieceKind, type Position, type Side } from './types'

const MATE_SCORE = 1_000_000
const values: Record<PieceKind, number> = {
  K: 20_000,
  R: 1000,
  B: 850,
  G: 600,
  S: 520,
  N: 360,
  L: 320,
  P: 100,
}

class SearchTimeout extends Error {}

interface SearchContext {
  deadline: number
  rootSide: Side
  nodes: number
  principalMove?: Move
  partialMove?: Move
  partialScore: number
}

export interface HardSearchResult {
  move: Move | null
  depth: number
  nodes: number
}

export function chooseHardMove(position: Position, thinkingMillis = 2500): HardSearchResult {
  const rootMoves = selectRootCandidates(position, allLegalMoves(position))
  if (!rootMoves.length) return { move: null, depth: 0, nodes: 0 }
  const fallback = chooseVerifiedFallback(position, rootMoves)

  const context: SearchContext = {
    deadline: performance.now() + thinkingMillis,
    rootSide: position.turn,
    nodes: 0,
    partialScore: -MATE_SCORE,
  }
  let bestMove = fallback
  let completedDepth = 0

  for (let depth = 1; depth <= 5; depth += 1) {
    context.partialMove = undefined
    context.partialScore = -MATE_SCORE
    try {
      const result = searchRoot(position, rootMoves, depth, context)
      bestMove = result.move
      context.principalMove = bestMove
      completedDepth = depth
    } catch (error) {
      if (!(error instanceof SearchTimeout)) throw error
      if (completedDepth === 0 && context.partialMove) bestMove = context.partialMove
      break
    }
  }

  return { move: bestMove, depth: completedDepth, nodes: context.nodes }
}

function chooseVerifiedFallback(position: Position, moves: Move[]): Move {
  const rootSide = position.turn
  let bestMove = moves[0]
  let bestScore = -MATE_SCORE

  for (const move of moves.slice(0, 18)) {
    const next = applyKnownLegalMove(position, move)
    const replies = orderedMoves(next, allLegalMoves(next)).slice(0, 24)
    if (!replies.length) {
      if (isKingInCheck(next, next.turn)) return move
      continue
    }
    let worstReply = MATE_SCORE
    for (const reply of replies) {
      const afterReply = applyKnownLegalMove(next, reply)
      let score = evaluate(afterReply, rootSide)
      score -= immediateSafetyPenalty(afterReply, reply) * 0.25
      worstReply = Math.min(worstReply, score)
    }
    if (worstReply > bestScore) {
      bestScore = worstReply
      bestMove = move
    }
  }
  return bestMove
}

function searchRoot(position: Position, rootMoves: Move[], depth: number, context: SearchContext) {
  let alpha = -MATE_SCORE
  const beta = MATE_SCORE
  let bestScore = -MATE_SCORE
  let bestMove = context.principalMove ?? rootMoves[0]
  const moves = prioritizePrincipal(rootMoves, context.principalMove)

  for (const move of moves) {
    ensureTime(context)
    const next = applyKnownLegalMove(position, move)
    const score = minimax(next, depth - 1, alpha, beta, context, 1)
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
    if (score > context.partialScore) {
      context.partialScore = score
      context.partialMove = move
    }
    alpha = Math.max(alpha, score)
  }
  return { move: bestMove, score: bestScore }
}

function minimax(
  position: Position,
  depth: number,
  alphaInput: number,
  betaInput: number,
  context: SearchContext,
  ply: number,
): number {
  ensureTime(context)
  context.nodes += 1

  const legal = allLegalMoves(position)
  if (!legal.length) {
    if (isKingInCheck(position, position.turn)) {
      return position.turn === context.rootSide ? -MATE_SCORE + ply : MATE_SCORE - ply
    }
    return 0
  }
  if (depth <= 0) return quiescence(position, alphaInput, betaInput, context, ply, 2)

  const maximizing = position.turn === context.rootSide
  let alpha = alphaInput
  let beta = betaInput
  const moves = orderedMoves(position, legal).slice(0, branchLimit(depth, ply))

  if (maximizing) {
    let best = -MATE_SCORE
    for (const move of moves) {
      best = Math.max(best, minimax(applyKnownLegalMove(position, move), depth - 1, alpha, beta, context, ply + 1))
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break
    }
    return best
  }

  let best = MATE_SCORE
  for (const move of moves) {
    best = Math.min(best, minimax(applyKnownLegalMove(position, move), depth - 1, alpha, beta, context, ply + 1))
    beta = Math.min(beta, best)
    if (alpha >= beta) break
  }
  return best
}

function quiescence(
  position: Position,
  alphaInput: number,
  betaInput: number,
  context: SearchContext,
  ply: number,
  remaining: number,
): number {
  ensureTime(context)
  const standPat = evaluate(position, context.rootSide)
  if (remaining <= 0) return standPat

  const maximizing = position.turn === context.rootSide
  let alpha = alphaInput
  let beta = betaInput
  let best = standPat
  const tactical = orderedMoves(position, allLegalMoves(position))
    .filter((move) => move.captured || move.promote || givesCheck(position, move))
    .slice(0, 14)

  if (maximizing) {
    if (best >= beta) return best
    alpha = Math.max(alpha, best)
    for (const move of tactical) {
      best = Math.max(best, quiescence(applyKnownLegalMove(position, move), alpha, beta, context, ply + 1, remaining - 1))
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break
    }
  } else {
    if (best <= alpha) return best
    beta = Math.min(beta, best)
    for (const move of tactical) {
      best = Math.min(best, quiescence(applyKnownLegalMove(position, move), alpha, beta, context, ply + 1, remaining - 1))
      beta = Math.min(beta, best)
      if (alpha >= beta) break
    }
  }
  return best
}

function orderedMoves(position: Position, moves: Move[]): Move[] {
  return moves
    .map((move) => ({ move, score: moveOrderScore(position, move) }))
    .sort((a, b) => b.score - a.score)
    .map(({ move }) => move)
}

function selectRootCandidates(position: Position, moves: Move[]): Move[] {
  const scored = moves.map((move) => {
    const next = applyKnownLegalMove(position, move)
    const positional = evaluate(next, position.turn)
    const safety = immediateSafetyPenalty(next, move)
    const captureValue = move.captured ? values[move.captured.kind] : 0
    const promotion = move.promote ? Math.floor(values[move.kind] * 0.45) : 0
    const check = givesCheck(position, move) ? 120 : 0
    return {
      move,
      score: positional + captureValue + promotion + check - safety,
      safety,
    }
  })
  scored.sort((a, b) => b.score - a.score)

  const safe = scored.filter(({ move, safety }) => {
    return safety < Math.max(260, values[move.kind] * 0.72)
  })
  return (safe.length >= 8 ? safe : scored).slice(0, 28).map(({ move }) => move)
}

function immediateSafetyPenalty(afterMove: Position, move: Move): number {
  const movedPiece = afterMove.board[move.to[0]][move.to[1]]
  if (!movedPiece) return 0
  const movedValue = values[movedPiece.kind] + (movedPiece.promoted ? promotedValue(movedPiece.kind) : 0)
  const capturedValue = move.captured ? values[move.captured.kind] : 0
  let cheapestAttacker = Number.POSITIVE_INFINITY
  afterMove.board.forEach((row, rowIndex) => {
    row.forEach((piece, columnIndex) => {
      if (piece?.owner !== afterMove.turn) return
      const canCapture = legalTargets(afterMove, [rowIndex, columnIndex])
        .some((target) => target[0] === move.to[0] && target[1] === move.to[1])
      if (canCapture) cheapestAttacker = Math.min(cheapestAttacker, values[piece.kind])
    })
  })
  if (!Number.isFinite(cheapestAttacker)) return 0
  const netLoss = movedValue - capturedValue
  const exchangeRelief = Math.min(movedValue, cheapestAttacker) * 0.15
  return Math.max(0, Math.round(netLoss - exchangeRelief))
}

function promotedValue(kind: PieceKind): number {
  if (kind === 'R') return 420
  if (kind === 'B') return 360
  if (['S', 'N', 'L', 'P'].includes(kind)) return 220
  return 0
}

function moveOrderScore(position: Position, move: Move): number {
  const moverValue = values[move.kind]
  const captureValue = move.captured ? values[move.captured.kind] : 0
  const captureScore = captureValue ? captureValue * 12 - moverValue : 0
  const promotionScore = move.promote ? Math.floor(moverValue * 0.7) + 500 : 0
  const checkScore = givesCheck(position, move) ? 220 : 0
  const centerScore = (4 - Math.abs(4 - move.to[1])) * 8
  return captureScore + promotionScore + checkScore + centerScore
}

function givesCheck(position: Position, move: Move): boolean {
  const next = applyKnownLegalMove(position, move)
  return isKingInCheck(next, opposite(position.turn))
}

function prioritizePrincipal(moves: Move[], principal?: Move): Move[] {
  if (!principal) return moves
  const index = moves.findIndex((move) => sameMove(move, principal))
  if (index <= 0) return moves
  return [moves[index], ...moves.slice(0, index), ...moves.slice(index + 1)]
}

function sameMove(a: Move, b: Move): boolean {
  return (
    a.kind === b.kind &&
    a.promote === b.promote &&
    a.to[0] === b.to[0] &&
    a.to[1] === b.to[1] &&
    a.from?.[0] === b.from?.[0] &&
    a.from?.[1] === b.from?.[1]
  )
}

function branchLimit(depth: number, ply: number): number {
  if (ply === 1) return 30
  if (depth >= 3) return 18
  if (depth === 2) return 22
  return 28
}

function ensureTime(context: SearchContext) {
  if ((context.nodes & 31) === 0 && performance.now() >= context.deadline) throw new SearchTimeout()
}
