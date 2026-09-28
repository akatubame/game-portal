import type { GameState, YakuResult } from './types';

const names: Record<string, string> = {
  riichi: '立直', daburii: 'ダブル立直', ippatsu: '一発', tsumo: '門前清自摸和', rinshan: '嶺上開花',
  ikkantsu: '一槓子', haitei: '海底摸月', houtei: '河底撈魚', tanyao: '断幺九', pinfu: '平和', toitoi: '対々和',
  iiankou: '一暗刻', honitsu: '混一色', chinitsu: '清一色', chanta: '混全帯幺九', junchan: '純全帯幺九',
  honroutou: '混老頭', tenhou: '天和', chiihou: '地和', renhou: '人和', tsuiisou: '字一色', chinroutou: '清老頭', ryuuiisou: '緑一色',
  yakuhai_haku: '役牌 白', yakuhai_hatsu: '役牌 發', yakuhai_chun: '役牌 中'
};
const winds: Record<string, string> = { east: '東', south: '南', west: '西', north: '北' };
export function migrateYakuLabel(value: string): string {
  const known = Object.entries(names).find(([, name]) => name === value);
  if (known) return known[0];
  const dora = value.match(/^(裏ドラ|ドラ)\s+(\d+)$/);
  if (dora) return `${dora[1] === 'ドラ' ? 'dora' : 'uradora'}:${dora[2]}`;
  const wind = value.match(/^(自風|場風)\s+([東南西北])$/);
  if (wind) return `yakuhai_${wind[1] === '自風' ? 'seat' : 'round'}:${Object.keys(winds).find((key) => winds[key] === wind[2])}`;
  return value;
}
export function recordYaku(yaku: YakuResult): string {
  if (yaku.id === 'dora' || yaku.id === 'uradora') return `${yaku.id}:${yaku.han}`;
  return yaku.id.startsWith('yakuhai_') ? migrateYakuLabel(yaku.name) : yaku.id;
}
export function yakuLabel(value: string): string {
  const [id, detail] = value.split(':');
  if (names[id]) return names[id];
  if (id === 'dora' || id === 'uradora') return `${id === 'dora' ? 'ドラ' : '裏ドラ'} ${detail}`;
  if (id === 'yakuhai_seat' || id === 'yakuhai_round') return `${id === 'yakuhai_seat' ? '自風' : '場風'} ${winds[detail] ?? detail}`;
  return value;
}
export type GameLogEvent = { type: 'round'; round: number; honba: number } | { type: 'riichi' | 'ankan' | 'tsumo' | 'ron'; playerId: number } | { type: 'draw' };
export function logText(event: GameLogEvent, game: GameState): string {
  if (event.type === 'round') return `東${event.round + 1}局 ${event.honba}本場`;
  if (event.type === 'draw') return '流局';
  const action = { riichi: '立直', ankan: '暗槓', tsumo: 'ツモ', ron: 'ロン' }[event.type];
  return `${game.players[event.playerId].name} が${action}！`;
}
