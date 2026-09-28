import { describe, expect, it } from 'vitest'
import { translateText } from './i18n'
import seeds from './game/androidPositions.json'
describe('直接翻訳', () => {
  it('全167局面の見出しと説明に日本語を残さない', () => {
    for (const seed of seeds) for (const text of [seed.title, seed.note, seed.phase, seed.family]) {
      expect(translateText(text), text).not.toMatch(/[一-龯ぁ-んァ-ヶ]/)
    }
  })
  it('結果と棋譜の更新が毎回新しい内容で翻訳される', () => {
    expect(translateText('棋譜 1/20')).toBe('Replay 1/20')
    expect(translateText('棋譜 2/20')).toBe('Replay 2/20')
    expect(translateText('投了。あなたの負けです。')).toBe('You resigned. You lose.')
    expect(translateText('COM: 歩成 23')).toBe('CPU: Pawn promoted 23')
  })
})
