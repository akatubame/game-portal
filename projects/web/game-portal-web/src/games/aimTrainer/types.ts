export type AimTrainerStatus = "idle" | "playing" | "finished";

export type AimTarget = {
  x: number;
  y: number;
  size: number;
};

export type AimTrainerResult = {
  score: number;
  hits: number;
  misses: number;
  accuracy: number;
  bestStreak: number;
  recordedAt: string;
};
