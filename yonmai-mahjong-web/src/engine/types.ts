export type Suit = "man" | "pin" | "sou";
export type Wind = "east" | "south" | "west" | "north";
export type Dragon = "haku" | "hatsu" | "chun";

export type Tile =
  | { kind: "number"; suit: Suit; value: number }
  | { kind: "wind"; wind: Wind }
  | { kind: "dragon"; dragon: Dragon };

export type Difficulty = "beginner" | "easy" | "normal";
export type GamePhase = "title" | "playing" | "waiting" | "roundResult" | "gameResult";
export type PendingType = "discard" | "tsumoOrDiscard" | "ronCheck" | "autoDiscard";

export interface Mentsu {
  type: "shuntsu" | "koutsu";
  tiles: Tile[];
}

export interface WinHand {
  pair: Tile[];
  mentsu: Mentsu;
}

export interface YakuResult {
  id: string;
  name: string;
  han: number;
}

export interface PlayerState {
  id: number;
  name: string;
  hand: Tile[];
  discards: Tile[];
  points: number;
  seatWind: Wind;
  isRiichi: boolean;
  isDoubleRiichi: boolean;
  riichiDiscardIndex: number;
  isIppatsu: boolean;
  ankan: Tile[];
  isHuman: boolean;
  temporaryFuriten: boolean;
  riichiFuriten: boolean;
}

export interface Wall {
  liveTiles: Tile[];
  deadWall: Tile[];
  doraIndicators: Tile[];
  uraDoraIndicators: Tile[];
}

export interface PendingAction {
  type: PendingType;
  canTsumo: boolean;
  canRiichi: boolean;
  canAnkan: boolean;
  ankanTiles: Tile[];
}

export interface RoundResult {
  winnerId: number | null;
  loserId: number | null;
  yaku: YakuResult[];
  totalHan: number;
  rankName: string;
  basePoints: number;
  isTsumo: boolean;
  isDraw: boolean;
  winTile: Tile | null;
  winTiles: Tile[];
  pointChanges: number[];
}

export interface GameState {
  version: 1;
  phase: GamePhase;
  players: PlayerState[];
  wall: Wall;
  currentPlayerIdx: number;
  roundNumber: number;
  dealerIdx: number;
  roundWind: Wind;
  turnCount: number;
  drawnTile: Tile | null;
  isRinshanDraw: boolean;
  lastDiscard: Tile | null;
  lastDiscardPlayer: number;
  roundResult: RoundResult | null;
  gameLog: string[];
  riichiSticks: number;
  honbaCount: number;
  pendingAction: PendingAction | null;
  difficulty: Difficulty;
}

export interface PlayerStatistics {
  games: number;
  rankCounts: number[];
  bestScore: number;
  totalScore: number;
  hands: number;
  wins: number;
  dealIns: number;
  riichi: number;
  totalWinPoints: number;
  highestWinScore: number;
  highestWinYaku: string[];
  highestWinHandTiles: Tile[];
}

export type Statistics = Record<Difficulty, PlayerStatistics>;
