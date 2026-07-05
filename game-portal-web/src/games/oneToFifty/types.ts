export type OneToFiftyStatus = "idle" | "playing" | "cleared";

export type OneToFiftyCell = {
  id: number;
  value: number | null;
};

export type OneToFiftyRecord = {
  bestTimeMs: number | null;
  plays: number;
};
