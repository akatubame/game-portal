import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import { addRandomTile, canMove, createInitialBoard, hasWon, moveBoard } from "./logic";
import type { Board, Direction } from "./types";

const BEST_SCORE_KEY = "game-shelf-2048-best-score";

type Puzzle2048Props = {
  onBack: () => void;
};

function readBestScore() {
  const stored = window.localStorage.getItem(BEST_SCORE_KEY);
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
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => readBestScore());
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(bestScore);
  const ranking = useRanking({ gameId: "2048-score", metricLabel: "Score", mode: "higher" });

  const statusText = useMemo(() => {
    if (gameOver) {
      return "動ける手がなくなりました。もう一度挑戦できます。";
    }

    if (won) {
      return "2048達成！このままさらに大きな数字も狙えます。";
    }

    return "矢印キー、WASD、またはスワイプでタイルを動かします。";
  }, [gameOver, won]);

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setScore(0);
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

      setBoard((currentBoard) => {
        const moved = moveBoard(currentBoard, direction);

        if (!moved.moved) {
          return currentBoard;
        }

        const nextBoard = addRandomTile(moved.board);
        const nextScore = scoreRef.current + moved.scoreGain;

        scoreRef.current = nextScore;
        setScore(nextScore);

        if (nextScore > bestScoreRef.current) {
          bestScoreRef.current = nextScore;
          setBestScore(nextScore);
          window.localStorage.setItem(BEST_SCORE_KEY, String(nextScore));
        }

        if (hasWon(nextBoard)) {
          setWon(true);
        }

        if (!canMove(nextBoard)) {
          setGameOver(true);
        }

        return nextBoard;
      });
    },
    [gameOver]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
    <section className="puzzle-shell" aria-labelledby="puzzle-2048-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="puzzle-2048-title">2048</h1>
          <p className="lead">{statusText}</p>
        </div>
        <div className="score-panel" aria-label="スコア">
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
          aria-label="2048の盤面"
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
            <h2>遊び方</h2>
            <p>
              同じ数字のタイル同士をぶつけると合体します。盤面が埋まる前に、できるだけ大きな数字を育ててください。
            </p>
          </div>
          <div className="control-row">
            <button className="primary-button" type="button" onClick={resetGame}>
              <RotateCcw aria-hidden="true" />
              最初から
            </button>
            <button className="ghost-button" type="button" onClick={onBack}>
              棚へ戻る
            </button>
          </div>
          <RankingPanel
            ranking={ranking}
            pendingScore={score > 0 ? { score, display: `${score}点`, meta: gameOver ? "Game Over" : won ? "2048達成" : "途中記録" } : null}
          />
        </aside>
      </div>
    </section>
  );
}
