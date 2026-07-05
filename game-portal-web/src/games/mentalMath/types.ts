export type MathOperator = "+" | "-" | "×";

export type MathProblem = {
  left: number;
  right: number;
  operator: MathOperator;
  answer: number;
};

export type MentalMathStatus = "idle" | "playing" | "finished";

export type MentalMathResult = {
  score: number;
  solved: number;
  mistakes: number;
  bestStreak: number;
  recordedAt: string;
};
