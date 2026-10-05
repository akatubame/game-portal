import { safeStorage } from "../../safeStorage";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { isPlainRecord, readSavedProgress } from "../savedProgress";
import { addRandomTile, canMove, createInitialBoard, hasWon, moveBoard } from "./logic";
import type { Board, Direction } from "./types";

const BEST_SCORE_KEY = "game-shelf-2048-best-score";
const PROGRESS_KEY = "game-shelf-progress-2048-v1";

type Saved2048 = { version: 1; board: Board; score: number; moves: number };

function isSaved2048(value: unknown): value is Saved2048 {
  if (!isPlainRecord(value) || value.version !== 1 ||
      !Number.isSafeInteger(value.score) || (value.score as number) < 0 ||
      !Number.isSafeInteger(value.moves) || (value.moves as number) < 1) return false;
  const board = value.board;
  return Array.isArray(board) && board.length === 4 && board.every((row) =>
    Array.isArray(row) && row.length === 4 && row.every((tile) =>
      Number.isSafeInteger(tile) && (tile === 0 || (tile >= 2 && Number.isInteger(Math.log2(tile))))
    )
  );
}

type Puzzle2048Props = {
  onBack: () => void;
};

function readBestScore() {
  const stored = safeStorage.getItem(BEST_SCORE_KEY);
  return stored ? Number(stored) || 0 : 0;
}

function getDirectionFromKey(key: string): Direction | undefined {
  const directions: Record<string, Direction> = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowRight: "right",
    d: "right",
    D: "right",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left"
  };

  return directions[key];
}

export function Puzzle2048({ onBack }: Puzzle2048Props) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [saved] = useState(() => readSavedProgress(PROGRESS_KEY, isSaved2048));
  const [board, setBoard] = useState<Board>(() => saved?.board ?? createInitialBoard());
  const [score, setScore] = useState(saved?.score ?? 0);
  const [moves, setMoves] = useState(saved?.moves ?? 0);
  const [bestScore, setBestScore] = useState(() => readBestScore());
  const [won, setWon] = useState(() => hasWon(saved?.board ?? board));
  const [gameOver, setGameOver] = useState(() => !canMove(saved?.board ?? board));
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const scoreRef = useRef(0);
  const boardRef = useRef(board);
  const bestScoreRef = useRef(bestScore);
  const ranking = useRanking({ gameId: "2048-score", metricLabel: "Score", mode: "higher" });

  useEffect(() => {
    if (moves > 0) safeStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, board, score, moves } satisfies Saved2048));
  }, [board, score, moves]);

  const statusText = useMemo(() => {
    if (gameOver) {
      return isEnglish ? "No moves left. Try again!" : "動ける手がなくなりました。もう一度挑戦できます。";
    }

    if (won) {
      return isEnglish ? "You reached 2048! Keep going for an even larger tile." : "2048達成！このままさらに大きな数字も狙えます。";
    }

    return isEnglish ? "Move tiles with the arrow keys, WASD, or a swipe." : "矢印キー、WASD、またはスワイプでタイルを動かします。";
  }, [gameOver, won, isEnglish]);

  const resetGame = useCallback(() => {
    safeStorage.removeItem(PROGRESS_KEY);
    const nextBoard = createInitialBoard();
    boardRef.current = nextBoard;
    setBoard(nextBoard);
    setScore(0);
    setMoves(0);
    scoreRef.current = 0;
    setWon(false);
    setGameOver(false);
  }, []);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    bestScoreRef.current = bestScore;
  }, [bestScore]);

  const makeMove = useCallback(
    (direction: Direction) => {
      if (gameOver) {
        return;
      }

      {
        const currentBoard = boardRef.current;
        const moved = moveBoard(currentBoard, direction);

        if (!moved.moved) {
          return;
        }

        const nextBoard = addRandomTile(moved.board);
        const nextScore = scoreRef.current + moved.scoreGain;

        scoreRef.current = nextScore;
        setScore(nextScore);
        setMoves((current) => current + 1);

        if (nextScore > bestScoreRef.current) {
          bestScoreRef.current = nextScore;
          setBestScore(nextScore);
          safeStorage.setItem(BEST_SCORE_KEY, String(nextScore));
        }

        if (hasWon(nextBoard)) {
          setWon(true);
        }

        if (!canMove(nextBoard)) {
          setGameOver(true);
        }

        boardRef.current = nextBoard;
        setBoard(nextBoard);
      }
    },
    [gameOver]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.isComposing || (target instanceof HTMLElement &&
          (target.isContentEditable || target.closest("input, textarea, select, button")))) return;
      const direction = getDirectionFromKey(event.key);

      if (!direction) {
        return;
      }

      event.preventDefault();
      makeMove(direction);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [makeMove]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];

    if (!start) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) {
      return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      makeMove(deltaX > 0 ? "right" : "left");
    } else {
      makeMove(deltaY > 0 ? "down" : "up");
    }

    touchStartRef.current = null;
  };

  return (
    <section className="puzzle-shell" aria-labelledby="puzzle-2048-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="puzzle-2048-title">2048</h1>
          <p className="lead">{statusText}</p>
        </div>
        <div className="score-panel" aria-label={isEnglish ? "Score" : "スコア"}>
          <div>
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>Best</span>
            <strong>{bestScore}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout">
        <div
          className="board-2048"
          aria-label={isEnglish ? "2048 board" : "2048の盤面"}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {board.flatMap((row, rowIndex) =>
            row.map((value, columnIndex) => (
              <div
                className={`tile-2048${value === 0 ? " is-empty" : ""}`}
                data-value={value || undefined}
                key={`${rowIndex}-${columnIndex}`}
              >
                {value || ""}
              </div>
            ))
          )}
        </div>

        <aside className="puzzle-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to Play" : "遊び方"}</h2>
            <p>
              {isEnglish
                ? "Slide equal tiles together to merge them. Build the largest tile you can before the board fills up."
                : "同じ数字のタイル同士をぶつけると合体します。盤面が埋まる前に、できるだけ大きな数字を育ててください。"}
            </p>
            <p>{isEnglish ? "Your current board is saved automatically on this browser." : "途中の盤面は、このブラウザに自動保存されます。"}</p>
          </div>
          <div className="control-row">
            <button className="primary-button" type="button" onClick={resetGame}>
              <RotateCcw aria-hidden="true" />
              {isEnglish ? "New game" : "最初から"}
            </button>
            <button className="ghost-button" type="button" onClick={onBack}>
              {isEnglish ? "Back to shelf" : "棚へ戻る"}
            </button>
          </div>
          <RankingPanel
            ranking={ranking}
            pendingScore={score > 0 ? { score, display: isEnglish ? `${score} pts` : `${score}点`, meta: gameOver ? "Game Over" : won ? (isEnglish ? "Reached 2048" : "2048達成") : (isEnglish ? "Current score" : "途中記録") } : null}
          />
        </aside>
      </div>
    </section>
  );
}
