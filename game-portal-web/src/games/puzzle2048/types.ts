export type Direction = "up" | "right" | "down" | "left";

export type Board = number[][];

export type MoveResult = {
  board: Board;
  scoreGain: number;
  moved: boolean;
};
