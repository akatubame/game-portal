export type ConnectFourCell = "red" | "yellow" | null;

export type ConnectFourPlayer = "red" | "yellow";

export type ConnectFourStatus = "idle" | "playing" | "finished";

export type ConnectFourDifficulty = "easy" | "normal" | "hard";

export type ConnectFourOutcome = "win" | "lose" | "draw" | null;

export type ConnectFourRecord = {
  wins: number;
  losses: number;
  draws: number;
  streak: number;
};

export type ConnectFourResult = {
  winner: ConnectFourPlayer;
  line: number[];
} | null;
