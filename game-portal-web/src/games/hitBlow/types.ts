export type HitBlowStatus = "idle" | "playing" | "cleared" | "failed";

export type HitBlowDifficulty = "easy" | "normal" | "hard";

export type HitBlowGuess = {
  value: string;
  hits: number;
  blows: number;
};

export type HitBlowBest = {
  attempts: number;
  seconds: number;
  difficulty: HitBlowDifficulty;
  recordedAt: string;
};
