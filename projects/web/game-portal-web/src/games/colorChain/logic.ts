export const BOARD_COLUMNS = 8;
export const VISIBLE_ROWS = 16;
export const HIDDEN_ROWS = 2;
export const TOTAL_ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

export const blockColors = ["coral", "gold", "mint", "sky", "violet", "rose"] as const;
export const BOMB_BLOCK = "bomb" as const;

export type BlockColor = (typeof blockColors)[number];
export type BlockToken = BlockColor | typeof BOMB_BLOCK;
export type BoardCell = BlockToken | null;
export type Board = BoardCell[][];
export type Orientation = 0 | 1 | 2 | 3;

export type FallingPair = {
  row: number;
  column: number;
  orientation: Orientation;
  colors: [BlockToken, BlockToken];
};

export type PairCell = {
  row: number;
  column: number;
  color: BlockToken;
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

export function isBlockColor(token: BoardCell): token is BlockColor {
  return token !== null && token !== BOMB_BLOCK;
}

export function createRandomPair(colorCount: number, random = Math.random, bombChance = 0): FallingPair {
  const availableColors = blockColors.slice(0, Math.max(1, Math.min(colorCount, blockColors.length)));
  const randomColor = () => availableColors[Math.floor(random() * availableColors.length)] ?? availableColors[0];

  const colors: [BlockToken, BlockToken] = [randomColor(), randomColor()];
  if (random() < Math.max(0, Math.min(1, bombChance))) {
    colors[random() < 0.5 ? 0 : 1] = BOMB_BLOCK;
  }

  return {
    row: 1,
    column: Math.floor(BOARD_COLUMNS / 2) - 1,
    orientation: 0,
    colors
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

  // In a one-cell-wide shaft a vertical pair cannot pass through a horizontal
  // orientation. Fall back to a half turn that swaps the two colors in place.
  if (pair.orientation === 0 || pair.orientation === 2) {
    const halfTurn: FallingPair = pair.orientation === 0
      ? { ...pair, row: pair.row - 1, orientation: 2 }
      : { ...pair, row: pair.row + 1, orientation: 0 };
    if (canPlacePair(board, halfTurn)) return halfTurn;
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
      if (!isBlockColor(color)) continue;

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
    const blocks: BlockToken[] = [];
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

export function applyGravityStep(board: Board): { board: Board; moved: boolean } {
  const nextBoard = board.map((row) => [...row]);
  let moved = false;

  for (let column = 0; column < BOARD_COLUMNS; column += 1) {
    for (let row = TOTAL_ROWS - 2; row >= 0; row -= 1) {
      const color = nextBoard[row][column];
      if (color && nextBoard[row + 1][column] === null) {
        nextBoard[row + 1][column] = color;
        nextBoard[row][column] = null;
        moved = true;
      }
    }
  }

  return { board: nextBoard, moved };
}

/** Locks a pair, then lets each block fall independently until supported. */
export function settlePair(board: Board, pair: FallingPair): Board {
  return applyGravity(mergePair(board, pair));
}

function parseCellKey(key: string) {
  const [row, column] = key.split(":").map(Number);
  return { row, column };
}

export type SpecialClearResult = {
  cells: Set<string>;
  bombs: Set<string>;
};

export function findBombBlastCells(board: Board, initialBombs?: Iterable<string>): SpecialClearResult {
  const queued = initialBombs
    ? [...initialBombs]
    : board.flatMap((row, rowIndex) => row.flatMap((cell, columnIndex) => (
      cell === BOMB_BLOCK ? [cellKey(rowIndex, columnIndex)] : []
    )));
  const cells = new Set<string>();
  const bombs = new Set<string>();

  while (queued.length > 0) {
    const bombKey = queued.shift();
    if (!bombKey || bombs.has(bombKey)) continue;
    const { row, column } = parseCellKey(bombKey);
    if (!isInside(row, column) || board[row][column] !== BOMB_BLOCK) continue;
    bombs.add(bombKey);

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        const targetRow = row + rowOffset;
        const targetColumn = column + columnOffset;
        if (!isInside(targetRow, targetColumn) || board[targetRow][targetColumn] === null) continue;
        const targetKey = cellKey(targetRow, targetColumn);
        cells.add(targetKey);
        if (board[targetRow][targetColumn] === BOMB_BLOCK && !bombs.has(targetKey)) queued.push(targetKey);
      }
    }
  }

  return { cells, bombs };
}

export function findLaserClearCells(board: Board, column: number): SpecialClearResult {
  const cells = new Set<string>();
  const triggeredBombs = new Set<string>();
  if (column < 0 || column >= BOARD_COLUMNS) return { cells, bombs: triggeredBombs };

  for (let row = 0; row < TOTAL_ROWS; row += 1) {
    const cell = board[row][column];
    if (cell === null) continue;
    const key = cellKey(row, column);
    cells.add(key);
    if (cell === BOMB_BLOCK) triggeredBombs.add(key);
  }

  const blast = findBombBlastCells(board, triggeredBombs);
  blast.cells.forEach((key) => cells.add(key));
  return { cells, bombs: blast.bombs };
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
