export type SameGameStatus = "idle" | "playing" | "finished";

export type SameGameDifficulty = "small" | "normal" | "large";

export type SameGameColor = "coral" | "gold" | "mint" | "sky" | "violet";

export type SameGameCell = SameGameColor | null;

export type SameGameBest = {
  score: number;
  difficulty: SameGameDifficulty;
  recordedAt: string;
};
