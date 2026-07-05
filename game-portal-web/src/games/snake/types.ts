export type SnakeStatus = "idle" | "playing" | "paused" | "finished";

export type Direction = "up" | "down" | "left" | "right";

export type Point = {
  x: number;
  y: number;
};

export type SnakeResult = {
  score: number;
  apples: number;
  length: number;
  recordedAt: string;
};
