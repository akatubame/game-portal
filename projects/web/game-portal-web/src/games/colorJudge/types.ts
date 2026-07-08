export type ColorJudgeStatus = "idle" | "playing" | "finished";

export type ColorChoice = {
  name: string;
  label: string;
  value: string;
};

export type ColorQuestion = {
  textColor: ColorChoice;
  wordColor: ColorChoice;
};

export type ColorJudgeBest = {
  score: number;
  correct: number;
  mistakes: number;
  bestCombo: number;
  recordedAt: string;
};
