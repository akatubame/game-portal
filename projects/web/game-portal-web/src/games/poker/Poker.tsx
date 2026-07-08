import { CircleDollarSign, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { PokerCard, PokerHandResult, PokerRank, PokerRecord, PokerStatus, PokerSuit } from "./types";

type PokerProps = {
  onBack: () => void;
};

const RECORD_KEY = "game-shelf-poker-record";
const SUITS: PokerSuit[] = ["♠", "♥", "♦", "♣"];
const RANKS: PokerRank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RANK_VALUES: Record<PokerRank, number> = {
  A: 14,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13
};

const handTable: PokerHandResult[] = [
  { name: "ロイヤルフラッシュ", score: 900 },
  { name: "ストレートフラッシュ", score: 800 },
  { name: "フォーカード", score: 700 },
  { name: "フルハウス", score: 600 },
  { name: "フラッシュ", score: 500 },
  { name: "ストレート", score: 400 },
  { name: "スリーカード", score: 300 },
  { name: "ツーペア", score: 200 },
  { name: "ワンペア", score: 100 },
  { name: "ハイカード", score: 0 }
];

function readRecord(): PokerRecord {
  const stored = window.localStorage.getItem(RECORD_KEY);
  return stored ? (JSON.parse(stored) as PokerRecord) : { plays: 0, bestHand: "なし", bestScore: 0 };
}

function createDeck(): PokerCard[] {
  const deck = SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}

function draw(deck: PokerCard[], count: number) {
  return {
    cards: deck.slice(0, count),
    nextDeck: deck.slice(count)
  };
}

function isStraight(values: number[]) {
  const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);

  if (uniqueValues.length !== 5) {
    return false;
  }

  const isWheel = uniqueValues.join(",") === "2,3,4,5,14";

  if (isWheel) {
    return true;
  }

  return uniqueValues[4] - uniqueValues[0] === 4;
}

function evaluateHand(hand: PokerCard[]): PokerHandResult {
  if (hand.length !== 5) {
    return { name: "未判定", score: 0 };
  }

  const values = hand.map((card) => RANK_VALUES[card.rank]);
  const counts = hand.reduce<Partial<Record<PokerRank, number>>>((acc, card) => {
    acc[card.rank] = (acc[card.rank] ?? 0) + 1;
    return acc;
  }, {});
  const countValues = Object.values(counts).sort((a, b) => b - a);
  const flush = hand.every((card) => card.suit === hand[0].suit);
  const straight = isStraight(values);
  const sortedUnique = Array.from(new Set(values)).sort((a, b) => a - b);
  const royal = flush && sortedUnique.join(",") === "10,11,12,13,14";

  if (royal) return handTable[0];
  if (flush && straight) return handTable[1];
  if (countValues[0] === 4) return handTable[2];
  if (countValues[0] === 3 && countValues[1] === 2) return handTable[3];
  if (flush) return handTable[4];
  if (straight) return handTable[5];
  if (countValues[0] === 3) return handTable[6];
  if (countValues[0] === 2 && countValues[1] === 2) return handTable[7];
  if (countValues[0] === 2) return handTable[8];
  return handTable[9];
}

function cardKey(card: PokerCard, index: number) {
  return `${card.suit}-${card.rank}-${index}`;
}

export function Poker({ onBack }: PokerProps) {
  const [deck, setDeck] = useState<PokerCard[]>(() => createDeck());
  const [hand, setHand] = useState<PokerCard[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [status, setStatus] = useState<PokerStatus>("idle");
  const [record, setRecord] = useState<PokerRecord>(() => readRecord());
  const [message, setMessage] = useState("5枚のカードを配り、交換したいカードを選んで役を作りましょう。");

  const result = useMemo(() => evaluateHand(hand), [hand]);
  const ranking = useRanking({ gameId: "poker-hand-score", metricLabel: "Score", mode: "higher" });
  const selectedCount = selectedIndexes.length;

  const deal = () => {
    const nextDeck = createDeck();
    const drawn = draw(nextDeck, 5);

    setDeck(drawn.nextDeck);
    setHand(drawn.cards);
    setSelectedIndexes([]);
    setStatus("dealt");
    setMessage("交換したいカードを選んでください。もう一度カードを押すと選択解除できます。");
  };

  const toggleCard = (index: number) => {
    if (status !== "dealt") {
      return;
    }

    setSelectedIndexes((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]));
  };

  const drawSelected = () => {
    if (status !== "dealt") {
      return;
    }

    const drawn = draw(deck, selectedCount);
    let replacementIndex = 0;
    const nextHand = hand.map((card, index) => {
      if (!selectedIndexes.includes(index)) {
        return card;
      }

      const nextCard = drawn.cards[replacementIndex];
      replacementIndex += 1;
      return nextCard;
    });
    const nextResult = evaluateHand(nextHand);
    const nextRecord = {
      plays: record.plays + 1,
      bestHand: nextResult.score > record.bestScore ? nextResult.name : record.bestHand,
      bestScore: Math.max(record.bestScore, nextResult.score)
    };

    setDeck(drawn.nextDeck);
    setHand(nextHand);
    setSelectedIndexes([]);
    setStatus("drawn");
    setRecord(nextRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setMessage(selectedCount === 0 ? `交換なしで勝負。役は「${nextResult.name}」です。` : `${selectedCount}枚交換しました。役は「${nextResult.name}」です。`);
  };

  const resetRecord = () => {
    const emptyRecord = { plays: 0, bestHand: "なし", bestScore: 0 };
    setRecord(emptyRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(emptyRecord));
  };

  const renderCard = (card: PokerCard, index: number) => {
    const isRed = card.suit === "♥" || card.suit === "♦";
    const isSelected = selectedIndexes.includes(index);

    return (
      <button className={`poker-card${isRed ? " is-red" : ""}${isSelected ? " is-selected" : ""}`} key={cardKey(card, index)} type="button" onClick={() => toggleCard(index)}>
        <span>{card.rank}</span>
        <strong>{card.suit}</strong>
        {status === "dealt" && <em>{isSelected ? "交換" : "保持"}</em>}
      </button>
    );
  };

  return (
    <section className="puzzle-shell poker-shell" aria-labelledby="poker-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">CARD GAME / INTERNAL GAME</p>
          <h1 id="poker-title">ポーカー</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel poker-score" aria-label="ポーカーの記録">
          <div>
            <span>Hand</span>
            <strong>{status === "idle" ? "--" : result.name}</strong>
          </div>
          <div>
            <span>Score</span>
            <strong>{status === "idle" ? "--" : result.score}</strong>
          </div>
          <div>
            <span>Play</span>
            <strong>{record.plays}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout poker-layout">
        <div className="poker-table" aria-label="ポーカーの手札">
          <div className="poker-hand">{hand.length === 0 ? <div className="poker-placeholder">DEALを押してカードを配ります</div> : hand.map(renderCard)}</div>
          <div className="poker-result" aria-live="polite">
            {status === "drawn" ? result.name : status === "dealt" ? `${selectedCount}枚を交換予定` : "FIVE CARD DRAW"}
          </div>
        </div>

        <aside className="puzzle-side poker-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              5枚の手札から交換したいカードを選び、「選んだカードを交換」を押します。交換は1回だけです。
              交換後に役が確定し、最高役が保存されます。
            </p>
          </div>

          <div className="poker-record">
            <div>
              <Trophy aria-hidden="true" />
              <span>Best Hand</span>
              <strong>{record.bestHand}</strong>
            </div>
            <div>
              <CircleDollarSign aria-hidden="true" />
              <span>Best Score</span>
              <strong>{record.bestScore}</strong>
            </div>
          </div>

          <div className="poker-hand-table">
            {handTable.slice(0, 6).map((item) => (
              <span key={item.name}>
                {item.name}
                <strong>{item.score}</strong>
              </span>
            ))}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "drawn" ? { score: result.score, display: `${result.score}点`, meta: result.name } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={deal}>
              <Sparkles aria-hidden="true" />
              配る
            </button>
            <button className="ghost-button" type="button" onClick={drawSelected} disabled={status !== "dealt"}>
              選んだカードを交換
            </button>
            <button className="ghost-button" type="button" onClick={resetRecord}>
              <RotateCcw aria-hidden="true" />
              記録リセット
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            棚へ戻る
          </button>
        </aside>
      </div>
    </section>
  );
}
