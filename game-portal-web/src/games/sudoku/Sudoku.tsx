import { Eraser, Lightbulb, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import { cloneGrid, countFilledCells, countMistakes, hasConflict, isComplete, isGivenCell, isSolved } from "./logic";
import { sudokuPuzzles } from "./puzzles";
import type { SudokuGrid } from "./types";

type SudokuProps = {
  onBack: () => void;
};

type SelectedCell = {
  row: number;
  column: number;
};

const SUDOKU_BEST_TIME_KEY = "game-shelf-sudoku-best-times";

function getCellLabel(row: number, column: number) {
  return `${row + 1}行${column + 1}列`;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function readBestTimes(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SUDOKU_BEST_TIME_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function Sudoku({ onBack }: SudokuProps) {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = sudokuPuzzles[puzzleIndex];
  const [grid, setGrid] = useState<SudokuGrid>(() => cloneGrid(puzzle.puzzle));
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [showMistakes, setShowMistakes] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [recordedSolve, setRecordedSolve] = useState(false);
  const [bestTimes, setBestTimes] = useState<Record<string, number>>(() => readBestTimes());

  const mistakes = useMemo(() => countMistakes(grid, puzzle.solution), [grid, puzzle.solution]);
  const filledCells = useMemo(() => countFilledCells(grid), [grid]);
  const solved = useMemo(() => isSolved(grid, puzzle.solution), [grid, puzzle.solution]);
  const complete = useMemo(() => isComplete(grid), [grid]);
  const ranking = useRanking({ gameId: `sudoku-${puzzle.id}`, metricLabel: "Time", mode: "lower" });
  const bestTime = bestTimes[puzzle.id] ?? null;

  useEffect(() => {
    if (!started || solved) {
      return;
    }

    const timerId = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [solved, started]);

  useEffect(() => {
    if (!solved || recordedSolve) {
      return;
    }

    const clearSeconds = Math.max(1, seconds);
    setBestTimes((current) => {
      const currentBest = current[puzzle.id];
      if (currentBest !== undefined && currentBest <= clearSeconds) {
        return current;
      }

      const next = { ...current, [puzzle.id]: clearSeconds };
      window.localStorage.setItem(SUDOKU_BEST_TIME_KEY, JSON.stringify(next));
      return next;
    });
    setRecordedSolve(true);
  }, [puzzle.id, recordedSolve, seconds, solved]);

  const resetPuzzle = () => {
    setGrid(cloneGrid(puzzle.puzzle));
    setSelectedCell(null);
    setSeconds(0);
    setStarted(false);
    setRecordedSolve(false);
  };

  const changePuzzle = (nextIndex: number) => {
    const nextPuzzle = sudokuPuzzles[nextIndex];
    setPuzzleIndex(nextIndex);
    setGrid(cloneGrid(nextPuzzle.puzzle));
    setSelectedCell(null);
    setSeconds(0);
    setStarted(false);
    setRecordedSolve(false);
  };

  const setCellValue = (value: number) => {
    if (!selectedCell || isGivenCell(puzzle, selectedCell.row, selectedCell.column)) {
      return;
    }

    if (!started) {
      setStarted(true);
    }

    setGrid((currentGrid) => {
      const nextGrid = cloneGrid(currentGrid);
      nextGrid[selectedCell.row][selectedCell.column] = value;
      return nextGrid;
    });
  };

  const eraseCell = () => {
    setCellValue(0);
  };

  const fillHint = () => {
    const target =
      selectedCell && !isGivenCell(puzzle, selectedCell.row, selectedCell.column)
        ? selectedCell
        : grid.flatMap((row, rowIndex) =>
            row.map((value, columnIndex) => ({ row: rowIndex, column: columnIndex, value }))
          ).find((cell) => cell.value === 0);

    if (!target) {
      return;
    }

    setGrid((currentGrid) => {
      const nextGrid = cloneGrid(currentGrid);
      nextGrid[target.row][target.column] = puzzle.solution[target.row][target.column];
      return nextGrid;
    });
    if (!started) {
      setStarted(true);
    }
    setSelectedCell({ row: target.row, column: target.column });
  };

  const statusText = solved
    ? "完成！すべて正しく埋まりました。良い手筋です。"
    : complete
      ? "すべて埋まりました。赤いマスがあれば見直してみてください。"
      : "空いているマスを選んで、下の数字ボタンで入力してください。";

  return (
    <section className="puzzle-shell sudoku-shell" aria-labelledby="sudoku-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="sudoku-title">数独</h1>
          <p className="lead">{statusText}</p>
        </div>
        <div className="score-panel sudoku-stats" aria-label="数独の状態">
          <div>
            <span>Difficulty</span>
            <strong>{puzzle.difficulty}</strong>
          </div>
          <div>
            <span>Filled</span>
            <strong>{filledCells}/81</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{formatTime(seconds)}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout sudoku-layout">
        <div className="sudoku-board" aria-label={`${puzzle.title}の盤面`}>
          {grid.map((row, rowIndex) =>
            row.map((value, columnIndex) => {
              const given = isGivenCell(puzzle, rowIndex, columnIndex);
              const selected = selectedCell?.row === rowIndex && selectedCell.column === columnIndex;
              const sameNumber = selectedCell && value !== 0 && value === grid[selectedCell.row][selectedCell.column];
              const mistake = showMistakes && value !== 0 && value !== puzzle.solution[rowIndex][columnIndex];
              const conflict = showMistakes && hasConflict(grid, rowIndex, columnIndex);

              return (
                <button
                  className={[
                    "sudoku-cell",
                    given ? "is-given" : "",
                    selected ? "is-selected" : "",
                    sameNumber ? "is-related" : "",
                    mistake || conflict ? "is-mistake" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  key={`${rowIndex}-${columnIndex}`}
                  onClick={() => setSelectedCell({ row: rowIndex, column: columnIndex })}
                  aria-label={`${getCellLabel(rowIndex, columnIndex)}${value ? `、${value}` : "、空欄"}`}
                >
                  {value || ""}
                </button>
              );
            })
          )}
        </div>

        <aside className="puzzle-side sudoku-side">
          <div className="rule-card">
            <h2>{puzzle.title}</h2>
            <p>
              各行・各列・3x3ブロックに、1から9までの数字が一度ずつ入るように埋めます。
              最初から表示されている数字は変更できません。
            </p>
          </div>

          <label className="select-label">
            問題
            <select value={puzzleIndex} onChange={(event) => changePuzzle(Number(event.target.value))}>
              {sudokuPuzzles.map((item, index) => (
                <option value={index} key={item.id}>
                  {item.difficulty} - {item.title}
                </option>
              ))}
            </select>
          </label>

          <div className="number-pad" aria-label="数字入力">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
              <button type="button" key={value} onClick={() => setCellValue(value)}>
                {value}
              </button>
            ))}
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={resetPuzzle}>
              <RotateCcw aria-hidden="true" />
              リセット
            </button>
            <button className="ghost-button" type="button" onClick={eraseCell}>
              <Eraser aria-hidden="true" />
              消す
            </button>
            <button className="ghost-button" type="button" onClick={fillHint}>
              <Lightbulb aria-hidden="true" />
              ヒント
            </button>
          </div>

          <label className="check-label">
            <input
              type="checkbox"
              checked={showMistakes}
              onChange={(event) => setShowMistakes(event.target.checked)}
            />
            ミスを赤く表示する
          </label>

          <p className="sudoku-note">
            現在のミス数: <strong>{mistakes}</strong>
          </p>

          <p className="sudoku-note">
            ベストタイム: <strong>{bestTime === null ? "未記録" : formatTime(bestTime)}</strong>
          </p>

          <RankingPanel
            ranking={ranking}
            pendingScore={solved ? { score: Math.max(1, seconds), display: formatTime(Math.max(1, seconds)), meta: `${puzzle.difficulty} - ${puzzle.title}` } : null}
          />

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            棚へ戻る
          </button>
        </aside>
      </div>
    </section>
  );
}
