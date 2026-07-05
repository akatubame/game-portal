export type FloodStatus = "idle" | "playing" | "cleared" | "failed";

export type FloodDifficulty = "small" | "normal" | "large";

export type FloodColor = "coral" | "gold" | "mint" | "sky" | "violet" | "rose";

export type FloodBest = {
  moves: number;
  difficulty: FloodDifficulty;
  recordedAt: string;
};
