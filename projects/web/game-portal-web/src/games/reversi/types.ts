export type ReversiDisc = "black" | "white" | null;

export type ReversiPlayer = "black" | "white";

export type ReversiDifficulty = "easy" | "normal" | "hard";

export type ReversiStatus = "idle" | "playing" | "finished";

export type ReversiOutcome = "win" | "lose" | "draw" | null;

export type ReversiMove = {
  index: number;
  flips: number[];
};

export type ReversiRecord = {
  wins: number;
  losses: number;
  draws: number;
};
