import type { Move, Piece, PieceKind, Position, Side, Square } from './types'

export function parseSfen(sfen: string): Position {
  const [boardPart, turnPart, handsPart, movePart] = sfen.trim().split(/\s+/)
  const board = boardPart.split('/').map((row) => {
    const cells: (Piece | null)[] = []
    let promoted = false
    for (const char of row) {
      if (char === '+') {
        promoted = true
      } else if (/\d/.test(char)) {
        for (let i = 0; i < Number(char); i += 1) cells.push(null)
      } else {
        cells.push({
          owner: char === char.toUpperCase() ? 'sente' : 'gote',
          kind: char.toUpperCase() as PieceKind,
          promoted,
        })
        promoted = false
      }
    }
    if (cells.length !== 9) throw new Error('不正なSFENです')
    return cells
  })
  return {
    board,
    turn: turnPart === 'b' ? 'sente' : 'gote',
    hands: parseHands(handsPart),
    moveNumber: Number(movePart) || 1,
  }
}

export function positionToSfen(position: Position): string {
  const board = position.board
    .map((row) => {
      let empty = 0
      let encoded = ''
      for (const piece of row) {
        if (!piece) {
          empty += 1
          continue
        }
        if (empty) {
          encoded += String(empty)
          empty = 0
        }
        const symbol = piece.owner === 'sente' ? piece.kind : piece.kind.toLowerCase()
        encoded += `${piece.promoted ? '+' : ''}${symbol}`
      }
      return encoded + (empty ? String(empty) : '')
    })
    .join('/')

  const handOrder: PieceKind[] = ['R', 'B', 'G', 'S', 'N', 'L', 'P']
  let hands = ''
  for (const side of ['sente', 'gote'] as const) {
    for (const kind of handOrder) {
      const count = position.hands[side][kind] ?? 0
      if (!count) continue
      const symbol = side === 'sente' ? kind : kind.toLowerCase()
      hands += `${count > 1 ? count : ''}${symbol}`
    }
  }

  return `${board} ${position.turn === 'sente' ? 'b' : 'w'} ${hands || '-'} ${position.moveNumber}`
}

export function moveToFairyNotation(move: Move, side: Side): string {
  const destination = squareToFairyNotation(move.to)
  if (!move.from) {
    const kind = side === 'sente' ? move.kind : move.kind.toLowerCase()
    return `${kind}@${destination}`
  }
  return `${squareToFairyNotation(move.from)}${destination}${move.promote ? '+' : ''}`
}

function squareToFairyNotation([row, col]: Square): string {
  return `${'abcdefghi'[col]}${9 - row}`
}

function parseHands(raw: string): Position['hands'] {
  const hands: Position['hands'] = { sente: {}, gote: {} }
  if (raw === '-') return hands
  let count = ''
  for (const char of raw) {
    if (/\d/.test(char)) {
      count += char
      continue
    }
    const side: Side = char === char.toUpperCase() ? 'sente' : 'gote'
    const kind = char.toUpperCase() as PieceKind
    hands[side][kind] = (hands[side][kind] ?? 0) + Number(count || 1)
    count = ''
  }
  return hands
}

export function flipPosition(position: Position): Position {
  return {
    ...position,
    board: position.board
      .slice()
      .reverse()
      .map((row) =>
        row
          .slice()
          .reverse()
          .map((piece) => (piece ? { ...piece, owner: piece.owner === 'sente' ? 'gote' : 'sente' } : null)),
      ),
    turn: position.turn === 'sente' ? 'gote' : 'sente',
    hands: { sente: { ...position.hands.gote }, gote: { ...position.hands.sente } },
  }
}

export function clonePosition(position: Position): Position {
  return {
    ...position,
    board: position.board.map((row) => row.map((piece) => (piece ? { ...piece } : null))),
    hands: { sente: { ...position.hands.sente }, gote: { ...position.hands.gote } },
  }
}

export function mirrorPositionHorizontally(position: Position): Position {
  return {
    ...clonePosition(position),
    board: position.board.map((row) => row.slice().reverse().map((piece) => (piece ? { ...piece } : null))),
  }
}
