import type { Tile, WinHand } from "./types";
import { allTileTypes, removeTile, sortTiles, tileEqual, tileId } from "./tiles";

const isTriplet = (tiles: Tile[]) => tiles.length === 3 && tileEqual(tiles[0], tiles[1]) && tileEqual(tiles[1], tiles[2]);
const isSequence = (tiles: Tile[]) => {
  const sorted = sortTiles(tiles);
  return sorted.length === 3 && sorted.every((tile) => tile.kind === "number") &&
    sorted[0].kind === "number" && sorted[1].kind === "number" && sorted[2].kind === "number" &&
    sorted[0].suit === sorted[1].suit && sorted[1].suit === sorted[2].suit &&
    sorted[1].value === sorted[0].value + 1 && sorted[2].value === sorted[1].value + 1;
};

export const findWinningHands = (tiles: Tile[], ankan: Tile[] = []): WinHand[] => {
  if (tiles.length === 2 && ankan.length > 0) {
    return tileEqual(tiles[0], tiles[1])
      ? [{ pair: [...tiles], mentsu: { type: "koutsu", tiles: [ankan[0], ankan[0], ankan[0]] } }]
      : [];
  }
  if (tiles.length !== 5) return [];
  const sorted = sortTiles(tiles);
  const results: WinHand[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (!tileEqual(sorted[i], sorted[j])) continue;
      const rest = sorted.filter((_, index) => index !== i && index !== j);
      const pair = [sorted[i], sorted[j]];
      if (isTriplet(rest)) {
        const key = `${tileId(pair[0])}:k:${tileId(rest[0])}`;
        if (!seen.has(key)) results.push({ pair, mentsu: { type: "koutsu", tiles: rest } });
        seen.add(key);
      }
      if (isSequence(rest)) {
        const sequence = sortTiles(rest);
        const key = `${tileId(pair[0])}:s:${tileId(sequence[0])}`;
        if (!seen.has(key)) results.push({ pair, mentsu: { type: "shuntsu", tiles: sequence } });
        seen.add(key);
      }
    }
  }
  return results;
};

export const waitingTiles = (hand: Tile[], ankan: Tile[] = []): Tile[] => {
  if (hand.length !== 4 && !(hand.length === 1 && ankan.length > 0)) return [];
  return allTileTypes().filter((candidate) => findWinningHands([...hand, candidate], ankan).length > 0);
};

export const ankanCandidates = (hand: Tile[]): Tile[] => {
  const groups = new Map<string, { tile: Tile; count: number }>();
  hand.forEach((tile) => {
    const key = tileId(tile);
    const entry = groups.get(key);
    groups.set(key, { tile, count: (entry?.count ?? 0) + 1 });
  });
  return [...groups.values()].filter(({ count }) => count >= 4).map(({ tile }) => tile);
};

export const isFuriten = (hand: Tile[], ankan: Tile[], discards: Tile[]): boolean =>
  waitingTiles(hand, ankan).some((wait) => discards.some((tile) => tileEqual(wait, tile)));

export const shanten = (hand: Tile[], ankan: Tile[] = []): number => {
  if (waitingTiles(hand, ankan).length) return 0;
  const sorted = sortTiles(hand);
  if (sorted.some((tile, index) => index > 0 && tileEqual(tile, sorted[index - 1]))) return 1;
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j];
      if (a.kind === "number" && b.kind === "number" && a.suit === b.suit && Math.abs(a.value - b.value) <= 2) return 1;
    }
  }
  return 2;
};

export const bestDiscard = (hand: Tile[], ankan: Tile[] = []): Tile => {
  let best = hand[hand.length - 1];
  let bestValue = Number.MAX_SAFE_INTEGER;
  hand.forEach((tile) => {
    const value = shanten(removeTile(hand, tile), ankan);
    if (value < bestValue) {
      best = tile;
      bestValue = value;
    }
  });
  return best;
};
