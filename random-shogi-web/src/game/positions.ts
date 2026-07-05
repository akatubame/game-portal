import rawSeeds from './positions.json'
import { evaluate } from './evaluator'
import { allLegalMoves, applyMove } from './rules'
import { flipPosition, mirrorPositionHorizontally, parseSfen } from './sfen'
import { senkeiCatalog, type SenkeiEntry } from './senkei'
import type { Difficulty, Move, Position, PositionSeed, Side } from './types'

const baseSeeds = rawSeeds as PositionSeed[]

export interface NewGame {
  seed: PositionSeed
  position: Position
  playerSide: Side
  difficulty: Difficulty
}

export async function createRandomGame(difficulty: Difficulty, onProgress?: (value: number, label: string) => void): Promise<NewGame> {
  const seen = new Set<string>(JSON.parse(localStorage.getItem('random-shogi-seen') || '[]'))
  const recentFamilies: string[] = JSON.parse(localStorage.getItem('random-shogi-recent-families') || '[]')
  const recentNames: string[] = JSON.parse(localStorage.getItem('random-shogi-recent-senkei') || '[]')

  for (let attempt = 0; attempt < 48; attempt += 1) {
    onProgress?.(Math.min(95, 8 + attempt * 2), `戦型と派生局面を生成中 ${attempt + 1}/48`)
    await yieldToBrowser()
    const senkei = chooseSenkei(recentFamilies, recentNames, attempt)
    const baseIndex = Math.abs(hashText(`${senkei.family}:${senkei.name}`) + attempt * 7) % baseSeeds.length
    const base = baseSeeds[baseIndex]
    const flipped = Math.random() < 0.5
    const mirrored = Math.random() < 0.5
    let position = parseSfen(base.sfen)
    if (mirrored) position = mirrorPositionHorizontally(position)
    if (flipped) position = flipPosition(position)
    position = derivePosition(position, 2 + Math.floor(Math.random() * 11))
    const playerSide = position.turn
    const fingerprint = JSON.stringify(position)
    if (seen.has(fingerprint) && attempt < 40) continue
    const value = evaluate(position, playerSide)
    if (value <= 0) continue
    const seed = {
      ...base,
      id: `${base.id}-${hashText(fingerprint)}-${Date.now()}`,
      category: senkei.family,
      title: `${senkei.name}・${base.title}`,
      note: `${senkei.family}の「${senkei.name}」を参考に、合法手で進行させた派生局面です。${base.note}`,
    }
    seen.add(fingerprint)
    localStorage.setItem('random-shogi-seen', JSON.stringify(Array.from(seen).slice(-4000)))
    rememberSenkei(senkei, recentFamilies, recentNames)
    onProgress?.(100, '対局を準備しています')
    return { seed, position, playerSide, difficulty }
  }
  const seed = baseSeeds.find((item) => item.evaluationForSente > 0) ?? baseSeeds[0]
  const position = parseSfen(seed.sfen)
  return { seed, position, playerSide: position.turn, difficulty }
}

function chooseSenkei(recentFamilies: string[], recentNames: string[], attempt: number): SenkeiEntry {
  const strict = senkeiCatalog.filter((entry) => !recentFamilies.includes(entry.family) && !recentNames.includes(entry.name))
  const relaxed = senkeiCatalog.filter((entry) => !recentNames.includes(entry.name))
  const pool = strict.length && attempt < 30 ? strict : relaxed.length ? relaxed : senkeiCatalog
  return pool[Math.floor(Math.random() * pool.length)]
}

function rememberSenkei(entry: SenkeiEntry, families: string[], names: string[]) {
  localStorage.setItem('random-shogi-recent-families', JSON.stringify([entry.family, ...families.filter((item) => item !== entry.family)].slice(0, 4)))
  localStorage.setItem('random-shogi-recent-senkei', JSON.stringify([entry.name, ...names.filter((item) => item !== entry.name)].slice(0, 24)))
}

function derivePosition(start: Position, plies: number): Position {
  let position = start
  for (let ply = 0; ply < plies; ply += 1) {
    const moves = allLegalMoves(position)
    if (!moves.length) break
    const move = chooseDiverseMove(position, moves)
    position = applyMove(position, move)
  }
  return position
}

function chooseDiverseMove(position: Position, moves: Move[]): Move {
  const scored = moves.map((move) => {
    const next = applyMove(position, move)
    const capture = move.captured ? 500 : 0
    const promotion = move.promote ? 260 : 0
    return { move, score: evaluate(next, position.turn) + capture + promotion + Math.random() * 900 }
  })
  scored.sort((a, b) => b.score - a.score)
  const poolSize = Math.min(scored.length, 5 + Math.floor(Math.random() * 8))
  return scored[Math.floor(Math.random() * poolSize)].move
}

function hashText(text: string): number {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) | 0
  return hash
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}
