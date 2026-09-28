import { afterEach, describe, expect, it, vi } from 'vitest'
import rawSeeds from './androidPositions.json'
import { chooseEntry, createRandomGame, exactFingerprint, isLegalHirate, validatedEntries } from './positions'
import { flipPosition, parseSfen } from './sfen'
import { evaluate } from './evaluator'
import { allLegalMoves } from './rules'

afterEach(() => vi.unstubAllGlobals())
describe('Android局面パックと抽選', () => {
  it('167局面を同梱し、駒総数と配置を検証した局面だけを採用する', async () => {
    expect(rawSeeds).toHaveLength(167)
    const entries = await validatedEntries()
    expect(entries.length).toBeGreaterThan(100)
    for (const entry of entries) {
      expect(isLegalHirate(entry.position)).toBe(true)
      expect(entry.position.moveNumber).toBeGreaterThanOrEqual(80)
      expect(evaluate(entry.position, entry.position.turn)).toBeGreaterThan(0)
      expect(allLegalMoves(entry.position).length).toBeGreaterThan(0)
    }
  })
  it('手数だけの違いと先後反転を重複と判定する', () => {
    const position = parseSfen(rawSeeds[0].sfen)
    expect(exactFingerprint({ ...position, moveNumber: 999 })).toBe(exactFingerprint(position))
    expect(exactFingerprint(flipPosition(position))).toBe(exactFingerprint(position))
  })
  it('直近2系列を避け、収録件数によらず系列を選ぶ', async () => {
    const entries = await validatedEntries()
    const families = [...new Set(entries.map((entry) => entry.seed.family))].filter((name) => name !== '既存局面') as string[]
    expect(families.length).toBeGreaterThanOrEqual(3)
    const chosen = chooseEntry(entries, families.slice(0, 2), [], [], () => 0)
    expect(families.slice(0, 2)).not.toContain(chosen.seed.family)
  })
  it('保存が拒否されても有利な合法局面から開始できる', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('無効'); }, setItem: () => { throw new Error('無効'); } })
    const game = await createRandomGame('normal')
    expect(isLegalHirate(game.position)).toBe(true)
    expect(evaluate(game.position, game.playerSide)).toBeGreaterThan(0)
    expect(game.seed.category).toBe(game.seed.family)
  })
  it('未出題の局面を優先して選択する', async () => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) })
    const seen = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const game = await createRandomGame('easy')
      const key = exactFingerprint(game.position)
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })
})
