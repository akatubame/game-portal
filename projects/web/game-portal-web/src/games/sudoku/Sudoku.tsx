import { Eraser, Lightbulb, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
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

const sudokuDifficultyLabels: Record<string, string> = {
  easy: "Beginner",
  medium: "Intermediate",
  hard: "Advanced"
};

const sudokuTitleLabels: Record<string, string> = {
  "easy-01": "Warm-up Grid",
  "easy-02": "Lunch Break Puzzle",
  "easy-03": "Weekend Stretch",
  "easy-04": "Small Spark",
  "medium-01": "Evening Challenge",
  "medium-02": "Rainy Logic",
  "medium-03": "Cafe Focus",
  "medium-04": "Moonlit Board",
  "hard-01": "Night Watch"
};

function getSudokuDifficultyLabel(id: string) {
  if (id.startsWith("easy")) {
    return sudokuDifficultyLabels.easy;
  }
  if (id.startsWith("medium")) {
    return sudokuDifficultyLabels.medium;
  }
  return sudokuDifficultyLabels.hard;
}

function getSudokuTitleLabel(id: string) {
  return sudokuTitleLabels[id] ?? id;
}

function getLocalizedCellLabel(row: number, column: number, isEnglish: boolean) {
  return isEnglish ? `row ${row + 1}, column ${column + 1}` : getCellLabel(row, column);
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
  const { language } = useI18n();
  const isEnglish = language === "en";
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
  const clearSeconds = Math.max(1, seconds);
  const visiblePuzzleTitle = isEnglish ? getSudokuTitleLabel(puzzle.id) : puzzle.title;
  const visibleDifficulty = isEnglish ? getSudokuDifficultyLabel(puzzle.id) : puzzle.difficulty;

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
  }, [clearSeconds, puzzle.id, recordedSolve, solved]);

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
    if (!selectedCell || isGivenCell(puzzle, selectedCell.row, selectedCell.column) || solved) {
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
    if (solved) {
      return;
    }

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
    ? `完成！ ${formatTime(clearSeconds)}で「${puzzle.title}」を解きました。`
    : complete
      ? "すべて埋まりました。赤いマスがあれば見直してみてください。"
      : "空いているマスを選んで、下の数字ボタンで入力してください。";

  const visibleStatusText = isEnglish
    ? solved
      ? `Complete! Solved "${visiblePuzzleTitle}" in ${formatTime(clearSeconds)}.`
      : complete
        ? "Every cell is filled. Check the highlighted mistakes and fix the grid."
        : "Select an empty cell, then enter a number with the buttons below."
    : statusText;

  return (
    <section className="puzzle-shell sudoku-shell" aria-labelledby="sudoku-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="sudoku-title">{isEnglish ? "Sudoku" : "数独"}</h1>
          <p className="lead">{visibleStatusText}</p>
        </div>
        <div className="score-panel sudoku-stats" aria-label={isEnglish ? "Sudoku status" : "数独の状態"}>
          <div>
            <span>{isEnglish ? "Difficulty" : "難易度"}</span>
            <strong>{visibleDifficulty}</strong>
          </div>
          <div>
            <span>{isEnglish ? "Filled" : "入力済み"}</span>
            <strong>{filledCells}/81</strong>
          </div>
          <div>
            <span>{isEnglish ? "Time" : "時間"}</span>
            <strong>{formatTime(seconds)}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout sudoku-layout">
        <div className="sudoku-board" aria-label={isEnglish ? `${visiblePuzzleTitle} board` : `${puzzle.title}の盤面`}>
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
                  aria-label={`${getLocalizedCellLabel(rowIndex, columnIndex, isEnglish)}${value ? (isEnglish ? `, ${value}` : `、${value}`) : (isEnglish ? ", empty" : "、空欄")}`}
                >
                  {value || ""}
                </button>
              );
            })
          )}
        </div>

        <aside className="puzzle-side sudoku-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to play" : puzzle.title}</h2>
            <p>
              {isEnglish
                ? "Fill the grid so every row, column, and 3x3 box contains the numbers 1 through 9 exactly once. Given numbers cannot be changed."
                : "各行・各列・3x3ブロックに、1から9までの数字が一度ずつ入るように埋めます。最初から表示されている数字は変更できません。"}
            </p>
          </div>

          <label className="select-label">
            {isEnglish ? "Puzzle" : "問題"}
            <select value={puzzleIndex} onChange={(event) => changePuzzle(Number(event.target.value))}>
              {sudokuPuzzles.map((item, index) => (
                <option value={index} key={item.id}>
                  {isEnglish ? `${getSudokuDifficultyLabel(item.id)} - ${getSudokuTitleLabel(item.id)}` : `${item.difficulty} - ${item.title}`}
                </option>
              ))}
            </select>
          </label>

          <div className="number-pad" aria-label={isEnglish ? "number input" : "数字入力"}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
              <button type="button" key={value} onClick={() => setCellValue(value)} disabled={solved}>
                {value}
              </button>
            ))}
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={resetPuzzle}>
              <RotateCcw aria-hidden="true" />
              {isEnglish ? "Reset" : "リセット"}
            </button>
            <button className="ghost-button" type="button" onClick={eraseCell} disabled={solved}>
              <Eraser aria-hidden="true" />
              {isEnglish ? "Erase" : "消す"}
            </button>
            <button className="ghost-button" type="button" onClick={fillHint} disabled={solved}>
              <Lightbulb aria-hidden="true" />
              {isEnglish ? "Hint" : "ヒント"}
            </button>
          </div>

          <label className="check-label">
            <input
              type="checkbox"
              checked={showMistakes}
              onChange={(event) => setShowMistakes(event.target.checked)}
            />
            {isEnglish ? "Highlight mistakes in red" : "ミスを赤で表示する"}
          </label>

          <p className="sudoku-note">
            {isEnglish ? "Current mistakes" : "現在のミス数"}: <strong>{mistakes}</strong>
          </p>

          <p className="sudoku-note">
            {isEnglish ? "Best time" : "ベストタイム"}: <strong>{bestTime === null ? (isEnglish ? "No record" : "未記録") : formatTime(bestTime)}</strong>
          </p>

          <RankingPanel
            ranking={ranking}
            pendingScore={solved ? { score: clearSeconds, display: formatTime(clearSeconds), meta: `${visibleDifficulty} - ${visiblePuzzleTitle}` } : null}
          />

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            {isEnglish ? "Back to shelf" : "棚へ戻る"}
          </button>
        </aside>
      </div>
    </section>
  );
}
