export type MemoryDifficultyId = "easy" | "normal" | "hard";

export type MemoryDifficulty = {
  id: MemoryDifficultyId;
  label: string;
  pairs: number;
  columns: number;
};

export type MemoryCard = {
  id: string;
  symbol: string;
  pairId: string;
  flipped: boolean;
  matched: boolean;
};

export type MemoryStatus = "ready" | "playing" | "cleared";
