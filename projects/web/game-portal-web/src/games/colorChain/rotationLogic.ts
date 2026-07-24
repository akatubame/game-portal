import {
  BOMB_BLOCK,
  COLOR_BREAKER_BLOCK,
  HORIZONTAL_LASER_BLOCK,
  VERTICAL_LASER_BLOCK,
  blockColors,
  type BlockColor,
  type Board,
  type BoardCell,
  type SpecialBlock
} from "./tokens";

export const ROTATION_ROWS = 8;
export const ROTATION_COLUMNS = 8;
export const ROTATION_MAX_CHAIN_STEPS = 30;

export type RotationDirection = "clockwise" | "counterclockwise";

export type RotationPoint = {
  row: number;
  column: number;
};

export type RotationMove = RotationPoint & {
  direction: RotationDirection;
};

export type RotationMatchLine = {
  cells: string[];
  color: BlockColor;
  direction: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up";
};

export type RotationMatchResult = {
  cells: Set<string>;
  colors: Set<BlockColor>;
  lines: RotationMatchLine[];
};

export type RotationSettings = {
  colorCount: number;
  maxGenerateAttempts?: number;
  maxChainSteps?: number;
};

export type RotationChainStep = {
  chain: number;
  matches: RotationMatchResult;
  boardBeforeClear: Board;
  boardAfterClear: Board;
  boardAfterCollapse: Board;
  boardAfterRefill: Board;
};

export type RotationChainResult = {
  board: Board;
  steps: RotationChainStep[];
  capped: boolean;
};

export type RotationMoveResult = {
  board: Board;
  rotatedBoard: Board;
  productive: boolean;
  reverted: boolean;
  chain: RotationChainResult;
};

const specialBlocks = new Set<SpecialBlock>([
  BOMB_BLOCK,
  VERTICAL_LASER_BLOCK,
  HORIZONTAL_LASER_BLOCK,
  COLOR_BREAKER_BLOCK
]);

const matchDirections = [
  { row: 0, column: 1, direction: "horizontal" },
  { row: 1, column: 0, direction: "vertical" },
  { row: 1, column: 1, direction: "diagonal-down" },
  { row: 1, column: -1, direction: "diagonal-up" }
] as const;

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function assertRotationBoard(board: Board) {
  if (
    board.length !== ROTATION_ROWS
    || board.some((row) => row.length !== ROTATION_COLUMNS)
  ) {
    throw new RangeError(`Rotation board must be ${ROTATION_ROWS}x${ROTATION_COLUMNS}.`);
  }
}

function assertRotationPoint(row: number, column: number) {
  if (
    !Number.isInteger(row)
    || !Number.isInteger(column)
    || row < 0
    || row >= ROTATION_ROWS - 1
    || column < 0
    || column >= ROTATION_COLUMNS - 1
  ) {
    throw new RangeError("Rotation point must identify the top-left cell of a 2x2 area.");
  }
}

function isInside(row: number, column: number) {
  return row >= 0
    && row < ROTATION_ROWS
    && column >= 0
    && column < ROTATION_COLUMNS;
}

function cellKey(row: number, column: number) {
  return `${row}:${column}`;
}

function isBlockColor(cell: BoardCell): cell is BlockColor {
  return cell !== null && blockColors.includes(cell as BlockColor);
}

function isSpecialBlock(cell: BoardCell): cell is SpecialBlock {
  return cell !== null && specialBlocks.has(cell as SpecialBlock);
}

function getAvailableColors(colorCount: number) {
  const normalizedColorCount = Math.max(4, Math.min(blockColors.length, Math.floor(colorCount)));
  return blockColors.slice(0, normalizedColorCount);
}

function randomColor(colors: readonly BlockColor[], random: () => number) {
  const index = Math.min(colors.length - 1, Math.max(0, Math.floor(random() * colors.length)));
  return colors[index];
}

function makeSpecialPairKey(
  token: SpecialBlock,
  firstRow: number,
  firstColumn: number,
  secondRow: number,
  secondColumn: number
) {
  const first = cellKey(firstRow, firstColumn);
  const second = cellKey(secondRow, secondColumn);
  return `${token}:${first < second ? `${first}|${second}` : `${second}|${first}`}`;
}

function findAdjacentSpecialPairs(board: Board) {
  const pairs = new Set<string>();
  const directions = [
    { row: 0, column: 1 },
    { row: 1, column: 0 }
  ];

  for (let row = 0; row < ROTATION_ROWS; row += 1) {
    for (let column = 0; column < ROTATION_COLUMNS; column += 1) {
      const token = board[row][column];
      if (!isSpecialBlock(token)) {
        continue;
      }

      for (const direction of directions) {
        const nextRow = row + direction.row;
        const nextColumn = column + direction.column;
        if (isInside(nextRow, nextColumn) && board[nextRow][nextColumn] === token) {
          pairs.add(makeSpecialPairKey(token, row, column, nextRow, nextColumn));
        }
      }
    }
  }

  return pairs;
}

function hasNewAdjacentSpecialPair(before: Board, after: Board) {
  const beforePairs = findAdjacentSpecialPairs(before);
  return [...findAdjacentSpecialPairs(after)].some((pair) => !beforePairs.has(pair));
}

function createFallbackPlayableBoard(settings: RotationSettings): Board {
  const colors = getAvailableColors(settings.colorCount);
  const board = Array.from(
    { length: ROTATION_ROWS },
    (_, row) => Array.from(
      { length: ROTATION_COLUMNS },
      (_, column) => colors[(row * 2 + column) % colors.length]
    )
  );

  // (3,2)を時計回りに回すと、3行目の先頭4個が同色になる保証形。
  board[3][1] = colors[2];
  board[3][2] = colors[2];
  board[4][2] = colors[2];
  return board;
}

export function createEmptyRotationBoard(): Board {
  return Array.from(
    { length: ROTATION_ROWS },
    () => Array<BoardCell>(ROTATION_COLUMNS).fill(null)
  );
}

export function rotateSquare(
  board: Board,
  row: number,
  column: number,
  direction: RotationDirection
): Board {
  assertRotationBoard(board);
  assertRotationPoint(row, column);

  const next = cloneBoard(board);
  const topLeft = board[row][column];
  const topRight = board[row][column + 1];
  const bottomLeft = board[row + 1][column];
  const bottomRight = board[row + 1][column + 1];

  if (direction === "clockwise") {
    next[row][column] = bottomLeft;
    next[row][column + 1] = topLeft;
    next[row + 1][column + 1] = topRight;
    next[row + 1][column] = bottomRight;
  } else {
    next[row][column] = topRight;
    next[row][column + 1] = bottomRight;
    next[row + 1][column + 1] = bottomLeft;
    next[row + 1][column] = topLeft;
  }

  return next;
}

export function findRotationMatches(board: Board): RotationMatchResult {
  assertRotationBoard(board);
  const cells = new Set<string>();
  const colors = new Set<BlockColor>();
  const lines: RotationMatchLine[] = [];

  for (let row = 0; row < ROTATION_ROWS; row += 1) {
    for (let column = 0; column < ROTATION_COLUMNS; column += 1) {
      const color = board[row][column];
      if (!isBlockColor(color)) {
        continue;
      }

      for (const direction of matchDirections) {
        const previousRow = row - direction.row;
        const previousColumn = column - direction.column;
        if (
          isInside(previousRow, previousColumn)
          && board[previousRow][previousColumn] === color
        ) {
          continue;
        }

        const lineCells: string[] = [];
        let cursorRow = row;
        let cursorColumn = column;
        while (
          isInside(cursorRow, cursorColumn)
          && board[cursorRow][cursorColumn] === color
        ) {
          lineCells.push(cellKey(cursorRow, cursorColumn));
          cursorRow += direction.row;
          cursorColumn += direction.column;
        }

        if (lineCells.length >= 4) {
          lineCells.forEach((key) => cells.add(key));
          colors.add(color);
          lines.push({
            cells: lineCells,
            color,
            direction: direction.direction
          });
        }
      }
    }
  }

  return { cells, colors, lines };
}

export function isProductiveRotation(
  board: Board,
  row: number,
  column: number,
  direction: RotationDirection
) {
  const rotated = rotateSquare(board, row, column, direction);
  return findRotationMatches(rotated).cells.size > 0
    || hasNewAdjacentSpecialPair(board, rotated);
}

export function enumerateProductiveRotations(board: Board): RotationMove[] {
  assertRotationBoard(board);
  const moves: RotationMove[] = [];

  for (let row = 0; row < ROTATION_ROWS - 1; row += 1) {
    for (let column = 0; column < ROTATION_COLUMNS - 1; column += 1) {
      for (const direction of ["clockwise", "counterclockwise"] as const) {
        if (isProductiveRotation(board, row, column, direction)) {
          moves.push({ row, column, direction });
        }
      }
    }
  }

  return moves;
}

export function clearRotationMatches(board: Board, cells: ReadonlySet<string>): Board {
  assertRotationBoard(board);
  const next = cloneBoard(board);
  cells.forEach((key) => {
    const [row, column] = key.split(":").map(Number);
    if (isInside(row, column)) {
      next[row][column] = null;
    }
  });
  return next;
}

export function collapseRotationColumns(board: Board): Board {
  assertRotationBoard(board);
  const next = createEmptyRotationBoard();

  for (let column = 0; column < ROTATION_COLUMNS; column += 1) {
    let targetRow = ROTATION_ROWS - 1;
    for (let row = ROTATION_ROWS - 1; row >= 0; row -= 1) {
      const cell = board[row][column];
      if (cell !== null) {
        next[targetRow][column] = cell;
        targetRow -= 1;
      }
    }
  }

  return next;
}

export function refillRotationBoard(
  board: Board,
  random: () => number,
  settings: RotationSettings
): Board {
  assertRotationBoard(board);
  const colors = getAvailableColors(settings.colorCount);
  return board.map((row) => row.map((cell) => cell ?? randomColor(colors, random)));
}

export function resolveRotationChain(
  board: Board,
  random: () => number,
  settings: RotationSettings
): RotationChainResult {
  assertRotationBoard(board);
  const maxChainSteps = settings.maxChainSteps ?? ROTATION_MAX_CHAIN_STEPS;
  const steps: RotationChainStep[] = [];
  let current = cloneBoard(board);

  for (let chain = 1; chain <= maxChainSteps; chain += 1) {
    const matches = findRotationMatches(current);
    if (matches.cells.size === 0) {
      return { board: current, steps, capped: false };
    }

    const boardBeforeClear = cloneBoard(current);
    const boardAfterClear = clearRotationMatches(current, matches.cells);
    const boardAfterCollapse = collapseRotationColumns(boardAfterClear);
    const boardAfterRefill = refillRotationBoard(boardAfterCollapse, random, settings);
    steps.push({
      chain,
      matches,
      boardBeforeClear,
      boardAfterClear,
      boardAfterCollapse,
      boardAfterRefill
    });
    current = boardAfterRefill;
  }

  return {
    board: current,
    steps,
    capped: findRotationMatches(current).cells.size > 0
  };
}

export function resolveRotationMove(
  board: Board,
  move: RotationMove,
  random: () => number,
  settings: RotationSettings
): RotationMoveResult {
  const rotatedBoard = rotateSquare(board, move.row, move.column, move.direction);
  const productive = findRotationMatches(rotatedBoard).cells.size > 0
    || hasNewAdjacentSpecialPair(board, rotatedBoard);

  if (!productive) {
    const stable = { board: cloneBoard(board), steps: [], capped: false };
    return {
      board: stable.board,
      rotatedBoard,
      productive: false,
      reverted: true,
      chain: stable
    };
  }

  const chain = resolveRotationChain(rotatedBoard, random, settings);
  return {
    board: chain.board,
    rotatedBoard,
    productive: true,
    reverted: false,
    chain
  };
}

export function createPlayableRotationBoard(
  settings: RotationSettings,
  random: () => number = Math.random
): Board {
  const colors = getAvailableColors(settings.colorCount);
  const maxAttempts = settings.maxGenerateAttempts ?? 200;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const board = Array.from(
      { length: ROTATION_ROWS },
      () => Array.from(
        { length: ROTATION_COLUMNS },
        () => randomColor(colors, random)
      )
    );
    if (
      findRotationMatches(board).cells.size === 0
      && enumerateProductiveRotations(board).length > 0
    ) {
      return board;
    }
  }

  const fallback = createFallbackPlayableBoard(settings);
  if (
    findRotationMatches(fallback).cells.size > 0
    || enumerateProductiveRotations(fallback).length === 0
  ) {
    throw new Error("Failed to create a guaranteed playable rotation board.");
  }
  return fallback;
}

export function shuffleToPlayableRotationBoard(
  board: Board,
  random: () => number,
  settings: RotationSettings
): Board {
  assertRotationBoard(board);
  const source = board.flat();
  const maxAttempts = settings.maxGenerateAttempts ?? 200;

  if (source.every((cell) => cell !== null)) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const shuffled = [...source];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }
      const candidate = Array.from(
        { length: ROTATION_ROWS },
        (_, row) => shuffled.slice(
          row * ROTATION_COLUMNS,
          (row + 1) * ROTATION_COLUMNS
        )
      );
      if (
        findRotationMatches(candidate).cells.size === 0
        && enumerateProductiveRotations(candidate).length > 0
      ) {
        return candidate;
      }
    }
  }

  return createPlayableRotationBoard(settings, random);
}
