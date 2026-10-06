import { useStopwatch } from "../useStopwatch";
import { useI18n } from "../../i18n";
import { safeStorage } from "../../safeStorage";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { RankingPanel, useRanking } from "../ranking";
import { isPlainRecord, readSavedProgress } from "../savedProgress";
import { countMatchedPairs, createMemoryCards, isCleared, memoryDifficulties, memorySymbols } from "./logic";
import type { MemoryCard, MemoryDifficultyId, MemoryStatus } from "./types";

type MemoryProps = {
  onBack: () => void;
};

const PROGRESS_KEY = "game-shelf-progress-memory-v1";
type SavedMemory = { version: 1; difficultyId: MemoryDifficultyId; cards: MemoryCard[]; selectedCardId: string | null; moves: number; seconds: number };

function isSavedMemory(value: unknown): value is SavedMemory {
  if (!isPlainRecord(value) || value.version !== 1 || typeof value.difficultyId !== "string" ||
      !Number.isSafeInteger(value.moves) || (value.moves as number) < 0 || (value.moves as number) > 10000 ||
      !Number.isSafeInteger(value.seconds) || (value.seconds as number) < 0 ||
      !Array.isArray(value.cards) || (value.selectedCardId !== null && typeof value.selectedCardId !== "string")) return false;
  const difficulty = memoryDifficulties.find((item) => item.id === value.difficultyId);
  if (!difficulty || value.cards.length !== difficulty.pairs * 2) return false;
  const ids = new Set<string>();
  const pairFlags: Record<string, boolean[]> = {};
  const flipped: string[] = [];
  for (const card of value.cards) {
    if (!isPlainRecord(card) || typeof card.id !== "string" || typeof card.pairId !== "string" ||
        typeof card.symbol !== "string" || typeof card.flipped !== "boolean" || typeof card.matched !== "boolean" ||
        !/^(0|[1-9]\d*)-[ab]$/.test(card.id) || card.pairId !== card.id.split("-")[0] ||
        Number(card.pairId) >= difficulty.pairs || card.symbol !== memorySymbols[Number(card.pairId)] ||
        ids.has(card.id) || (card.matched && !card.flipped)) return false;
    ids.add(card.id);
    (pairFlags[card.pairId] ??= []).push(card.matched);
    if (card.flipped && !card.matched) flipped.push(card.id);
  }
  if (Object.values(pairFlags).length !== difficulty.pairs ||
      Object.values(pairFlags).some((flags) => flags.length !== 2 || flags[0] !== flags[1]) ||
      flipped.length !== (value.selectedCardId === null ? 0 : 1) ||
      (flipped.length === 1 && flipped[0] !== value.selectedCardId) ||
      Object.values(pairFlags).every((flags) => flags[0])) return false;
  const matchedPairs = Object.values(pairFlags).filter((flags) => flags[0]).length;
  return (value.moves as number) >= matchedPairs && ((value.moves as number) > 0 || value.selectedCardId !== null);
}

function getDifficulty(id: MemoryDifficultyId) {
  return memoryDifficulties.find((difficulty) => difficulty.id === id) ?? memoryDifficulties[0];
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function Memory({ onBack }: MemoryProps) {
  const { language } = useI18n();
  const en = language === "en";
  const label = (id: MemoryDifficultyId) => en
    ? ({ easy: "Easy", normal: "Normal", hard: "Hard" })[id] : getDifficulty(id).label;
  const [saved] = useState(() => readSavedProgress(PROGRESS_KEY, isSavedMemory));
  const [difficultyId, setDifficultyId] = useState<MemoryDifficultyId>(saved?.difficultyId ?? "easy");
  const difficulty = getDifficulty(difficultyId);
  const [cards, setCards] = useState<MemoryCard[]>(() => saved?.cards.map((card) => ({ ...card })) ?? createMemoryCards(difficulty));
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(saved?.selectedCardId ? [saved.selectedCardId] : []);
  const [moves, setMoves] = useState(saved?.moves ?? 0);
  const { seconds, startTimer, resetTimer, stopTimer } = useStopwatch(saved?.seconds ?? 0, saved !== null);
  const [status, setStatus] = useState<MemoryStatus>(saved ? "playing" : "ready");
  const [locked, setLocked] = useState(false);
  const judgingTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(judgingTimer.current), []);

  useEffect(() => {
    if (status === "playing") {
      const pending = locked && selectedCardIds.length === 2;
      const firstId = selectedCardIds[0];
      const secondId = selectedCardIds[1];
      const stableCards = pending ? cards.map((card) => card.id === secondId ? { ...card, flipped: false } : card) : cards;
      safeStorage.setItem(PROGRESS_KEY, JSON.stringify({
        version: 1, difficultyId, cards: stableCards,
        selectedCardId: pending ? firstId : (selectedCardIds[0] ?? null),
        moves: pending ? moves - 1 : moves, seconds
      } satisfies SavedMemory));
    } else if (status === "cleared") {
      safeStorage.removeItem(PROGRESS_KEY);
    }
  }, [cards, difficultyId, locked, moves, seconds, selectedCardIds, status]);

  const matchedPairs = useMemo(() => countMatchedPairs(cards), [cards]);
  const bestScoreKey = `game-shelf-memory-best-${difficulty.id}`;
  const bestTimeKey = `game-shelf-memory-best-time-${difficulty.id}`;
  const ranking = useRanking({ gameId: `memory-${difficulty.id}`, metricLabel: "Time", mode: "lower" });
  const [bestMoves, setBestMoves] = useState<number | null>(() => {
    const stored = safeStorage.getItem(bestScoreKey);
    return stored ? Number(stored) || null : null;
  });
  const [bestTime, setBestTime] = useState<number | null>(() => {
    const stored = safeStorage.getItem(bestTimeKey);
    return stored ? Number(stored) || null : null;
  });

  useEffect(() => {
    const stored = safeStorage.getItem(bestScoreKey);
    setBestMoves(stored ? Number(stored) || null : null);
    const storedTime = safeStorage.getItem(bestTimeKey);
    setBestTime(storedTime ? Number(storedTime) || null : null);
  }, [bestScoreKey, bestTimeKey]);


  const resetGame = (nextDifficultyId = difficultyId) => {
    safeStorage.removeItem(PROGRESS_KEY);
    window.clearTimeout(judgingTimer.current);
    judgingTimer.current = undefined;
    const nextDifficulty = getDifficulty(nextDifficultyId);
    setDifficultyId(nextDifficultyId);
    setCards(createMemoryCards(nextDifficulty));
    setSelectedCardIds([]);
    setMoves(0);
    resetTimer();
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
      startTimer();
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

    judgingTimer.current = window.setTimeout(
      () => {
        judgingTimer.current = undefined;
        const judgedCards = nextCards.map((item) => {
          if (!nextSelectedIds.includes(item.id)) {
            return item;
          }

          return pairMatched
            ? { ...item, flipped: true, matched: true }
            : { ...item, flipped: false, matched: false };
        });

        if (pairMatched && isCleared(judgedCards)) {
          setStatus("cleared");
          const clearSeconds = stopTimer(1);

          if (bestMoves === null || nextMoves < bestMoves) {
            safeStorage.setItem(bestScoreKey, String(nextMoves));
            setBestMoves(nextMoves);
          }
          if (bestTime === null || clearSeconds < bestTime) {
            safeStorage.setItem(bestTimeKey, String(clearSeconds));
            setBestTime(clearSeconds);
          }
        }

        setCards(judgedCards);
        setSelectedCardIds([]);
        setLocked(false);
      },
      pairMatched ? 650 : 1000
    );
  };

  const statusText = (en ? {
    ready: "Find matching pairs. The timer starts when you turn over your first card.",
    playing: "Two cards with the same picture make a pair. Try to finish in fewer moves.",
    cleared: "Cleared! You found every pair."
  } : {
    ready: "同じ絵柄のカードを2枚ずつ見つけましょう。最初の1枚でタイマーが始まります。",
    playing: "めくった2枚が同じならペア成立です。少ない手数でのクリアを目指しましょう。",
    cleared: "クリア！すべてのペアを見つけました。"
  })[status];

  return (
    <section className="puzzle-shell memory-shell" aria-labelledby="memory-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="memory-title">{en ? "Memory" : "神経衰弱"}</h1>
          <p className="lead">{statusText}</p>
        </div>
        <div className="score-panel memory-stats" aria-label={en ? "Memory game status" : "神経衰弱の状態"}>
          <div>
            <span>Moves</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{formatTime(seconds)}</strong>
          </div>
          <div>
            <span>Best</span>
            <strong>{bestTime === null ? "--" : formatTime(bestTime)}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout memory-layout">
        <div
          className="memory-board"
          aria-label={en ? `${label(difficulty.id)} card board` : `${difficulty.label}のカード盤面`}
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
                aria-label={visible ? (en ? `${card.symbol} card` : `${card.symbol}のカード`) : (en ? "Face-down card" : "裏向きのカード")}
              >
                <span className="memory-card-front">{card.symbol}</span>
                <span className="memory-card-back">?</span>
              </button>
            );
          })}
        </div>

        <aside className="puzzle-side memory-side">
          <div className="rule-card">
            <h2>{en ? "How to Play" : "遊び方"}</h2>
            <p>{en ? "Turn over two cards. Matching pictures form a pair. Find every pair to clear the game." : "カードを2枚めくり、同じ絵柄ならペアになります。すべてのペアを見つけるとクリアです。"}</p>
          </div>

          <label className="select-label">
            {en ? "Difficulty" : "難易度"}
            <select value={difficultyId} onChange={(event) => resetGame(event.target.value as MemoryDifficultyId)}>
              {memoryDifficulties.map((item) => (
                <option value={item.id} key={item.id}>
                  {label(item.id)} - {item.pairs}{en ? " pairs" : "ペア"}
                </option>
              ))}
            </select>
          </label>

          <div className="memory-progress">
            <span>
              {en ? "Pairs" : "ペア"}: {matchedPairs}/{difficulty.pairs}
            </span>
            <span>{en ? "Best moves" : "ベスト手数"}: {bestMoves ?? (en ? "No record" : "未記録")}</span>
            <span>{en ? "Best time" : "ベストタイム"}: {bestTime === null ? (en ? "No record" : "未記録") : formatTime(bestTime)}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "cleared" ? { score: seconds, display: formatTime(seconds), meta: `${difficulty.label} / ${moves}手` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => resetGame()}>
              <RotateCcw aria-hidden="true" />
              {en ? "Reset" : "リセット"}
            </button>
            <button className="ghost-button" type="button" onClick={onBack}>
              {en ? "Back to shelf" : "棚へ戻る"}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
