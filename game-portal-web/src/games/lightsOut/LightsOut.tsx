import { Lightbulb, RotateCcw, Shuffle } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { countLitCells, createPuzzle, isCleared, lightsOutDifficulties, toggleAt } from "./logic";
import type { LightsOutBoard, LightsOutDifficultyId, LightsOutStatus } from "./types";

type LightsOutProps = {
  onBack: () => void;
};

function getDifficulty(id: LightsOutDifficultyId) {
  return lightsOutDifficulties.find((difficulty) => difficulty.id === id) ?? lightsOutDifficulties[0];
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function LightsOut({ onBack }: LightsOutProps) {
  const [difficultyId, setDifficultyId] = useState<LightsOutDifficultyId>("easy");
  const difficulty = getDifficulty(difficultyId);
  const [board, setBoard] = useState<LightsOutBoard>(() => createPuzzle(difficulty));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<LightsOutStatus>("ready");
  const bestScoreKey = `game-shelf-lights-out-best-${difficulty.id}`;
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
    setBoard(createPuzzle(nextDifficulty));
    setMoves(0);
    setSeconds(0);
    setStatus("ready");
  };

  const pressLight = (row: number, column: number) => {
    if (status === "cleared") {
      return;
    }

    const nextBoard = toggleAt(board, row, column);
    const nextMoves = moves + 1;

    setBoard(nextBoard);
    setMoves(nextMoves);

    if (status === "ready") {
      setStatus("playing");
    }

    if (isCleared(nextBoard)) {
      setStatus("cleared");
      setBestMoves((currentBest) => {
        if (currentBest !== null && currentBest <= nextMoves) {
          return currentBest;
        }

        window.localStorage.setItem(bestScoreKey, String(nextMoves));
        return nextMoves;
      });
    }
  };

  const litCells = countLitCells(board);
  const totalCells = difficulty.size * difficulty.size;
  const statusText = {
    ready: "点いているライトをすべて消しましょう。押したマスと上下左右のライトが反転します。",
    playing: "あと少しのようで、盤面全体がふっと変わるのがこのパズルの味です。",
    cleared: "クリア！すべてのライトが消えました。"
  }[status];

  return (
    <section className="puzzle-shell lights-out-shell" aria-labelledby="lights-out-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="lights-out-title">ライツアウト</h1>
          <p className="lead">{statusText}</p>
        </div>
        <div className="score-panel lights-out-stats" aria-label="ライツアウトの状態">
          <div>
            <span>Moves</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Lights</span>
            <strong>{litCells}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout lights-out-layout">
        <div
          className="lights-out-board"
          aria-label={`${difficulty.label}の盤面`}
          style={{ "--size": difficulty.size } as CSSProperties}
        >
          {board.map((row, rowIndex) =>
            row.map((lit, columnIndex) => (
              <button
                className={`light-cell${lit ? " is-lit" : ""}`}
                type="button"
                key={`${rowIndex}-${columnIndex}`}
                onClick={() => pressLight(rowIndex, columnIndex)}
                disabled={status === "cleared"}
                aria-label={`${rowIndex + 1}行${columnIndex + 1}列、${lit ? "点灯" : "消灯"}`}
              >
                <span aria-hidden="true" />
              </button>
            ))
          )}
        </div>

        <aside className="puzzle-side lights-out-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              マスを押すと、そのマスと上下左右のライトが反転します。すべてのライトを消せばクリアです。
            </p>
          </div>

          <label className="select-label">
            難易度
            <select value={difficultyId} onChange={(event) => resetGame(event.target.value as LightsOutDifficultyId)}>
              {lightsOutDifficulties.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label} - {item.size}x{item.size}
                </option>
              ))}
            </select>
          </label>

          <div className="lights-out-progress">
            <span>
              点灯: {litCells}/{totalCells}
            </span>
            <span>時間: {formatTime(seconds)}</span>
            <span>ベスト手数: {bestMoves ?? "未記録"}</span>
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => resetGame()}>
              <Shuffle aria-hidden="true" />
              新しい盤面
            </button>
            <button className="ghost-button" type="button" onClick={() => resetGame()}>
              <RotateCcw aria-hidden="true" />
              リセット
            </button>
          </div>

          <div className="lights-out-tip">
            <Lightbulb aria-hidden="true" />
            <p>同じマスを2回押すと元に戻ります。迷ったら端から少しずつ整えるのがコツです。</p>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            棚へ戻る
          </button>
        </aside>
      </div>
    </section>
  );
}
