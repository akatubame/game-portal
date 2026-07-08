export type WordGuessStatus = "idle" | "playing" | "won" | "lost";

export type LetterState = "correct" | "present" | "absent";

export type WordGuessAttempt = {
  guess: string;
  result: LetterState[];
};

export type WordGuessRecord = {
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
};
