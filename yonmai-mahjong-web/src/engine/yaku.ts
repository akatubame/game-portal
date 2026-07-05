import type { Tile, Wind, WinHand, YakuResult } from "./types";
import { isHonor, isTerminalOrHonor, isYakuhai, sortTiles, tileEqual, WIND_LABEL } from "./tiles";

export interface WinContext {
  winHand: WinHand;
  allTiles: Tile[];
  winTile: Tile;
  isTsumo: boolean;
  isRiichi: boolean;
  isDoubleRiichi: boolean;
  isIppatsu: boolean;
  isRinshan: boolean;
  isHaitei: boolean;
  seatWind: Wind;
  roundWind: Wind;
  handTiles: Tile[];
  hasAnkan: boolean;
  isFirstDraw: boolean;
  isDealerFirstDraw: boolean;
  isPlayerFirstDraw: boolean;
  isRenhou: boolean;
}

const y = (id: string, name: string, han: number): YakuResult => ({ id, name, han });

const isRyanmen = (hand: Tile[], winTile: Tile): boolean => {
  if (winTile.kind !== "number") return false;
  return hand.some((a, i) => hand.some((b, j) => {
    if (i === j || a.kind !== "number" || b.kind !== "number" || a.suit !== b.suit || a.suit !== winTile.suit) return false;
    const values = [a.value, b.value, winTile.value].sort((x, z) => x - z);
    if (values[1] !== values[0] + 1 || values[2] !== values[1] + 1) return false;
    return (winTile.value === values[0] && values[2] !== 9) || (winTile.value === values[2] && values[0] !== 1);
  }));
};

export const evaluateYaku = (ctx: WinContext): YakuResult[] => {
  if (ctx.isTsumo && ctx.isDealerFirstDraw) return [y("tenhou", "天和", 13)];
  if (ctx.isTsumo && ctx.isFirstDraw && !ctx.isDealerFirstDraw && ctx.isPlayerFirstDraw) return [y("chiihou", "地和", 13)];
  if (ctx.isRenhou) return [y("renhou", "人和", 13)];

  const result: YakuResult[] = [];
  const { pair, mentsu } = ctx.winHand;
  if (ctx.isDoubleRiichi) result.push(y("daburii", "ダブル立直", 2));
  else if (ctx.isRiichi) result.push(y("riichi", "立直", 1));
  if (ctx.isIppatsu) result.push(y("ippatsu", "一発", 1));
  if (ctx.isTsumo) result.push(y("tsumo", "門前清自摸和", 1));
  if (ctx.isRinshan) result.push(y("rinshan", "嶺上開花", 1));
  if (ctx.hasAnkan) result.push(y("ikkantsu", "一槓子", 4));
  if (ctx.isHaitei) result.push(y(ctx.isTsumo ? "haitei" : "houtei", ctx.isTsumo ? "海底摸月" : "河底撈魚", 1));
  if (ctx.allTiles.every((tile) => !isTerminalOrHonor(tile))) result.push(y("tanyao", "断幺九", 1));
  if (mentsu.type === "shuntsu" && !isYakuhai(pair[0], ctx.seatWind, ctx.roundWind) && isRyanmen(ctx.handTiles, ctx.winTile)) {
    result.push(y("pinfu", "平和", 1));
  }
  if (mentsu.type === "koutsu") {
    result.push(y("toitoi", "対々和", 2));
    if (!ctx.hasAnkan && tileEqual(ctx.winTile, pair[0])) result.push(y("iiankou", "一暗刻", 2));
    const tile = mentsu.tiles[0];
    if (tile.kind === "dragon") {
      result.push(y(`yakuhai_${tile.dragon}`, `役牌 ${{ haku: "白", hatsu: "發", chun: "中" }[tile.dragon]}`, 1));
    } else if (tile.kind === "wind") {
      if (tile.wind === ctx.seatWind) result.push(y("yakuhai_seat", `自風 ${WIND_LABEL[tile.wind]}`, 1));
      if (tile.wind === ctx.roundWind) result.push(y("yakuhai_round", `場風 ${WIND_LABEL[tile.wind]}`, 1));
    }
  }
  const numbers = ctx.allTiles.filter((tile): tile is Extract<Tile, { kind: "number" }> => tile.kind === "number");
  const honors = ctx.allTiles.filter(isHonor);
  const suits = new Set(numbers.map((tile) => tile.suit));
  if (numbers.length && honors.length && suits.size === 1) result.push(y("honitsu", "混一色", 3));
  if (numbers.length === 5 && suits.size === 1) result.push(y("chinitsu", "清一色", 6));
  if (isTerminalOrHonor(pair[0]) && mentsu.type === "shuntsu" && mentsu.tiles.some(isTerminalOrHonor)) {
    result.push(honors.length ? y("chanta", "混全帯幺九", 2) : y("junchan", "純全帯幺九", 3));
  }
  if (ctx.allTiles.every(isTerminalOrHonor) && honors.length && numbers.length) result.push(y("honroutou", "混老頭", 2));
  if (ctx.allTiles.every(isHonor)) return [y("tsuiisou", "字一色", 13)];
  if (ctx.allTiles.every((tile) => tile.kind === "number" && (tile.value === 1 || tile.value === 9))) return [y("chinroutou", "清老頭", 13)];
  const green = ctx.allTiles.every((tile) =>
    (tile.kind === "number" && tile.suit === "sou" && [2, 3, 4, 6, 8].includes(tile.value)) ||
    (tile.kind === "dragon" && tile.dragon === "hatsu")
  );
  if (green) return [y("ryuuiisou", "緑一色", 13)];
  return result;
};

export const score = (yaku: YakuResult[], dealer: boolean, tsumo: boolean) => {
  const han = yaku.reduce((sum, item) => sum + item.han, 0);
  let base = 1000;
  let rank = "1翻";
  if (han >= 13) [base, rank] = [32000, "役満"];
  else if (han >= 11) [base, rank] = [24000, "三倍満"];
  else if (han >= 8) [base, rank] = [16000, "倍満"];
  else if (han >= 6) [base, rank] = [12000, "跳満"];
  else if (han >= 5) [base, rank] = [8000, "満貫"];
  else if (han === 4) [base, rank] = [8000, "4翻"];
  else if (han === 3) [base, rank] = [4000, "3翻"];
  else if (han === 2) [base, rank] = [2000, "2翻"];
  const total = dealer ? Math.floor(base * 1.5) : base;
  const round100 = (value: number) => Math.ceil(value / 100) * 100;
  return {
    han,
    basePoints: total,
    rankName: rank,
    fromLoser: tsumo ? 0 : total,
    fromEach: tsumo && dealer ? round100(total / 3) : 0,
    fromDealer: tsumo && !dealer ? round100(total / 2) : 0,
    fromNonDealer: tsumo && !dealer ? round100(total / 4) : 0
  };
};

export const bestYakuFor = (wins: WinHand[], context: Omit<WinContext, "winHand">): { hand: WinHand; yaku: YakuResult[] } | null => {
  const candidates = wins.map((hand) => ({ hand, yaku: evaluateYaku({ ...context, winHand: hand }) }));
  return candidates.sort((a, b) => b.yaku.reduce((s, x) => s + x.han, 0) - a.yaku.reduce((s, x) => s + x.han, 0))[0] ?? null;
};
