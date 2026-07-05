import { RotateCcw, Shuffle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EMPTY_TILE, canMoveTile, isSolved, moveTile, shuffleBoard } from "./logic";
import type { SlideBoard, SlideStatus } from "./types";

type Slide15Props = {
  onBack: () => void;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function Slide15({ onBack }: Slide15Props) {
  const [board, setBoard] = useState<SlideBoard>(() => shuffleBoard());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<SlideStatus>("ready");
  const bestScoreKey = "game-shelf-slide15-best-moves";
  const bestTimeKey = "game-shelf-slide15-best-time";
  const [bestMoves, setBestMoves] = useState<number | null>(() => {
    const stored = window.localStorage.getItem(bestScoreKey);
    return stored ? Number(stored) || null : null;
  });
  const [bestTime, setBestTime] = useState<number | null>(() => {
    const stored = window.localStorage.getItem(bestTimeKey);
    return stored ? Number(stored) || null : null;
  });

  const movableIndexes = useMemo(() => getMovableIndexSet(board), [board]);

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

  const resetGame = () => {
    setBoard(shuffleBoard());
    setMoves(0);
    setSeconds(0);
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
      setStatus("playing");
    }

    if (isSolved(nextBoard)) {
      setStatus("cleared");
      const clearSeconds = Math.max(1, seconds);
      setBestMoves((currentBest) => {
        if (currentBest !== null && currentBest <= nextMoves) {
          return currentBest;
        }

        window.localStorage.setItem(bestScoreKey, String(nextMoves));
        return nextMoves;
      });
      setBestTime((currentBest) => {
        if (currentBest !== null && currentBest <= clearSeconds) {
          return currentBest;
        }

        window.localStorage.setItem(bestTimeKey, String(clearSeconds));
        return clearSeconds;
      });
    }
  };

  const statusText = {
    ready: "数字タイルを空白マスへスライドして、1から15まで順番に並べましょう。",
    playing: "空白マスの上下左右にあるタイルだけを動かせます。",
    cleared: "クリア！きれいに並びました。"
  }[status];

  return (
    <section className="puzzle-shell slide15-shell" aria-labelledby="slide15-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="slide15-title">15パズル</h1>
          <p className="lead">{statusText}</p>
        </div>
        <div className="score-panel slide15-stats" aria-label="15パズルの状態">
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
        <div className="slide15-board" aria-label="15パズルの盤面">
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
                aria-label={empty ? "空白マス" : `${value}のタイル${movable ? "、移動できます" : ""}`}
              >
                {empty ? "" : value}
              </button>
            );
          })}
        </div>

        <aside className="puzzle-side slide15-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              空白マスに隣り合う数字だけを動かせます。左上から右下へ、1から15まで順番に並べるとクリアです。
            </p>
          </div>

          <div className="slide15-progress">
            <span>ベスト手数: {bestMoves ?? "未記録"}</span>
            <span>ベストタイム: {bestTime === null ? "未記録" : formatTime(bestTime)}</span>
            <span>状態: {status === "ready" ? "開始前" : status === "playing" ? "挑戦中" : "クリア"}</span>
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={resetGame}>
              <Shuffle aria-hidden="true" />
              シャッフル
            </button>
            <button className="ghost-button" type="button" onClick={resetGame}>
              <RotateCcw aria-hidden="true" />
              リセット
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

function getMovableIndexSet(board: SlideBoard) {
  return new Set(board.map((_, index) => index).filter((index) => canMoveTile(board, index)));
}
