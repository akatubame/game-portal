export type TypingStatus = "idle" | "playing" | "finished";

export type TypingPhrase = {
  id: string;
  text: string;
  reading: string;
};

export type TypingResult = {
  score: number;
  accuracy: number;
  correctChars: number;
  totalTyped: number;
  completedPhrases: number;
  recordedAt: string;
};
