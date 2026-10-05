import { useStopwatch } from "../useStopwatch";
import { safeStorage } from "../../safeStorage";
import { RotateCcw, Shuffle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { isPlainRecord, readSavedProgress } from "../savedProgress";
import { EMPTY_TILE, canMoveTile, isSolved, moveTile, shuffleBoard } from "./logic";
import type { SlideBoard, SlideStatus } from "./types";

type Slide15Props = {
  onBack: () => void;
};

const PROGRESS_KEY = "game-shelf-progress-slide15-v1";
type SavedSlide15 = { version: 1; board: SlideBoard; moves: number; seconds: number };

function isSavedSlide15(value: unknown): value is SavedSlide15 {
  if (!isPlainRecord(value) || value.version !== 1 ||
      !Number.isSafeInteger(value.moves) || (value.moves as number) < 1 ||
      !Number.isSafeInteger(value.seconds) || (value.seconds as number) < 0) return false;
  const board = value.board;
  return Array.isArray(board) && board.length === 16 &&
    board.every((tile) => Number.isInteger(tile) && tile >= 0 && tile <= 15) &&
    new Set(board).size === 16 && !isSolved(board);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function Slide15({ onBack }: Slide15Props) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [saved] = useState(() => readSavedProgress(PROGRESS_KEY, isSavedSlide15));
  const [board, setBoard] = useState<SlideBoard>(() => saved?.board ?? shuffleBoard());
  const [moves, setMoves] = useState(saved?.moves ?? 0);
  const { seconds, startTimer, resetTimer, stopTimer } = useStopwatch(saved?.seconds ?? 0, saved !== null);
  const [status, setStatus] = useState<SlideStatus>(saved ? "playing" : "ready");
  const bestScoreKey = "game-shelf-slide15-best-moves";
  const bestTimeKey = "game-shelf-slide15-best-time";
  const [bestMoves, setBestMoves] = useState<number | null>(() => {
    const stored = safeStorage.getItem(bestScoreKey);
    return stored ? Number(stored) || null : null;
  });
  const [bestTime, setBestTime] = useState<number | null>(() => {
    const stored = safeStorage.getItem(bestTimeKey);
    return stored ? Number(stored) || null : null;
  });
  const ranking = useRanking({ gameId: "slide15-time", metricLabel: "Time", mode: "lower" });

  useEffect(() => {
    if (status === "playing") {
      safeStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, board, moves, seconds } satisfies SavedSlide15));
    } else if (status === "cleared") {
      safeStorage.removeItem(PROGRESS_KEY);
    }
  }, [board, moves, seconds, status]);

  const movableIndexes = useMemo(() => getMovableIndexSet(board), [board]);


  const resetGame = () => {
    safeStorage.removeItem(PROGRESS_KEY);
    setBoard(shuffleBoard());
    setMoves(0);
    resetTimer();
    setStatus("ready");
  };

  const moveByIndex = (tileIndex: number) => {
    if (status === "cleared" || !canMoveTile(board, tileIndex)) {
      return;
    }

    const nextBoard = moveTile(board, tileIndex);
    const nextMoves = moves + 1;

    setBoard(nextBoard);
    setMoves(nextMoves);

    if (status === "ready") {
      startTimer();
      setStatus("playing");
    }

    if (isSolved(nextBoard)) {
      setStatus("cleared");
      const clearSeconds = stopTimer(1);

      setBestMoves((currentBest) => {
        if (currentBest !== null && currentBest <= nextMoves) {
          return currentBest;
        }

        safeStorage.setItem(bestScoreKey, String(nextMoves));
        return nextMoves;
      });
      setBestTime((currentBest) => {
        if (currentBest !== null && currentBest <= clearSeconds) {
          return currentBest;
        }

        safeStorage.setItem(bestTimeKey, String(clearSeconds));
        return clearSeconds;
      });
    }
  };

  const statusText = (isEnglish ? {
    ready: "Slide the numbered tiles into the empty space and arrange them from 1 to 15.",
    playing: "Only tiles next to the empty space can move.",
    cleared: "Solved! All the tiles are in order."
  } : {
    ready: "数字タイルを空白マスへスライドして、1から15まで順番に並べましょう。",
    playing: "空白マスの上下左右にあるタイルだけを動かせます。",
    cleared: "クリア！きれいに並びました。"
  })[status];

  return (
    <section className="puzzle-shell slide15-shell" aria-labelledby="slide15-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="slide15-title">{isEnglish ? "Fifteen Puzzle" : "15パズル"}</h1>
          <p className="lead">{statusText}</p>
        </div>
        <div className="score-panel slide15-stats" aria-label={isEnglish ? "Fifteen Puzzle status" : "15パズルの状態"}>
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

      <div className="puzzle-layout slide15-layout">
        <div className="slide15-board" aria-label={isEnglish ? "Fifteen Puzzle board" : "15パズルの盤面"}>
          {board.map((value, index) => {
            const empty = value === EMPTY_TILE;
            const movable = movableIndexes.has(index);

            return (
              <button
                className={`slide15-tile${empty ? " is-empty" : ""}${movable ? " is-movable" : ""}`}
                type="button"
                key={`${value}-${index}`}
                onClick={() => moveByIndex(index)}
                disabled={empty || status === "cleared"}
                aria-label={empty ? (isEnglish ? "Empty space" : "空白マス") : (isEnglish ? `Tile ${value}${movable ? ", movable" : ""}` : `${value}のタイル${movable ? "、移動できます" : ""}`)}
              >
                {empty ? "" : value}
              </button>
            );
          })}
        </div>

        <aside className="puzzle-side slide15-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to Play" : "遊び方"}</h2>
            <p>
              {isEnglish
                ? "Move tiles next to the empty space. Arrange 1 through 15 from top left to bottom right."
                : "空白マスに隣り合う数字だけを動かせます。左上から右下へ、1から15まで順番に並べるとクリアです。"}
            </p>
            <p>{isEnglish ? "Progress is saved on this browser. The timer pauses while the page is closed." : "途中の盤面は、このブラウザに保存されます。ページを閉じている間、時間は進みません。"}</p>
          </div>

          <div className="slide15-progress">
            <span>{isEnglish ? "Fewest moves" : "ベスト手数"}: {bestMoves ?? (isEnglish ? "No record" : "未記録")}</span>
            <span>{isEnglish ? "Best time" : "ベストタイム"}: {bestTime === null ? (isEnglish ? "No record" : "未記録") : formatTime(bestTime)}</span>
            <span>{isEnglish ? "Status" : "状態"}: {status === "ready" ? (isEnglish ? "Ready" : "開始前") : status === "playing" ? (isEnglish ? "Playing" : "挑戦中") : (isEnglish ? "Solved" : "クリア")}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "cleared" ? { score: seconds, display: formatTime(seconds), meta: isEnglish ? `${moves} moves` : `${moves}手` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={resetGame}>
              <Shuffle aria-hidden="true" />
              {isEnglish ? "Shuffle" : "シャッフル"}
            </button>
            <button className="ghost-button" type="button" onClick={resetGame}>
              <RotateCcw aria-hidden="true" />
              {isEnglish ? "Reset" : "リセット"}
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            {isEnglish ? "Back to shelf" : "棚へ戻る"}
          </button>
        </aside>
      </div>
    </section>
  );
}

function getMovableIndexSet(board: SlideBoard) {
  return new Set(board.map((_, index) => index).filter((index) => canMoveTile(board, index)));
}
