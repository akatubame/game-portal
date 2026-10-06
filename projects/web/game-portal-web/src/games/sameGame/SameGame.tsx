import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { safeStorage } from "../../safeStorage";
import { Eraser, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { isPlainRecord, readSavedProgress } from "../savedProgress";
import { useLocalizedMessage } from "../useLocalizedMessage";
import type { CSSProperties } from "react";
import type { SameGameBest, SameGameCell, SameGameColor, SameGameDifficulty, SameGameStatus } from "./types";

type SameGameProps = {
  onBack: () => void;
};

const BEST_KEY = "game-shelf-same-game-best";
const PROGRESS_KEY = "game-shelf-progress-same-game-v1";
type SavedSameGame = { version: 1; difficulty: SameGameDifficulty; board: SameGameCell[]; score: number; lastRemoved: number };
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
  const stored = safeStorage.getItem(BEST_KEY);
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

function isSavedSameGame(value: unknown): value is SavedSameGame {
  if (!isPlainRecord(value)) return false;
  const lastRemoved = value.lastRemoved;
  if (value.version !== 1 ||
      (value.difficulty !== "small" && value.difficulty !== "normal" && value.difficulty !== "large") ||
      !Number.isSafeInteger(value.score) || (value.score as number) < 0 ||
      typeof lastRemoved !== "number" || !Number.isSafeInteger(lastRemoved) || lastRemoved < 0) return false;
  const settings = difficultySettings[value.difficulty];
  const board = value.board;
  return lastRemoved <= settings.columns * settings.rows &&
    Array.isArray(board) && board.length === settings.columns * settings.rows &&
    board.every((cell) => cell === null || colors.includes(cell)) &&
    hasMoves(board, settings.columns, settings.rows);
}

export function SameGame({ onBack }: SameGameProps) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const text = (ja: string, en: string) => isEnglish ? en : ja;
  const confirmRecordReset = useConfirmRecordReset();
  const [saved] = useState(() => readSavedProgress(PROGRESS_KEY, isSavedSameGame));
  const [difficulty, setDifficulty] = useState<SameGameDifficulty>(saved?.difficulty ?? "normal");
  const [board, setBoard] = useState<SameGameCell[]>(() => saved?.board ?? createBoard(difficultySettings.normal.columns, difficultySettings.normal.rows));
  const [status, setStatus] = useState<SameGameStatus>(saved ? "playing" : "idle");
  const [score, setScore] = useState(saved?.score ?? 0);
  const scoreRef = useRef(saved?.score ?? 0);
  const [lastRemoved, setLastRemoved] = useState(saved?.lastRemoved ?? 0);
  const [message, setMessage] = useLocalizedMessage("同じ色が2個以上つながったブロックをクリックして消しましょう。", "Click groups of two or more connected blocks of the same color.");
  const [bestByDifficulty, setBestByDifficulty] = useState<Record<SameGameDifficulty, SameGameBest | undefined>>(() => readBest());

  const settings = difficultySettings[difficulty];
  const ranking = useRanking({ gameId: `same-game-${difficulty}`, metricLabel: "Score", mode: "higher" });
  const currentBest = bestByDifficulty[difficulty];
  const blocksLeft = remainingBlocks(board);
  const movesAvailable = useMemo(() => hasMoves(board, settings.columns, settings.rows), [board, settings.columns, settings.rows]);

  useEffect(() => {
    if (status === "playing") {
      safeStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, difficulty, board, score, lastRemoved } satisfies SavedSameGame));
    } else if (status === "finished") {
      safeStorage.removeItem(PROGRESS_KEY);
    }
  }, [board, difficulty, lastRemoved, score, status]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

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
    safeStorage.setItem(BEST_KEY, JSON.stringify(nextBestByDifficulty));
  };

  const finishGame = (finalScore: number, nextBoard: SameGameCell[]) => {
    const bonus = remainingBlocks(nextBoard) === 0 ? 500 : 0;
    const total = finalScore + bonus;
    scoreRef.current = total;
    setScore(total);
    setStatus("finished");
    saveBest(total);
    setMessage(bonus > 0 ? `全消しボーナス！合計${total}点です。` : `手詰まりです。合計${total}点でした。`, bonus > 0 ? `Board clear bonus! Total: ${total} points.` : `No groups left. Total: ${total} points.`);
  };

  const startGame = (nextDifficulty = difficulty) => {
    safeStorage.removeItem(PROGRESS_KEY);
    const nextSettings = difficultySettings[nextDifficulty];
    setDifficulty(nextDifficulty);
    setBoard(createBoard(nextSettings.columns, nextSettings.rows));
    setStatus("playing");
    setScore(0);
    scoreRef.current = 0;
    setLastRemoved(0);
    setMessage("大きい塊を残すように消すと高得点を狙えます。", "Build larger groups for a higher score.");
  };

  const selectCell = (index: number) => {
    if (status !== "playing") {
      return;
    }

    const group = getGroup(board, index, settings.columns, settings.rows);

    if (group.size < 2) {
      setMessage("1個だけのブロックは消せません。2個以上つながった塊を選びましょう。", "A single block cannot be removed. Choose a group of at least two.");
      return;
    }

    const nextBoard = removeGroup(board, group, settings.columns, settings.rows);
    const addScore = scoreForGroup(group.size);
    const nextScore = scoreRef.current + addScore;
    scoreRef.current = nextScore;
    setBoard(nextBoard);
    setScore(nextScore);
    setLastRemoved(group.size);

    if (!hasMoves(nextBoard, settings.columns, settings.rows)) {
      finishGame(nextScore, nextBoard);
      return;
    }

    setMessage(`${group.size}個消して${addScore}点。まだ消せる塊があります。`, `Removed ${group.size} blocks for ${addScore} points. More groups remain.`);
  };

  const resetBest = () => {
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestByDifficulty({ small: undefined, normal: undefined, large: undefined });
  };

  return (
    <section className="puzzle-shell same-shell" aria-labelledby="same-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="same-title">{text("さめがめ", "SameGame")}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel same-score" aria-label={text("さめがめの状態", "SameGame status")}>
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
            aria-label={text("さめがめ盤面", "SameGame board")}
          >
            {board.map((cell, index) =>
              cell ? (
                <button
                  className={`same-cell is-${cell}`}
                  disabled={status !== "playing"}
                  key={`${index}-${cell}`}
                  type="button"
                  onClick={() => selectCell(index)}
                  aria-label={text(`${index + 1}番目のブロック ${colorLabels[cell]}`, `Block ${index + 1}: ${cell}`)}
                />
              ) : (
                <span className="same-cell is-empty" key={`${index}-empty`} />
              )
            )}
          </div>
        </div>

        <aside className="puzzle-side same-side">
          <div className="rule-card">
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("上下左右につながった同じ色のブロックを2個以上まとめて消します。消した数が多いほど得点が伸び、列が空くと右側の列が左へ詰まります。全消しできるとボーナスです。",
                "Remove groups of at least two adjacent blocks of the same color. Larger groups score more; columns shift left when emptied. Clear the whole board for a bonus.")}
            </p>
            <p>{text("途中の盤面はこのブラウザに自動保存されます。", "Your current board is saved automatically on this browser.")}</p>
          </div>

          <div className="same-options" aria-label={text("盤面サイズ", "Board size")}>
            {(Object.keys(difficultySettings) as SameGameDifficulty[]).map((level) => (
              <button
                className={difficulty === level ? "is-selected" : ""}
                disabled={status === "playing"}
                key={level}
                type="button"
                onClick={() => startGame(level)}
              >
                <span>{isEnglish ? { small: "Small", normal: "Normal", large: "Large" }[level] : difficultySettings[level].label}</span>
                <small>{isEnglish ? { small: "8×8, a quick introduction.", normal: "10×10, standard board.", large: "12×10, aim for a high score." }[level] : difficultySettings[level].description}</small>
              </button>
            ))}
          </div>

          <div className="same-progress">
            <span>{text("現在", "Status")}: {status === "playing" ? text("プレイ中", "Playing") : status === "finished" ? text("終了", "Finished") : text("待機中", "Ready")}</span>
            <span>{text("消せる塊", "Available groups")}: {movesAvailable ? text("あり", "Yes") : text("なし", "None")}</span>
            <span>{text("ベスト", "Best")}: {currentBest ? text(`${currentBest.score}点`, `${currentBest.score} pts`) : text("まだ記録なし", "No record yet")}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score, display: text(`${score}点`, `${score} pts`), meta: text(`${settings.label} / 残り${blocksLeft}個`, `${{ small: "Small", normal: "Normal", large: "Large" }[difficulty]} / ${blocksLeft} left`) } : null}
          />

          <div className="same-hint">
            <Eraser aria-hidden="true" />
            {text("小さい塊を急いで消しすぎると孤立ブロックが残りがちです。大きな塊を育てる感じでどうぞ。", "Removing small groups too early can strand single blocks. Try to build larger groups.")}
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startGame()}>
              <Sparkles aria-hidden="true" />
              {text("新しく始める", "New game")}
            </button>
            <button className="ghost-button" type="button" onClick={resetBest}>
              <RotateCcw aria-hidden="true" />
              {text("ベスト削除", "Clear best")}
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            {text("棚へ戻る", "Back to shelf")}
          </button>
        </aside>
      </div>
    </section>
  );
}
