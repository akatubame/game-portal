export type LightsOutDifficultyId = "easy" | "normal" | "hard";

export type LightsOutDifficulty = {
  id: LightsOutDifficultyId;
  label: string;
  size: number;
  shuffleMoves: number;
};

export type LightsOutBoard = boolean[][];

export type LightsOutStatus = "ready" | "playing" | "cleared";
