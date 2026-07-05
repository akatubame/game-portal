import { Bomb, Flag, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import {
  countFlags,
  countRevealedSafeCells,
  createEmptyBoard,
  difficulties,
  hasWon,
  plantMines,
  revealAllMines,
  revealCell,
  toggleFlag
} from "./logic";
import type { DifficultyId, GameStatus, MineBoard } from "./types";

type MinesweeperProps = {
  onBack: () => void;
};

const MINESWEEPER_BEST_KEY = "game-shelf-minesweeper-best-times";

function getDifficulty(id: DifficultyId) {
  return difficulties.find((difficulty) => difficulty.id === id) ?? difficulties[0];
}

function formatTime(seconds: number) {
  return String(seconds).padStart(3, "0");
}

function readBestTimes(): Partial<Record<DifficultyId, number>> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MINESWEEPER_BEST_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function Minesweeper({ onBack }: MinesweeperProps) {
  const [difficultyId, setDifficultyId] = useState<DifficultyId>("easy");
  const difficulty = getDifficulty(difficultyId);
  const [board, setBoard] = useState<MineBoard>(() => createEmptyBoard(difficulty));
  const [status, setStatus] = useState<GameStatus>("ready");
  const [flagMode, setFlagMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [bestTimes, setBestTimes] = useState<Partial<Record<DifficultyId, number>>>(() => readBestTimes());

  const flagCount = useMemo(() => countFlags(board), [board]);
  const revealedSafeCells = useMemo(() => countRevealedSafeCells(board), [board]);
  const safeCells = difficulty.rows * difficulty.columns - difficulty.mines;
  const remainingMines = difficulty.mines - flagCount;
  const bestTime = bestTimes[difficulty.id] ?? null;

  const recordBestTime = (clearSeconds: number) => {
    setBestTimes((current) => {
      const currentBest = current[difficulty.id];
      if (currentBest !== undefined && currentBest <= clearSeconds) {
        return current;
      }

      const next = { ...current, [difficulty.id]: clearSeconds };
      window.localStorage.setItem(MINESWEEPER_BEST_KEY, JSON.stringify(next));
      return next;
    });
  };

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
    setBoard(createEmptyBoard(nextDifficulty));
    setStatus("ready");
    setSeconds(0);
    setFlagMode(false);
  };

  const openCell = (row: number, column: number) => {
    if (status === "lost" || status === "won") {
      return;
    }

    if (flagMode) {
      setBoard((currentBoard) => toggleFlag(currentBoard, row, column));
      return;
    }

    setBoard((currentBoard) => {
      let nextBoard = currentBoard;

      if (status === "ready") {
        nextBoard = plantMines(currentBoard, difficulty, row, column);
        setStatus("playing");
      }

      const target = nextBoard[row][column];

      if (target.flagged) {
        return nextBoard;
      }

      if (target.hasMine) {
        setStatus("lost");
        return revealAllMines(nextBoard);
      }

      const revealedBoard = revealCell(nextBoard, row, column);

      if (hasWon(revealedBoard)) {
        setStatus("won");
        recordBestTime(Math.max(1, seconds));
      }

      return revealedBoard;
    });
  };

  const flagCell = (event: MouseEvent<HTMLButtonElement>, row: number, column: number) => {
    event.preventDefault();

    if (status === "lost" || status === "won") {
      return;
    }

    if (status === "ready") {
      setStatus("playing");
    }

    setBoard((currentBoard) => toggleFlag(currentBoard, row, column));
  };

  const statusText = {
    ready: "最初の一手は必ず安全です。マスを開いて地雷を避けましょう。",
    playing: "数字は周囲8マスにある地雷の数です。怪しいマスには旗を立てられます。",
    won: "クリア！すべての安全なマスを開きました。",
    lost: "地雷を踏みました。もう一度、慎重にいきましょう。"
  }[status];

  return (
    <section className="puzzle-shell minesweeper-shell" aria-labelledby="minesweeper-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="minesweeper-title">マインスイーパー</h1>
          <p className="lead">{statusText}</p>
        </div>
        <div className="score-panel minesweeper-stats" aria-label="マインスイーパーの状態">
          <div>
            <span>Mines</span>
            <strong>{remainingMines}</strong>
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

      <div className="puzzle-layout minesweeper-layout">
        <div
          className="minesweeper-board"
          aria-label={`${difficulty.label}の盤面`}
          style={{ "--columns": difficulty.columns } as CSSProperties}
        >
          {board.map((row) =>
            row.map((cell) => {
              const content = cell.revealed
                ? cell.hasMine
                  ? "💣"
                  : cell.adjacentMines || ""
                : cell.flagged
                  ? "⚑"
                  : "";

              return (
                <button
                  className={[
                    "mine-cell",
                    cell.revealed ? "is-revealed" : "",
                    cell.flagged ? "is-flagged" : "",
                    cell.hasMine && cell.revealed ? "is-mine" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-number={cell.revealed && !cell.hasMine && cell.adjacentMines ? cell.adjacentMines : undefined}
                  key={`${cell.row}-${cell.column}`}
                  type="button"
                  onClick={() => openCell(cell.row, cell.column)}
                  onContextMenu={(event) => flagCell(event, cell.row, cell.column)}
                  aria-label={`${cell.row + 1}行${cell.column + 1}列${
                    cell.revealed ? "、開いています" : cell.flagged ? "、旗" : "、未開封"
                  }`}
                >
                  {content}
                </button>
              );
            })
          )}
        </div>

        <aside className="puzzle-side minesweeper-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              地雷ではないマスをすべて開けばクリアです。PCでは右クリックで旗、スマホでは旗モードを使うと遊びやすいです。
            </p>
          </div>

          <label className="select-label">
            難易度
            <select value={difficultyId} onChange={(event) => resetGame(event.target.value as DifficultyId)}>
              {difficulties.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label} - {item.rows}x{item.columns} / 地雷{item.mines}
                </option>
              ))}
            </select>
          </label>

          <div className="mine-progress">
            <span>
              安全マス: {revealedSafeCells}/{safeCells}
            </span>
            <span>
              状態: {status === "ready" ? "開始前" : status === "playing" ? "探索中" : status === "won" ? "クリア" : "失敗"}
            </span>
            <span>ベストタイム: {bestTime === null ? "未記録" : formatTime(bestTime)}</span>
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => resetGame()}>
              <RotateCcw aria-hidden="true" />
              リセット
            </button>
            <button
              className={`ghost-button${flagMode ? " is-active" : ""}`}
              type="button"
              onClick={() => setFlagMode((current) => !current)}
              aria-pressed={flagMode}
            >
              <Flag aria-hidden="true" />
              旗モード
            </button>
          </div>

          <div className="mine-status-card">
            <Bomb aria-hidden="true" />
            <p>残り地雷数は「地雷数 - 旗の数」です。旗の置きすぎにはご注意を。</p>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            棚へ戻る
          </button>
        </aside>
      </div>
    </section>
  );
}
