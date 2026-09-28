import { describe, expect, it } from 'vitest';
import { migrateYakuLabel, yakuLabel, recordYaku, logText } from './recordLabels';
import { initialState } from './game';
import { translateText } from '../i18n';
import { bestDiscard } from './hand';
import type { Tile } from './types';
describe('役名の移行と構造化ログ', () => {
  it('旧役名をIDへ移行し、ドラの翻数と風を保持する', () => {
    for (const name of ['立直', '裏ドラ 4', 'ドラ 3', '自風 南', '場風 東', '役牌 發']) {
      expect(yakuLabel(migrateYakuLabel(name))).toBe(name);
    }
    expect(recordYaku({ id: 'tsumo', han: 1, name: '門前清自摸和' })).toBe('tsumo');
    expect(migrateYakuLabel('未知の旧役')).toBe('未知の旧役');
  });
  it('イベントは名前を保持せず表示時に選択した言語へ翻訳する', () => {
    const game = initialState();
    expect(translateText(logText({ type: 'ron', playerId: 0 }, game))).toBe('You win by ron!');
    expect(translateText(logText({ type: 'round', round: 2, honba: 4 }, game))).toBe('East 3, bonus 4');
    expect(translateText('東1局')).toBe('East 1');
    expect(translateText('東2局')).toBe('East 2');
  });
  it('同シャンテンなら中張牌より端牌を捨てる', () => {
    const man = (value: number): Tile => ({ kind: 'number', suit: 'man', value });
    expect(bestDiscard([man(2), man(4), man(6), man(8), man(9)])).toEqual(man(9));
  });
});
