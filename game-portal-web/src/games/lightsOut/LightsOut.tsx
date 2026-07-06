import { Lightbulb, RotateCcw, Shuffle } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
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
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [difficultyId, setDifficultyId] = useState<LightsOutDifficultyId>("easy");
  const difficulty = getDifficulty(difficultyId);
  const [board, setBoard] = useState<LightsOutBoard>(() => createPuzzle(difficulty));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<LightsOutStatus>("ready");
  const bestScoreKey = `game-shelf-lights-out-best-${difficulty.id}`;
  const bestTimeKey = `game-shelf-lights-out-best-time-${difficulty.id}`;
  const [bestMoves, setBestMoves] = useState<number | null>(() => {
    const stored = window.localStorage.getItem(bestScoreKey);
    return stored ? Number(stored) || null : null;
  });
  const [bestTime, setBestTime] = useState<number | null>(() => {
    const stored = window.localStorage.getItem(bestTimeKey);
    return stored ? Number(stored) || null : null;
  });
  const ranking = useRanking({ gameId: `lights-out-${difficulty.id}`, metricLabel: "Moves", mode: "lower" });

  useEffect(() => {
    const stored = window.localStorage.getItem(bestScoreKey);
    setBestMoves(stored ? Number(stored) || null : null);
    const storedTime = window.localStorage.getItem(bestTimeKey);
    setBestTime(storedTime ? Number(storedTime) || null : null);
  }, [bestScoreKey, bestTimeKey]);

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

  const litCells = countLitCells(board);
  const totalCells = difficulty.size * difficulty.size;
  const statusText = {
    ready: "点いているライトをすべて消しましょう。押したマスと上下左右のライトが反転します。",
    playing: "あと少しのようで、盤面全体がふっと変わるのがこのパズルの味です。",
    cleared: "クリア！すべてのライトが消えました。"
  }[status];
  const visibleStatusText = isEnglish ? {
    ready: "Turn off every lit light. Pressing a cell toggles it and its up, down, left, and right neighbors.",
    playing: "The whole board can change in one move. Keep nudging the pattern into shape.",
    cleared: "Cleared! Every light is off."
  }[status] : statusText;

  return (
    <section className="puzzle-shell lights-out-shell" aria-labelledby="lights-out-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="lights-out-title">{isEnglish ? "Lights Out" : "ライツアウト"}</h1>
          <p className="lead">{visibleStatusText}</p>
        </div>
        <div className="score-panel lights-out-stats" aria-label={isEnglish ? "Lights Out status" : "ライツアウトの状態"}>
          <div>
            <span>Moves</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Lights</span>
            <strong>{litCells}</strong>
          </div>
          <div>
            <span>Best</span>
            <strong>{bestTime === null ? "--" : formatTime(bestTime)}</strong>
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
                aria-label={isEnglish ? `row ${rowIndex + 1}, column ${columnIndex + 1}, ${lit ? "lit" : "off"}` : `${rowIndex + 1}行${columnIndex + 1}列、${lit ? "点灯" : "消灯"}`}
              >
                <span aria-hidden="true" />
              </button>
            ))
          )}
        </div>

        <aside className="puzzle-side lights-out-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to play" : "遊び方"}</h2>
            <p>
              {isEnglish
                ? "Pressing a cell toggles it and its up, down, left, and right neighbors. Turn all lights off to clear the puzzle."
                : "マスを押すと、そのマスと上下左右のライトが反転します。すべてのライトを消せばクリアです。"}
            </p>
          </div>

          <label className="select-label">
            {isEnglish ? "Difficulty" : "難易度"}
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
              {isEnglish ? "Lit" : "点灯"}: {litCells}/{totalCells}
            </span>
            <span>{isEnglish ? "Time" : "時間"}: {formatTime(seconds)}</span>
            <span>{isEnglish ? "Best moves" : "ベスト手数"}: {bestMoves ?? (isEnglish ? "No record" : "未記録")}</span>
            <span>{isEnglish ? "Best time" : "ベストタイム"}: {bestTime === null ? (isEnglish ? "No record" : "未記録") : formatTime(bestTime)}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "cleared" ? { score: moves, display: isEnglish ? `${moves} moves` : `${moves}手`, meta: `${difficulty.label} / ${formatTime(seconds)}` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => resetGame()}>
              <Shuffle aria-hidden="true" />
              {isEnglish ? "New board" : "新しい盤面"}
            </button>
            <button className="ghost-button" type="button" onClick={() => resetGame()}>
              <RotateCcw aria-hidden="true" />
              {isEnglish ? "Reset" : "リセット"}
            </button>
          </div>

          <div className="lights-out-tip">
            <Lightbulb aria-hidden="true" />
            <p>{isEnglish ? "Pressing the same cell twice restores it. If you get stuck, work from the edges inward." : "同じマスを2回押すと元に戻ります。迷ったら端から少しずつ整えるのがコツです。"}</p>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            {isEnglish ? "Back to shelf" : "棚へ戻る"}
          </button>
        </aside>
      </div>
    </section>
  );
}
