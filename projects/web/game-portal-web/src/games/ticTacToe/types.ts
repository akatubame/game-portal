export type TicTacToeCell = "X" | "O" | null;

export type TicTacToePlayer = "X" | "O";

export type TicTacToeStatus = "idle" | "playing" | "finished";

export type TicTacToeDifficulty = "easy" | "normal" | "hard";

export type TicTacToeOutcome = "win" | "lose" | "draw" | null;

export type TicTacToeRecord = {
  wins: number;
  losses: number;
  draws: number;
  streak: number;
};
