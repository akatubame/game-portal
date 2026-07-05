export type YachtStatus = "idle" | "playing" | "finished";

export type YachtCategoryId =
  | "ones"
  | "twos"
  | "threes"
  | "fours"
  | "fives"
  | "sixes"
  | "threeKind"
  | "fourKind"
  | "fullHouse"
  | "smallStraight"
  | "largeStraight"
  | "yacht"
  | "chance";

export type YachtScoreSheet = Partial<Record<YachtCategoryId, number>>;

export type YachtBest = {
  score: number;
  recordedAt: string;
};
