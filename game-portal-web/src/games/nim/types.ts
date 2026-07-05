export type NimStatus = "idle" | "playing" | "won" | "lost";

export type NimTurn = "player" | "cpu";

export type NimDifficulty = "easy" | "normal" | "hard";

export type NimSetup = "classic" | "long";

export type NimRecord = {
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
};
