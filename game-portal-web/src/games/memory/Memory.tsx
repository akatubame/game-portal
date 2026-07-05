import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { countMatchedPairs, createMemoryCards, isCleared, memoryDifficulties } from "./logic";
import type { MemoryCard, MemoryDifficultyId, MemoryStatus } from "./types";

type MemoryProps = {
  onBack: () => void;
};

function getDifficulty(id: MemoryDifficultyId) {
  return memoryDifficulties.find((difficulty) => difficulty.id === id) ?? memoryDifficulties[0];
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function Memory({ onBack }: MemoryProps) {
  const [difficultyId, setDifficultyId] = useState<MemoryDifficultyId>("easy");
  const difficulty = getDifficulty(difficultyId);
  const [cards, setCards] = useState<MemoryCard[]>(() => createMemoryCards(difficulty));
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<MemoryStatus>("ready");
  const [locked, setLocked] = useState(false);

  const matchedPairs = useMemo(() => countMatchedPairs(cards), [cards]);
  const bestScoreKey = `game-shelf-memory-best-${difficulty.id}`;
  const [bestMoves, setBestMoves] = useState<number | null>(() => {
    const stored = window.localStorage.getItem(bestScoreKey);
    return stored ? Number(stored) || null : null;
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(bestScoreKey);
    setBestMoves(stored ? Number(stored) || null : null);
  }, [bestScoreKey]);

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const timerId = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [status]);

  const resetGame = (nextDifficultyId = difficultyId) => {
    const nextDifficulty = getDifficulty(nextDifficultyId);
    setDifficultyId(nextDifficultyId);
    setCards(createMemoryCards(nextDifficulty));
    setSelectedCardIds([]);
    setMoves(0);
    setSeconds(0);
    setStatus("ready");
    setLocked(false);
  };

  const chooseCard = (cardId: string) => {
    if (locked || selectedCardIds.includes(cardId) || status === "cleared") {
      return;
    }

    const card = cards.find((item) => item.id === cardId);

    if (!card || card.matched || card.flipped) {
      return;
    }

    if (status === "ready") {
      setStatus("playing");
    }

    const nextSelectedIds = [...selectedCardIds, cardId];
    const nextCards = cards.map((item) => (item.id === cardId ? { ...item, flipped: true } : item));

    setCards(nextCards);
    setSelectedCardIds(nextSelectedIds);

    if (nextSelectedIds.length !== 2) {
      return;
    }

    const [firstId, secondId] = nextSelectedIds;
    const firstCard = nextCards.find((item) => item.id === firstId);
    const secondCard = nextCards.find((item) => item.id === secondId);
    const pairMatched = firstCard?.pairId === secondCard?.pairId;
    const nextMoves = moves + 1;

    setMoves(nextMoves);
    setLocked(true);

    window.setTimeout(
      () => {
        setCards((currentCards) => {
          const judgedCards = currentCards.map((item) => {
            if (!nextSelectedIds.includes(item.id)) {
              return item;
            }

            return pairMatched
              ? { ...item, flipped: true, matched: true }
              : { ...item, flipped: false, matched: false };
          });

          if (pairMatched && isCleared(judgedCards)) {
            setStatus("cleared");
            setBestMoves((currentBest) => {
              if (currentBest !== null && currentBest <= nextMoves) {
                return currentBest;
              }

              window.localStorage.setItem(bestScoreKey, String(nextMoves));
              return nextMoves;
            });
          }

          return judgedCards;
        });
        setSelectedCardIds([]);
        setLocked(false);
      },
      pairMatched ? 650 : 1000
    );
  };

  const statusText = {
    ready: "同じ絵柄のカードを2枚ずつ見つけましょう。最初の1枚でタイマーが始まります。",
    playing: "めくった2枚が同じならペア成立です。少ない手数でのクリアを目指しましょう。",
    cleared: "クリア！すべてのペアを見つけました。"
  }[status];

  return (
    <section className="puzzle-shell memory-shell" aria-labelledby="memory-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="memory-title">神経衰弱</h1>
          <p className="lead">{statusText}</p>
        </div>
        <div className="score-panel memory-stats" aria-label="神経衰弱の状態">
          <div>
            <span>Moves</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{formatTime(seconds)}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout memory-layout">
        <div
          className="memory-board"
          aria-label={`${difficulty.label}のカード盤面`}
          style={{ "--columns": difficulty.columns } as CSSProperties}
        >
          {cards.map((card) => {
            const visible = card.flipped || card.matched;

            return (
              <button
                className={`memory-card${visible ? " is-visible" : ""}${card.matched ? " is-matched" : ""}`}
                type="button"
                key={card.id}
                onClick={() => chooseCard(card.id)}
                aria-label={visible ? `${card.symbol}のカード` : "裏向きのカード"}
              >
                <span className="memory-card-front">{card.symbol}</span>
                <span className="memory-card-back">?</span>
              </button>
            );
          })}
        </div>

        <aside className="puzzle-side memory-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>カードを2枚めくり、同じ絵柄ならペアになります。すべてのペアを見つけるとクリアです。</p>
          </div>

          <label className="select-label">
            難易度
            <select value={difficultyId} onChange={(event) => resetGame(event.target.value as MemoryDifficultyId)}>
              {memoryDifficulties.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label} - {item.pairs}ペア
                </option>
              ))}
            </select>
          </label>

          <div className="memory-progress">
            <span>
              ペア: {matchedPairs}/{difficulty.pairs}
            </span>
            <span>ベスト手数: {bestMoves ?? "未記録"}</span>
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => resetGame()}>
              <RotateCcw aria-hidden="true" />
              リセット
            </button>
            <button className="ghost-button" type="button" onClick={onBack}>
              棚へ戻る
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
