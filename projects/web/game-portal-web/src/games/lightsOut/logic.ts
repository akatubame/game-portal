import type { LightsOutBoard, LightsOutDifficulty } from "./types";

export const lightsOutDifficulties: LightsOutDifficulty[] = [
  { id: "easy", label: "初級", size: 4, shuffleMoves: 7 },
  { id: "normal", label: "中級", size: 5, shuffleMoves: 12 },
  { id: "hard", label: "上級", size: 6, shuffleMoves: 18 }
];

export function createEmptyBoard(size: number): LightsOutBoard {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => false));
}

export function cloneBoard(board: LightsOutBoard): LightsOutBoard {
  return board.map((row) => [...row]);
}

export function toggleAt(board: LightsOutBoard, row: number, column: number): LightsOutBoard {
  const nextBoard = cloneBoard(board);
  const positions = [
    [row, column],
    [row - 1, column],
    [row + 1, column],
    [row, column - 1],
    [row, column + 1]
  ];

  positions.forEach(([targetRow, targetColumn]) => {
    if (nextBoard[targetRow]?.[targetColumn] !== undefined) {
      nextBoard[targetRow][targetColumn] = !nextBoard[targetRow][targetColumn];
    }
  });

  return nextBoard;
}

export function createPuzzle(difficulty: LightsOutDifficulty): LightsOutBoard {
  let board = createEmptyBoard(difficulty.size);
  const usedCells = new Set<string>();

  for (let index = 0; index < difficulty.shuffleMoves; index += 1) {
    let row = Math.floor(Math.random() * difficulty.size);
    let column = Math.floor(Math.random() * difficulty.size);
    let guard = 0;

    while (usedCells.has(`${row}-${column}`) && guard < 20) {
      row = Math.floor(Math.random() * difficulty.size);
      column = Math.floor(Math.random() * difficulty.size);
      guard += 1;
    }

    usedCells.add(`${row}-${column}`);
    board = toggleAt(board, row, column);
  }

  if (isCleared(board)) {
    return createPuzzle(difficulty);
  }

  return board;
}

export function isCleared(board: LightsOutBoard): boolean {
  return board.every((row) => row.every((light) => !light));
}

export function countLitCells(board: LightsOutBoard): number {
  return board.reduce((total, row) => total + row.filter(Boolean).length, 0);
}
