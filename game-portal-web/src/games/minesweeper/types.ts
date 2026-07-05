export type DifficultyId = "easy" | "normal" | "hard";

export type Difficulty = {
  id: DifficultyId;
  label: string;
  rows: number;
  columns: number;
  mines: number;
};

export type MineCell = {
  row: number;
  column: number;
  hasMine: boolean;
  adjacentMines: number;
  revealed: boolean;
  flagged: boolean;
};

export type MineBoard = MineCell[][];

export type GameStatus = "ready" | "playing" | "won" | "lost";
