export type Side = 'sente' | 'gote'
export type PieceKind = 'K' | 'R' | 'B' | 'G' | 'S' | 'N' | 'L' | 'P'
export type Difficulty = 'easy' | 'normal' | 'hard'
export type Square = [number, number]

export interface Piece {
  owner: Side
  kind: PieceKind
  promoted: boolean
}

export interface Position {
  board: (Piece | null)[][]
  turn: Side
  hands: Record<Side, Partial<Record<PieceKind, number>>>
  moveNumber: number
}

export interface PositionSeed {
  id: string
  title: string
  sfen: string
  evaluationForSente: number
  phase: string
  note: string
  category: string
}

export interface Move {
  from?: Square
  to: Square
  kind: PieceKind
  promote?: boolean
  captured?: Piece | null
  score?: number
}

export interface Snapshot {
  position: Position
  lastMove: Square[]
  message: string
}

export const opposite = (side: Side): Side => (side === 'sente' ? 'gote' : 'sente')
