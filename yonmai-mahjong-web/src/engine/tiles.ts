import type { Dragon, Suit, Tile, Wall, Wind } from "./types";

export const WINDS: Wind[] = ["east", "south", "west", "north"];
export const WIND_LABEL: Record<Wind, string> = { east: "東", south: "南", west: "西", north: "北" };
export const DRAGON_LABEL: Record<Dragon, string> = { haku: "白", hatsu: "發", chun: "中" };
export const SUIT_LABEL: Record<Suit, string> = { man: "萬", pin: "筒", sou: "索" };

export const tileId = (tile: Tile): string => {
  if (tile.kind === "number") return `${tile.suit}_${tile.value}`;
  if (tile.kind === "wind") return `wind_${tile.wind}`;
  return `dragon_${tile.dragon}`;
};

export const tileImagePath = (tile: Tile): string => `/tiles/${tileId(tile)}.png`;

export const tileEqual = (a: Tile, b: Tile): boolean => tileId(a) === tileId(b);

export const allTileTypes = (): Tile[] => {
  const tiles: Tile[] = [];
  (["man", "pin", "sou"] as Suit[]).forEach((suit) => {
    for (let value = 1; value <= 9; value++) tiles.push({ kind: "number", suit, value });
  });
  WINDS.forEach((wind) => tiles.push({ kind: "wind", wind }));
  (["haku", "hatsu", "chun"] as Dragon[]).forEach((dragon) => tiles.push({ kind: "dragon", dragon }));
  return tiles;
};

export const sortTiles = (tiles: Tile[]): Tile[] => [...tiles].sort((a, b) => tileSortKey(a) - tileSortKey(b));

const tileSortKey = (tile: Tile): number => {
  if (tile.kind === "number") return ({ man: 0, pin: 100, sou: 200 }[tile.suit]) + tile.value;
  if (tile.kind === "wind") return 300 + WINDS.indexOf(tile.wind);
  return 400 + ["haku", "hatsu", "chun"].indexOf(tile.dragon);
};

export const removeTile = (tiles: Tile[], target: Tile): Tile[] => {
  const index = tiles.findIndex((tile) => tileEqual(tile, target));
  return index < 0 ? tiles : [...tiles.slice(0, index), ...tiles.slice(index + 1)];
};

export const shuffle = <T,>(items: T[], random: () => number = Math.random): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const buildWall = (random: () => number = Math.random): Wall => {
  const deck = shuffle(allTileTypes().flatMap((tile) => [tile, tile, tile, tile]), random);
  const dead = deck.slice(-14);
  return {
    liveTiles: deck.slice(0, -14),
    deadWall: dead.slice(2),
    doraIndicators: [dead[0]],
    uraDoraIndicators: [dead[1]]
  };
};

export const drawLive = (wall: Wall): [Tile | null, Wall] =>
  wall.liveTiles.length ? [wall.liveTiles[0], { ...wall, liveTiles: wall.liveTiles.slice(1) }] : [null, wall];

export const drawDead = (wall: Wall): [Tile | null, Wall] => {
  if (!wall.deadWall.length) return [null, wall];
  const rest = wall.deadWall.slice(1);
  const dora = rest[0];
  const ura = rest[1];
  return [
    wall.deadWall[0],
    {
      ...wall,
      deadWall: rest.slice(2),
      doraIndicators: dora ? [...wall.doraIndicators, dora] : wall.doraIndicators,
      uraDoraIndicators: ura ? [...wall.uraDoraIndicators, ura] : wall.uraDoraIndicators
    }
  ];
};

export const nextDora = (tile: Tile): Tile => {
  if (tile.kind === "number") return { ...tile, value: tile.value === 9 ? 1 : tile.value + 1 };
  if (tile.kind === "wind") return { kind: "wind", wind: WINDS[(WINDS.indexOf(tile.wind) + 1) % 4] };
  const dragons: Dragon[] = ["haku", "hatsu", "chun"];
  return { kind: "dragon", dragon: dragons[(dragons.indexOf(tile.dragon) + 1) % 3] };
};

export const countDora = (tiles: Tile[], indicators: Tile[]): number =>
  indicators.reduce((sum, indicator) => sum + tiles.filter((tile) => tileEqual(tile, nextDora(indicator))).length, 0);

export const isHonor = (tile: Tile): boolean => tile.kind !== "number";
export const isTerminalOrHonor = (tile: Tile): boolean => tile.kind !== "number" || tile.value === 1 || tile.value === 9;
export const isYakuhai = (tile: Tile, seat: Wind, round: Wind): boolean =>
  tile.kind === "dragon" || (tile.kind === "wind" && (tile.wind === seat || tile.wind === round));
