export type HangmanStatus = "idle" | "playing" | "won" | "lost";

export type HangmanWord = {
  word: string;
  hint: string;
  category: string;
};

export type HangmanRecord = {
  wins: number;
  losses: number;
  streak: number;
};
