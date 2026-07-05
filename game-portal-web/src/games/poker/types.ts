export type PokerSuit = "♠" | "♥" | "♦" | "♣";

export type PokerRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export type PokerCard = {
  suit: PokerSuit;
  rank: PokerRank;
};

export type PokerStatus = "idle" | "dealt" | "drawn";

export type PokerHandResult = {
  name: string;
  score: number;
};

export type PokerRecord = {
  plays: number;
  bestHand: string;
  bestScore: number;
};
