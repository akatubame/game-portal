export type BreakoutStatus = "idle" | "playing" | "paused" | "finished" | "cleared";

export type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type Brick = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  color: string;
};

export type BreakoutResult = {
  score: number;
  clearedBricks: number;
  lives: number;
  recordedAt: string;
};
