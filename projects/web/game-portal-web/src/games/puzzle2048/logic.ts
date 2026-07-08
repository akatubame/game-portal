import type { Board, Direction, MoveResult } from "./types";

export const BOARD_SIZE = 4;

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => 0));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function boardsEqual(a: Board, b: Board): boolean {
  return a.every((row, rowIndex) => row.every((value, columnIndex) => value === b[rowIndex][columnIndex]));
}

export function getEmptyCells(board: Board) {
  const cells: Array<{ row: number; column: number }> = [];

  board.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value === 0) {
        cells.push({ row: rowIndex, column: columnIndex });
      }
    });
  });

  return cells;
}

export function addRandomTile(board: Board): Board {
  const nextBoard = cloneBoard(board);
  const emptyCells = getEmptyCells(nextBoard);

  if (emptyCells.length === 0) {
    return nextBoard;
  }

  const target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  nextBoard[target.row][target.column] = Math.random() < 0.9 ? 2 : 4;

  return nextBoard;
}

export function createInitialBoard(): Board {
  return addRandomTile(addRandomTile(createEmptyBoard()));
}

function collapseLine(line: number[]) {
  const compacted = line.filter(Boolean);
  const result: number[] = [];
  let scoreGain = 0;

  for (let index = 0; index < compacted.length; index += 1) {
    const current = compacted[index];
    const next = compacted[index + 1];

    if (current === next) {
      const merged = current * 2;
      result.push(merged);
      scoreGain += merged;
      index += 1;
    } else {
      result.push(current);
    }
  }

  while (result.length < BOARD_SIZE) {
    result.push(0);
  }

  return { line: result, scoreGain };
}

export function moveBoard(board: Board, direction: Direction): MoveResult {
  const nextBoard = createEmptyBoard();
  let scoreGain = 0;

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const line =
      direction === "left" || direction === "right"
        ? board[index]
        : board.map((row) => row[index]);

    const input = direction === "right" || direction === "down" ? [...line].reverse() : [...line];
    const collapsed = collapseLine(input);
    const output = direction === "right" || direction === "down" ? collapsed.line.reverse() : collapsed.line;

    scoreGain += collapsed.scoreGain;

    for (let offset = 0; offset < BOARD_SIZE; offset += 1) {
      if (direction === "left" || direction === "right") {
        nextBoard[index][offset] = output[offset];
      } else {
        nextBoard[offset][index] = output[offset];
      }
    }
  }

  return {
    board: nextBoard,
    scoreGain,
    moved: !boardsEqual(board, nextBoard)
  };
}

export function hasWon(board: Board): boolean {
  return board.some((row) => row.some((value) => value >= 2048));
}

export function canMove(board: Board): boolean {
  if (getEmptyCells(board).length > 0) {
    return true;
  }

  return board.some((row, rowIndex) =>
    row.some((value, columnIndex) => {
      const right = board[rowIndex][columnIndex + 1];
      const down = board[rowIndex + 1]?.[columnIndex];
      return value === right || value === down;
    })
  );
}
