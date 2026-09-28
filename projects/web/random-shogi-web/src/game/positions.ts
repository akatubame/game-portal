import rawSeeds from './androidPositions.json'
import { evaluate } from './evaluator'
import { allLegalMoves, applyKnownLegalMove, isKingInCheck, mustPromote } from './rules'
import { flipPosition, parseSfen, positionToSfen } from './sfen'
import { opposite, type Difficulty, type PieceKind, type Position, type PositionSeed, type Side } from './types'

export interface NewGame {
  seed: PositionSeed
  position: Position
  playerSide: Side
  difficulty: Difficulty
}

type Entry = { seed: PositionSeed; position: Position; exact: string; structure: string }
const seeds: PositionSeed[] = rawSeeds.map((seed) => ({ ...seed, category: seed.family }))
const pick = <T,>(items: T[], random = Math.random): T => items[Math.floor(random() * items.length)]
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

export function exactFingerprint(position: Position): string {
  const withoutMove = (p: Position) => positionToSfen(p).split(' ').slice(0, 3).join(' ')
  return [withoutMove(position), withoutMove(flipPosition(position))].sort()[0]
}
export function structureFingerprint(position: Position): string {
  const oneWay = (p: Position) => {
    const parts: string[] = [p.turn]
    for (const side of ['sente', 'gote'] as const) {
      const kings: number[] = [], rooks: number[] = []
      p.board.forEach((row, r) => row.forEach((piece, c) => {
        if (piece?.owner !== side) return
        if (piece.kind === 'K') kings.push(Math.floor(c / 3))
        if (piece.kind === 'R') rooks.push(Math.floor(r / 3) * 3 + Math.floor(c / 3))
      }))
      parts.push(kings.join(''), rooks.sort().join(''),
        (['R', 'B', 'G', 'S', 'N', 'L', 'P'] as PieceKind[]).map((kind) => Math.min(3, p.hands[side][kind] ?? 0)).join(''))
    }
    parts.push(String(Math.min(6, p.board.flat().filter((piece) => piece?.promoted).length)), String(Math.min(9, Math.floor(p.moveNumber / 15))))
    return parts.join(':')
  }
  return [oneWay(position), oneWay(flipPosition(position))].sort()[0]
}

export function isLegalHirate(position: Position): boolean {
  if (position.board.length !== 9 || position.board.some((row) => row.length !== 9)) return false
  const expected: Record<PieceKind, number> = { K: 2, R: 2, B: 2, G: 4, S: 4, N: 4, L: 4, P: 18 }
  const counts: Record<string, number> = {}
  for (const side of ['sente', 'gote'] as const) {
    if (position.board.flat().filter((p) => p?.owner === side && p.kind === 'K').length !== 1) return false
    for (let c = 0; c < 9; c++) {
      if (position.board.filter((row) => row[c]?.owner === side && row[c]?.kind === 'P' && !row[c]?.promoted).length > 1) return false
    }
    for (const [kind, count] of Object.entries(position.hands[side])) {
      if (kind === 'K' || !Number.isInteger(count) || count < 0) return false
      counts[kind] = (counts[kind] ?? 0) + count
    }
  }
  for (let r = 0; r < 9; r++) for (const piece of position.board[r]) {
    if (!piece) continue
    if (!['sente', 'gote'].includes(piece.owner) || !(piece.kind in expected) ||
        (piece.promoted && ['K', 'G'].includes(piece.kind)) || mustPromote(piece, r)) return false
    counts[piece.kind] = (counts[piece.kind] ?? 0) + 1
  }
  return Object.entries(expected).every(([kind, count]) => counts[kind] === count) &&
    Object.keys(counts).every((kind) => kind in expected) && !isKingInCheck(position, opposite(position.turn))
}

let entriesPromise: Promise<Entry[]> | undefined
export function validatedEntries(): Promise<Entry[]> {
  return entriesPromise ??= (async () => {
    const entries: Entry[] = [], exact = new Set<string>()
    for (let i = 0; i < seeds.length; i++) {
      if (i % 8 === 0) await pause()
      const seed = seeds[i]
      try {
        const position = parseSfen(seed.sfen)
        if (position.moveNumber < 80 || (position.turn === 'sente' ? seed.evaluationForSente : -seed.evaluationForSente) <= 0 ||
            !isLegalHirate(position) || evaluate(position, position.turn) <= 0 || !allLegalMoves(position).length) continue
        const fingerprint = exactFingerprint(position)
        if (exact.has(fingerprint)) continue
        exact.add(fingerprint)
        entries.push({ seed, position, exact: fingerprint, structure: structureFingerprint(position) })
      } catch { /* 不正な局面は抽選対象に含めない。 */ }
    }
    if (!entries.length) throw new Error('有効な局面がありません')
    return entries
  })()
}

function readList(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch { return [] }
}
function writeList(key: string, items: string[]) {
  try { localStorage.setItem(key, JSON.stringify(items)) } catch { /* 保存できない環境でも新規対局は可能にする。 */ }
}

export function chooseEntry(entries: Entry[], families: string[], games: string[], structures: string[], random = Math.random): Entry {
  const modern = entries.filter((entry) => entry.seed.family !== '既存局面')
  const pool = modern.length ? modern : entries
  const allFamilies = [...new Set(pool.map((entry) => entry.seed.family!))]
  const fresh = allFamilies.filter((family) => !families.slice(0, 2).includes(family))
  const notLast = allFamilies.filter((family) => family !== families[0])
  const family = pick(fresh.length ? fresh : notLast.length ? notLast : allFamilies, random)
  const familyEntries = pool.filter((entry) => entry.seed.family === family)
  const allGames = [...new Set(familyEntries.map((entry) => entry.seed.sourceGame!))]
  const freshGames = allGames.filter((game) => !games.includes(game))
  const oldest = Math.max(...allGames.map((game) => games.indexOf(game)))
  const game = pick(freshGames.length ? freshGames : allGames.filter((game) => games.indexOf(game) === oldest), random)
  const gameEntries = familyEntries.filter((entry) => entry.seed.sourceGame === game)
  const freshStructures = gameEntries.filter((entry) => !structures.includes(entry.structure))
  return pick(freshStructures.length ? freshStructures : gameEntries, random)
}

export async function createRandomGame(difficulty: Difficulty, onProgress?: (value: number, label: string) => void): Promise<NewGame> {
  onProgress?.(10, '局面データを検証しています')
  const entries = await validatedEntries()
  const seen = new Set(readList('random-shogi-seen-v2'))
  const families = readList('random-shogi-families-v2')
  const games = readList('random-shogi-source-games-v2')
  const structures = readList('random-shogi-structures-v2')
  const unseen = entries.filter((entry) => !seen.has(entry.exact))
  let entry = chooseEntry(unseen.length ? unseen : entries, families, games, structures)
  let position = parseSfen(entry.seed.sfen)
  // 全既存局面を出題済みの場合だけ、短い合法手の派生を試す。
  if (!unseen.length) {
    for (let attempt = 0; attempt < 12; attempt++) {
      await pause()
      entry = chooseEntry(entries, families, games, structures)
      position = parseSfen(entry.seed.sfen)
      for (let ply = 0; ply < 2; ply++) {
        const moves = allLegalMoves(position)
        if (!moves.length) break
        position = applyKnownLegalMove(position, pick(moves))
      }
      if (!seen.has(exactFingerprint(position)) && evaluate(position, position.turn) > 0 &&
          isLegalHirate(position) && allLegalMoves(position).length) break
      position = parseSfen(entry.seed.sfen)
    }
  }
  seen.add(exactFingerprint(position))
  writeList('random-shogi-seen-v2', [...seen].slice(-10000))
  const remember = (key: string, value: string, list: string[], count: number) => writeList(key, [value, ...list.filter((item) => item !== value)].slice(0, count))
  remember('random-shogi-families-v2', entry.seed.family!, families, 4)
  remember('random-shogi-source-games-v2', entry.seed.sourceGame!, games, 24)
  remember('random-shogi-structures-v2', structureFingerprint(position), structures, 24)
  onProgress?.(100, '対局を準備しています')
  return { seed: { ...entry.seed }, position, playerSide: position.turn, difficulty }
}
