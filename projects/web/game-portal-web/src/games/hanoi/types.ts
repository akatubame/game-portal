export type HanoiStatus = "idle" | "playing" | "solved";

export type HanoiPeg = number[];

export type HanoiBest = {
  moves: number;
  disks: number;
  recordedAt: string;
};
