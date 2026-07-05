export type BlackjackSuit = "♠" | "♥" | "♦" | "♣";

export type BlackjackRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export type BlackjackCard = {
  suit: BlackjackSuit;
  rank: BlackjackRank;
};

export type BlackjackStatus = "idle" | "playing" | "dealer" | "finished";

export type BlackjackOutcome = "win" | "lose" | "push" | "blackjack" | null;

export type BlackjackRecord = {
  wins: number;
  losses: number;
  pushes: number;
  chips: number;
};
