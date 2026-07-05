export type PegStatus = "idle" | "playing" | "cleared" | "stuck";

export type PegCell = "peg" | "empty" | "invalid";

export type PegPosition = {
  row: number;
  column: number;
};

export type PegBest = {
  remaining: number;
  moves: number;
  recordedAt: string;
};
