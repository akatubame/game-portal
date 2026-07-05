import type { Difficulty, MineBoard, MineCell } from "./types";

export const difficulties: Difficulty[] = [
  { id: "easy", label: "初級", rows: 9, columns: 9, mines: 10 },
  { id: "normal", label: "中級", rows: 12, columns: 12, mines: 24 },
  { id: "hard", label: "上級", rows: 14, columns: 16, mines: 40 }
];

export function createEmptyBoard(difficulty: Difficulty): MineBoard {
  return Array.from({ length: difficulty.rows }, (_, row) =>
    Array.from({ length: difficulty.columns }, (_, column): MineCell => ({
      row,
      column,
      hasMine: false,
      adjacentMines: 0,
      revealed: false,
      flagged: false
    }))
  );
}

function cloneBoard(board: MineBoard): MineBoard {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function getNeighbors(board: MineBoard, row: number, column: number): MineCell[] {
  const cells: MineCell[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) {
        continue;
      }

      const target = board[row + rowOffset]?.[column + columnOffset];

      if (target) {
        cells.push(target);
      }
    }
  }

  return cells;
}

function getSafeZone(row: number, column: number) {
  const safeZone = new Set<string>();

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      safeZone.add(`${row + rowOffset}-${column + columnOffset}`);
    }
  }

  return safeZone;
}

export function plantMines(board: MineBoard, difficulty: Difficulty, firstRow: number, firstColumn: number): MineBoard {
  const nextBoard = cloneBoard(board);
  const safeZone = getSafeZone(firstRow, firstColumn);
  const candidates = nextBoard
    .flat()
    .filter((cell) => !safeZone.has(`${cell.row}-${cell.column}`))
    .map((cell) => ({ row: cell.row, column: cell.column }));

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }

  candidates.slice(0, difficulty.mines).forEach(({ row, column }) => {
    nextBoard[row][column].hasMine = true;
  });

  nextBoard.flat().forEach((cell) => {
    cell.adjacentMines = getNeighbors(nextBoard, cell.row, cell.column).filter((neighbor) => neighbor.hasMine).length;
  });

  return nextBoard;
}

export function revealCell(board: MineBoard, row: number, column: number): MineBoard {
  const nextBoard = cloneBoard(board);
  const start = nextBoard[row][column];

  if (start.revealed || start.flagged) {
    return nextBoard;
  }

  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || current.revealed || current.flagged) {
      continue;
    }

    current.revealed = true;

    if (current.adjacentMines !== 0 || current.hasMine) {
      continue;
    }

    getNeighbors(nextBoard, current.row, current.column).forEach((neighbor) => {
      if (!neighbor.revealed && !neighbor.flagged && !neighbor.hasMine) {
        queue.push(neighbor);
      }
    });
  }

  return nextBoard;
}

export function revealAllMines(board: MineBoard): MineBoard {
  const nextBoard = cloneBoard(board);

  nextBoard.flat().forEach((cell) => {
    if (cell.hasMine) {
      cell.revealed = true;
    }
  });

  return nextBoard;
}

export function toggleFlag(board: MineBoard, row: number, column: number): MineBoard {
  const nextBoard = cloneBoard(board);
  const cell = nextBoard[row][column];

  if (!cell.revealed) {
    cell.flagged = !cell.flagged;
  }

  return nextBoard;
}

export function hasWon(board: MineBoard): boolean {
  return board.flat().every((cell) => cell.hasMine || cell.revealed);
}

export function countFlags(board: MineBoard): number {
  return board.flat().filter((cell) => cell.flagged).length;
}

export function countRevealedSafeCells(board: MineBoard): number {
  return board.flat().filter((cell) => cell.revealed && !cell.hasMine).length;
}
