import { Eraser, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { SameGameBest, SameGameCell, SameGameColor, SameGameDifficulty, SameGameStatus } from "./types";

type SameGameProps = {
  onBack: () => void;
};

const BEST_KEY = "game-shelf-same-game-best";
const colors: SameGameColor[] = ["coral", "gold", "mint", "sky", "violet"];

const colorLabels: Record<SameGameColor, string> = {
  coral: "コーラル",
  gold: "ゴールド",
  mint: "ミント",
  sky: "スカイ",
  violet: "バイオレット"
};

const difficultySettings: Record<SameGameDifficulty, { label: string; columns: number; rows: number; description: string }> = {
  small: {
    label: "小さめ",
    columns: 8,
    rows: 8,
    description: "8×8の軽い盤面。まずは感触をつかめます。"
  },
  normal: {
    label: "ふつう",
    columns: 10,
    rows: 10,
    description: "10×10の標準盤面。連鎖を考えやすい広さです。"
  },
  large: {
    label: "大きめ",
    columns: 12,
    rows: 10,
    description: "12×10の大きめ盤面。高得点狙い向けです。"
  }
};

function readBest(): Record<SameGameDifficulty, SameGameBest | undefined> {
  const stored = window.localStorage.getItem(BEST_KEY);
  return {
    small: undefined,
    normal: undefined,
    large: undefined,
    ...(stored ? (JSON.parse(stored) as Partial<Record<SameGameDifficulty, SameGameBest>>) : {})
  };
}

function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

function createBoard(columns: number, rows: number): SameGameCell[] {
  return Array.from({ length: columns * rows }, () => randomColor());
}

function toIndex(row: number, column: number, columns: number) {
  return row * columns + column;
}

function getNeighbors(index: number, columns: number, rows: number) {
  const row = Math.floor(index / columns);
  const column = index % columns;
  const neighbors: number[] = [];

  if (row > 0) neighbors.push(toIndex(row - 1, column, columns));
  if (row < rows - 1) neighbors.push(toIndex(row + 1, column, columns));
  if (column > 0) neighbors.push(toIndex(row, column - 1, columns));
  if (column < columns - 1) neighbors.push(toIndex(row, column + 1, columns));

  return neighbors;
}

function getGroup(board: SameGameCell[], index: number, columns: number, rows: number) {
  const target = board[index];
  const group = new Set<number>();

  if (!target) {
    return group;
  }

  const queue = [index];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === undefined || group.has(current) || board[current] !== target) {
      continue;
    }

    group.add(current);
    getNeighbors(current, columns, rows).forEach((neighbor) => {
      if (!group.has(neighbor) && board[neighbor] === target) {
        queue.push(neighbor);
      }
    });
  }

  return group;
}

function collapseBoard(board: SameGameCell[], columns: number, rows: number) {
  const nextColumns: SameGameCell[][] = [];

  for (let column = 0; column < columns; column += 1) {
    const remaining: SameGameCell[] = [];

    for (let row = rows - 1; row >= 0; row -= 1) {
      const value = board[toIndex(row, column, columns)];
      if (value) {
        remaining.push(value);
      }
    }

    if (remaining.length > 0) {
      nextColumns.push([...remaining, ...Array.from({ length: rows - remaining.length }, () => null)].reverse());
    }
  }

  while (nextColumns.length < columns) {
    nextColumns.push(Array.from({ length: rows }, () => null));
  }

  return Array.from({ length: columns * rows }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    return nextColumns[column][row];
  });
}

function removeGroup(board: SameGameCell[], group: Set<number>, columns: number, rows: number) {
  const removed = board.map((cell, index) => (group.has(index) ? null : cell));
  return collapseBoard(removed, columns, rows);
}

function hasMoves(board: SameGameCell[], columns: number, rows: number) {
  return board.some((cell, index) => cell && getGroup(board, index, columns, rows).size >= 2);
}

function remainingBlocks(board: SameGameCell[]) {
  return board.filter(Boolean).length;
}

function scoreForGroup(size: number) {
  return size < 2 ? 0 : (size - 1) ** 2;
}

export function SameGame({ onBack }: SameGameProps) {
  const [difficulty, setDifficulty] = useState<SameGameDifficulty>("normal");
  const [board, setBoard] = useState<SameGameCell[]>(() => createBoard(difficultySettings.normal.columns, difficultySettings.normal.rows));
  const [status, setStatus] = useState<SameGameStatus>("idle");
  const [score, setScore] = useState(0);
  const [lastRemoved, setLastRemoved] = useState(0);
  const [message, setMessage] = useState("同じ色が2個以上つながったブロックをクリックして消しましょう。");
  const [bestByDifficulty, setBestByDifficulty] = useState<Record<SameGameDifficulty, SameGameBest | undefined>>(() => readBest());

  const settings = difficultySettings[difficulty];
  const currentBest = bestByDifficulty[difficulty];
  const blocksLeft = remainingBlocks(board);
  const movesAvailable = useMemo(() => hasMoves(board, settings.columns, settings.rows), [board, settings.columns, settings.rows]);

  const saveBest = (nextScore: number) => {
    if (currentBest && currentBest.score >= nextScore) {
      return;
    }

    const nextBest = {
      score: nextScore,
      difficulty,
      recordedAt: new Date().toISOString()
    };
    const nextBestByDifficulty = { ...bestByDifficulty, [difficulty]: nextBest };
    setBestByDifficulty(nextBestByDifficulty);
    window.localStorage.setItem(BEST_KEY, JSON.stringify(nextBestByDifficulty));
  };

  const finishGame = (finalScore: number, nextBoard: SameGameCell[]) => {
    const bonus = remainingBlocks(nextBoard) === 0 ? 500 : 0;
    const total = finalScore + bonus;
    setScore(total);
    setStatus("finished");
    saveBest(total);
    setMessage(bonus > 0 ? `全消しボーナス！合計${total}点です。` : `手詰まりです。合計${total}点でした。`);
  };

  const startGame = (nextDifficulty = difficulty) => {
    const nextSettings = difficultySettings[nextDifficulty];
    setDifficulty(nextDifficulty);
    setBoard(createBoard(nextSettings.columns, nextSettings.rows));
    setStatus("playing");
    setScore(0);
    setLastRemoved(0);
    setMessage("大きい塊を残すように消すと高得点を狙えます。");
  };

  const selectCell = (index: number) => {
    if (status !== "playing") {
      return;
    }

    const group = getGroup(board, index, settings.columns, settings.rows);

    if (group.size < 2) {
      setMessage("1個だけのブロックは消せません。2個以上つながった塊を選びましょう。");
      return;
    }

    const nextBoard = removeGroup(board, group, settings.columns, settings.rows);
    const addScore = scoreForGroup(group.size);
    const nextScore = score + addScore;
    setBoard(nextBoard);
    setScore(nextScore);
    setLastRemoved(group.size);

    if (!hasMoves(nextBoard, settings.columns, settings.rows)) {
      finishGame(nextScore, nextBoard);
      return;
    }

    setMessage(`${group.size}個消して${addScore}点。まだ消せる塊があります。`);
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBestByDifficulty({ small: undefined, normal: undefined, large: undefined });
  };

  return (
    <section className="puzzle-shell same-shell" aria-labelledby="same-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="same-title">さめがめ</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel same-score" aria-label="さめがめの状態">
          <div>
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>Left</span>
            <strong>{blocksLeft}</strong>
          </div>
          <div>
            <span>Last</span>
            <strong>{lastRemoved}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout same-layout">
        <div className="same-play-area">
          <div
            className="same-board"
            style={{ "--same-columns": settings.columns, "--same-rows": settings.rows } as CSSProperties}
            aria-label="さめがめ盤面"
          >
            {board.map((cell, index) =>
              cell ? (
                <button
                  className={`same-cell is-${cell}`}
                  disabled={status !== "playing"}
                  key={`${index}-${cell}`}
                  type="button"
                  onClick={() => selectCell(index)}
                  aria-label={`${index + 1}番目のブロック ${colorLabels[cell]}`}
                />
              ) : (
                <span className="same-cell is-empty" key={`${index}-empty`} />
              )
            )}
          </div>
        </div>

        <aside className="puzzle-side same-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              上下左右につながった同じ色のブロックを2個以上まとめて消します。消した数が多いほど得点が伸び、
              列が空くと右側の列が左へ詰まります。全消しできるとボーナスです。
            </p>
          </div>

          <div className="same-options" aria-label="盤面サイズ">
            {(Object.keys(difficultySettings) as SameGameDifficulty[]).map((level) => (
              <button
                className={difficulty === level ? "is-selected" : ""}
                disabled={status === "playing"}
                key={level}
                type="button"
                onClick={() => startGame(level)}
              >
                <span>{difficultySettings[level].label}</span>
                <small>{difficultySettings[level].description}</small>
              </button>
            ))}
          </div>

          <div className="same-progress">
            <span>現在: {status === "playing" ? "プレイ中" : status === "finished" ? "終了" : "待機中"}</span>
            <span>消せる塊: {movesAvailable ? "あり" : "なし"}</span>
            <span>ベスト: {currentBest ? `${currentBest.score}点` : "まだ記録なし"}</span>
          </div>

          <div className="same-hint">
            <Eraser aria-hidden="true" />
            小さい塊を急いで消しすぎると孤立ブロックが残りがちです。大きな塊を育てる感じでどうぞ。
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startGame()}>
              <Sparkles aria-hidden="true" />
              新しく始める
            </button>
            <button className="ghost-button" type="button" onClick={resetBest}>
              <RotateCcw aria-hidden="true" />
              ベスト削除
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
