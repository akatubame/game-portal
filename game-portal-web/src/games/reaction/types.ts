export type ReactionStatus = "idle" | "waiting" | "ready" | "tooSoon" | "finished";

export type ReactionResult = {
  milliseconds: number;
  recordedAt: string;
};
