export const BOARD_COLUMNS = 8;
export const VISIBLE_ROWS = 16;
export const HIDDEN_ROWS = 2;
export const TOTAL_ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

export const blockColors = ["coral", "gold", "mint", "sky", "violet", "rose"] as const;

export type BlockColor = (typeof blockColors)[number];
export type BoardCell = BlockColor | null;
export type Board = BoardCell[][];
export type Orientation = 0 | 1 | 2 | 3;

export type FallingPair = {
  row: number;
  column: number;
  orientation: Orientation;
  colors: [BlockColor, BlockColor];
};

export type PairCell = {
  row: number;
  column: number;
  color: BlockColor;
};

export type MatchResult = {
  cells: Set<string>;
  colors: Set<BlockColor>;
  lines: number;
};

const orientationOffsets: Record<Orientation, { row: number; column: number }> = {
  0: { row: -1, column: 0 },
  1: { row: 0, column: 1 },
  2: { row: 1, column: 0 },
  3: { row: 0, column: -1 }
};

const matchDirections = [
  { row: 0, column: 1 },
  { row: 1, column: 0 },
  { row: 1, column: 1 },
  { row: 1, column: -1 }
] as const;

export function cellKey(row: number, column: number) {
  return `${row}:${column}`;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () => Array<BoardCell>(BOARD_COLUMNS).fill(null));
}

export function createRandomPair(colorCount: number, random = Math.random): FallingPair {
  const availableColors = blockColors.slice(0, Math.max(1, Math.min(colorCount, blockColors.length)));
  const randomColor = () => availableColors[Math.floor(random() * availableColors.length)] ?? availableColors[0];

  return {
    row: 1,
    column: Math.floor(BOARD_COLUMNS / 2) - 1,
    orientation: 0,
    colors: [randomColor(), randomColor()]
  };
}

export function getPairCells(pair: FallingPair): [PairCell, PairCell] {
  const offset = orientationOffsets[pair.orientation];
  return [
    { row: pair.row, column: pair.column, color: pair.colors[0] },
    {
      row: pair.row + offset.row,
      column: pair.column + offset.column,
      color: pair.colors[1]
    }
  ];
}

export function canPlacePair(board: Board, pair: FallingPair) {
  return getPairCells(pair).every(({ row, column }) => (
    row >= 0 && row < TOTAL_ROWS && column >= 0 && column < BOARD_COLUMNS && board[row][column] === null
  ));
}

export function movePair(pair: FallingPair, rowDelta: number, columnDelta: number): FallingPair {
  return { ...pair, row: pair.row + rowDelta, column: pair.column + columnDelta };
}

export function rotatePair(board: Board, pair: FallingPair, direction: -1 | 1): FallingPair {
  const orientation = ((pair.orientation + direction + 4) % 4) as Orientation;
  const kicks = [
    { row: 0, column: 0 },
    { row: 0, column: -1 },
    { row: 0, column: 1 },
    { row: -1, column: 0 }
  ];

  for (const kick of kicks) {
    const candidate = {
      ...pair,
      row: pair.row + kick.row,
      column: pair.column + kick.column,
      orientation
    };
    if (canPlacePair(board, candidate)) return candidate;
  }

  return pair;
}

export function getGhostPair(board: Board, pair: FallingPair): FallingPair {
  let ghost = pair;
  while (canPlacePair(board, movePair(ghost, 1, 0))) ghost = movePair(ghost, 1, 0);
  return ghost;
}

export function mergePair(board: Board, pair: FallingPair): Board {
  const nextBoard = board.map((row) => [...row]);
  getPairCells(pair).forEach(({ row, column, color }) => {
    nextBoard[row][column] = color;
  });
  return nextBoard;
}

function isInside(row: number, column: number) {
  return row >= 0 && row < TOTAL_ROWS && column >= 0 && column < BOARD_COLUMNS;
}

export function findMatches(board: Board): MatchResult {
  const cells = new Set<string>();
  const colors = new Set<BlockColor>();
  let lines = 0;

  for (let row = 0; row < TOTAL_ROWS; row += 1) {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const color = board[row][column];
      if (!color) continue;

      for (const direction of matchDirections) {
        const previousRow = row - direction.row;
        const previousColumn = column - direction.column;
        if (isInside(previousRow, previousColumn) && board[previousRow][previousColumn] === color) continue;

        const line: string[] = [];
        let scanRow = row;
        let scanColumn = column;
        while (isInside(scanRow, scanColumn) && board[scanRow][scanColumn] === color) {
          line.push(cellKey(scanRow, scanColumn));
          scanRow += direction.row;
          scanColumn += direction.column;
        }

        if (line.length >= 4) {
          lines += 1;
          colors.add(color);
          line.forEach((key) => cells.add(key));
        }
      }
    }
  }

  return { cells, colors, lines };
}

export function clearMatchedCells(board: Board, cells: Set<string>): Board {
  return board.map((row, rowIndex) => row.map((cell, columnIndex) => (
    cells.has(cellKey(rowIndex, columnIndex)) ? null : cell
  )));
}

export function applyGravity(board: Board): Board {
  const nextBoard = createEmptyBoard();

  for (let column = 0; column < BOARD_COLUMNS; column += 1) {
    const blocks: BlockColor[] = [];
    for (let row = TOTAL_ROWS - 1; row >= 0; row -= 1) {
      const color = board[row][column];
      if (color) blocks.push(color);
    }
    blocks.forEach((color, index) => {
      nextBoard[TOTAL_ROWS - 1 - index][column] = color;
    });
  }

  return nextBoard;
}

export function hasBlocksAboveTop(board: Board) {
  return board.slice(0, HIDDEN_ROWS).some((row) => row.some(Boolean));
}

export function calculateClearScore(match: MatchResult, chain: number) {
  const chainMultipliers = [1, 2, 4, 8, 12];
  const multiplier = chainMultipliers[Math.min(Math.max(chain, 1), chainMultipliers.length) - 1];
  const sizeBonus = Math.max(0, match.cells.size - 4) * 20;
  const lineBonus = Math.max(0, match.lines - 1) * 40;
  const colorBonus = Math.max(0, match.colors.size - 1) * 60;
  return (match.cells.size * 10 + sizeBonus + lineBonus + colorBonus) * multiplier;
}
