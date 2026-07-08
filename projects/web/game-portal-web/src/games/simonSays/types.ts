export type SimonStatus = "idle" | "watching" | "input" | "failed" | "cleared";

export type SimonColor = "red" | "blue" | "green" | "yellow";

export type SimonBest = {
  level: number;
  score: number;
  recordedAt: string;
};
