import type { SudokuGrid, SudokuPuzzle } from "./types";

export function cloneGrid(grid: SudokuGrid): SudokuGrid {
  return grid.map((row) => [...row]);
}

export function isGivenCell(puzzle: SudokuPuzzle, row: number, column: number): boolean {
  return puzzle.puzzle[row][column] !== 0;
}

export function isComplete(grid: SudokuGrid): boolean {
  return grid.every((row) => row.every((value) => value >= 1 && value <= 9));
}

export function isSolved(grid: SudokuGrid, solution: SudokuGrid): boolean {
  return grid.every((row, rowIndex) => row.every((value, columnIndex) => value === solution[rowIndex][columnIndex]));
}

export function hasConflict(grid: SudokuGrid, row: number, column: number): boolean {
  const value = grid[row][column];

  if (value === 0) {
    return false;
  }

  for (let index = 0; index < 9; index += 1) {
    if (index !== column && grid[row][index] === value) {
      return true;
    }

    if (index !== row && grid[index][column] === value) {
      return true;
    }
  }

  const blockRowStart = Math.floor(row / 3) * 3;
  const blockColumnStart = Math.floor(column / 3) * 3;

  for (let rowOffset = 0; rowOffset < 3; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < 3; columnOffset += 1) {
      const targetRow = blockRowStart + rowOffset;
      const targetColumn = blockColumnStart + columnOffset;

      if ((targetRow !== row || targetColumn !== column) && grid[targetRow][targetColumn] === value) {
        return true;
      }
    }
  }

  return false;
}

export function countMistakes(grid: SudokuGrid, solution: SudokuGrid): number {
  return grid.reduce(
    (total, row, rowIndex) =>
      total + row.filter((value, columnIndex) => value !== 0 && value !== solution[rowIndex][columnIndex]).length,
    0
  );
}

export function countFilledCells(grid: SudokuGrid): number {
  return grid.reduce((total, row) => total + row.filter(Boolean).length, 0);
}
