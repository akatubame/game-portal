export type SudokuGrid = number[][];

export type SudokuPuzzle = {
  id: string;
  title: string;
  difficulty: "初級" | "中級" | "上級";
  puzzle: SudokuGrid;
  solution: SudokuGrid;
};
