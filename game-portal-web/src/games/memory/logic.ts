import type { MemoryCard, MemoryDifficulty } from "./types";

const symbols = ["🍎", "🌙", "⭐", "🍀", "🔥", "💎", "🎲", "🎯", "🧩", "🐾", "🚀", "🎵"];

export const memoryDifficulties: MemoryDifficulty[] = [
  { id: "easy", label: "初級", pairs: 6, columns: 4 },
  { id: "normal", label: "中級", pairs: 8, columns: 4 },
  { id: "hard", label: "上級", pairs: 12, columns: 6 }
];

export function shuffleCards<T>(items: T[]): T[] {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

export function createMemoryCards(difficulty: MemoryDifficulty): MemoryCard[] {
  const selectedSymbols = symbols.slice(0, difficulty.pairs);
  const cards = selectedSymbols.flatMap((symbol, index) => [
    {
      id: `${index}-a`,
      symbol,
      pairId: `${index}`,
      flipped: false,
      matched: false
    },
    {
      id: `${index}-b`,
      symbol,
      pairId: `${index}`,
      flipped: false,
      matched: false
    }
  ]);

  return shuffleCards(cards);
}

export function isCleared(cards: MemoryCard[]): boolean {
  return cards.every((card) => card.matched);
}

export function countMatchedPairs(cards: MemoryCard[]): number {
  return cards.filter((card) => card.matched).length / 2;
}
