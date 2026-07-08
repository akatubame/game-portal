export type WhackMoleStatus = "idle" | "playing" | "finished";

export type MoleHole = {
  id: number;
  kind: "empty" | "mole" | "golden" | "bomb";
};

export type WhackMoleResult = {
  score: number;
  hits: number;
  misses: number;
  bestCombo: number;
  recordedAt: string;
};
