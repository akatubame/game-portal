export const BOARD_COLUMNS = 8;
export const VISIBLE_ROWS = 16;
export const HIDDEN_ROWS = 2;
export const TOTAL_ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

export const blockColors = ["coral", "gold", "mint", "sky", "violet", "rose"] as const;
export const BOMB_BLOCK = "bomb" as const;
export const VERTICAL_LASER_BLOCK = "vertical-laser" as const;
export const HORIZONTAL_LASER_BLOCK = "horizontal-laser" as const;
export const COLOR_BREAKER_BLOCK = "color-breaker" as const;

export type BlockColor = (typeof blockColors)[number];
export type SpecialBlock =
  | typeof BOMB_BLOCK
  | typeof VERTICAL_LASER_BLOCK
  | typeof HORIZONTAL_LASER_BLOCK
  | typeof COLOR_BREAKER_BLOCK;
export type BlockToken = BlockColor | SpecialBlock;
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
  matchLines: MatchLine[];
  rewardBlocks: RewardBlock[];
};

export type MatchLine = {
  cells: string[];
  color: BlockColor;
  direction: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up";
};

export type RewardBlock = {
  key: string;
  token: SpecialBlock;
};

const orientationOffsets: Record<Orientation, { row: number; column: number }> = {
  0: { row: -1, column: 0 },
  1: { row: 0, column: 1 },
  2: { row: 1, column: 0 },
  3: { row: 0, column: -1 }
};

const matchDirections = [
  { row: 0, column: 1, direction: "horizontal" },
  { row: 1, column: 0, direction: "vertical" },
  { row: 1, column: 1, direction: "diagonal-down" },
  { row: 1, column: -1, direction: "diagonal-up" }
] as const;

export function cellKey(row: number, column: number) {
  return `${row}:${column}`;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () => Array<BoardCell>(BOARD_COLUMNS).fill(null));
}

export function isBlockColor(token: BoardCell): token is BlockColor {
  return token !== null && blockColors.includes(token as BlockColor);
}

export function createRandomPair(
  colorCount: number,
  random = Math.random,
  bombChance = 0,
  verticalLaserChance = 0,
  horizontalLaserChance = 0,
  colorBreakerChance = 0
): FallingPair {
  const availableColors = blockColors.slice(0, Math.max(1, Math.min(colorCount, blockColors.length)));
  const randomColor = () => availableColors[Math.floor(random() * availableColors.length)] ?? availableColors[0];

  const colors: [BlockToken, BlockToken] = [randomColor(), randomColor()];
  const normalizedBombChance = Math.max(0, Math.min(1, bombChance));
  const normalizedVerticalLaserChance = Math.max(0, Math.min(1 - normalizedBombChance, verticalLaserChance));
  const normalizedHorizontalLaserChance = Math.max(
    0,
    Math.min(1 - normalizedBombChance - normalizedVerticalLaserChance, horizontalLaserChance)
  );
  const normalizedColorBreakerChance = Math.max(
    0,
    Math.min(
      1 - normalizedBombChance - normalizedVerticalLaserChance - normalizedHorizontalLaserChance,
      colorBreakerChance
    )
  );
  const specialRoll = random();
  if (specialRoll < normalizedBombChance) {
    colors[random() < 0.5 ? 0 : 1] = BOMB_BLOCK;
  } else if (specialRoll < normalizedBombChance + normalizedVerticalLaserChance) {
    colors[random() < 0.5 ? 0 : 1] = VERTICAL_LASER_BLOCK;
  } else if (
    specialRoll < normalizedBombChance + normalizedVerticalLaserChance + normalizedHorizontalLaserChance
  ) {
    colors[random() < 0.5 ? 0 : 1] = HORIZONTAL_LASER_BLOCK;
  } else if (
    specialRoll
      < normalizedBombChance
      + normalizedVerticalLaserChance
      + normalizedHorizontalLaserChance
      + normalizedColorBreakerChance
  ) {
    colors[random() < 0.5 ? 0 : 1] = COLOR_BREAKER_BLOCK;
  }

  return {
    row: 1,
    column: Math.floor(BOARD_COLUMNS / 2) - 1,
    orientation: 0,
    colors
  };
}

export function preparePairForSpawn(pair: FallingPair): FallingPair {
  return {
    ...pair,
    row: 1,
    column: Math.floor(BOARD_COLUMNS / 2) - 1,
    orientation: 0
  };
}

export function addSlowCharge(current: number, clearedBlocks: number, active = false, chargePerBlock = 6.25) {
  if (active || clearedBlocks <= 0) return Math.max(0, Math.min(100, current));
  return Math.max(0, Math.min(100, current + clearedBlocks * chargePerBlock));
}

export function addLaserCharge(current: number, clearedBlocks: number, blocksToReady: number) {
  if (clearedBlocks <= 0 || blocksToReady <= 0) return Math.max(0, Math.min(100, current));
  return Math.max(0, Math.min(100, current + (clearedBlocks * 100) / blocksToReady));
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

/** Returns a newly spawned vertical pair in visual top-to-bottom order. */
export function getSpawnPreviewTokens(pair: FallingPair): [BlockToken, BlockToken] {
  return [pair.colors[1], pair.colors[0]];
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
  const matchLines: MatchLine[] = [];
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
          matchLines.push({ cells: line, color, direction: direction.direction });
        }
      }
    }
  }

  return { cells, colors, lines, matchLines, rewardBlocks: getMatchRewards(matchLines) };
}

function preferredRewardKeys(lines: MatchLine[]) {
  const keys: string[] = [];
  for (const line of lines) {
    const middle = Math.floor(line.cells.length / 2);
    for (let offset = 0; offset < line.cells.length; offset += 1) {
      const left = middle - offset;
      const right = middle + offset;
      if (left >= 0) keys.push(line.cells[left]);
      if (right < line.cells.length && right !== left) keys.push(line.cells[right]);
    }
  }
  return keys;
}

/**
 * Turns large matches into special block rewards. Each independent long line
 * earns its own reward, while actually intersecting horizontal and vertical
 * lines are combined into one bomb reward for that connected cross.
 */
export function getMatchRewards(matchLines: MatchLine[]): RewardBlock[] {
  const rewards: RewardBlock[] = [];
  const usedKeys = new Set<string>();
  const horizontalLines = matchLines.filter((line) => line.direction === "horizontal");
  const verticalLines = matchLines.filter((line) => line.direction === "vertical");
  const diagonalLines = matchLines.filter((line) => line.direction === "diagonal-down" || line.direction === "diagonal-up");

  const addReward = (token: SpecialBlock, lines: MatchLine[], preferredKey?: string) => {
    const candidates = preferredKey ? [preferredKey, ...preferredRewardKeys(lines)] : preferredRewardKeys(lines);
    const key = candidates.find((candidate) => !usedKeys.has(candidate));
    if (!key) return;
    usedKeys.add(key);
    rewards.push({ key, token });
  };

  const crossedLines = new Set<MatchLine>();
  const visitedLines = new Set<MatchLine>();
  const orthogonalLines = [...horizontalLines, ...verticalLines];

  for (const startLine of orthogonalLines) {
    if (visitedLines.has(startLine)) continue;
    const component: MatchLine[] = [];
    const intersections: string[] = [];
    const queued = [startLine];
    visitedLines.add(startLine);

    while (queued.length > 0) {
      const line = queued.shift();
      if (!line) continue;
      component.push(line);
      const candidates = line.direction === "horizontal" ? verticalLines : horizontalLines;
      for (const candidate of candidates) {
        const intersection = line.cells.find((key) => candidate.cells.includes(key));
        if (!intersection) continue;
        intersections.push(intersection);
        if (visitedLines.has(candidate)) continue;
        visitedLines.add(candidate);
        queued.push(candidate);
      }
    }

    const hasHorizontal = component.some((line) => line.direction === "horizontal");
    const hasVertical = component.some((line) => line.direction === "vertical");
    if (!hasHorizontal || !hasVertical) continue;
    component.forEach((line) => crossedLines.add(line));
    addReward(BOMB_BLOCK, component, intersections[0]);
  }

  verticalLines
    .filter((line) => line.cells.length >= 5 && !crossedLines.has(line))
    .forEach((line) => addReward(VERTICAL_LASER_BLOCK, [line]));
  horizontalLines
    .filter((line) => line.cells.length >= 5 && !crossedLines.has(line))
    .forEach((line) => addReward(HORIZONTAL_LASER_BLOCK, [line]));
  diagonalLines
    .filter((line) => line.cells.length >= 5)
    .forEach((line) => addReward(COLOR_BREAKER_BLOCK, [line]));

  return rewards;
}

export function clearMatchedCells(board: Board, cells: Set<string>, rewards: Iterable<RewardBlock> = []): Board {
  const nextBoard = board.map((row, rowIndex) => row.map((cell, columnIndex) => (
    cells.has(cellKey(rowIndex, columnIndex)) ? null : cell
  )));

  for (const reward of rewards) {
    if (!cells.has(reward.key)) continue;
    const { row, column } = parseCellKey(reward.key);
    if (isInside(row, column)) nextBoard[row][column] = reward.token;
  }

  return nextBoard;
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
  verticalLasers: Set<string>;
  horizontalLasers: Set<string>;
  colorBreakers: Set<string>;
  superBombs: Set<string>;
  superHorizontalLasers: Set<string>;
  superVerticalLasers: Set<string>;
  superColorBreakers: Set<string>;
  verticalLaserColumns: Set<number>;
  horizontalLaserRows: Set<number>;
  colorBreakerColors: Set<BlockColor>;
  colorBreakerClearedCells: Set<string>;
};

type SuperSpecialToken =
  | typeof BOMB_BLOCK
  | typeof VERTICAL_LASER_BLOCK
  | typeof HORIZONTAL_LASER_BLOCK
  | typeof COLOR_BREAKER_BLOCK;
type SpecialTrigger = "adjacent" | "effect";
type QueuedSpecial = { key: string; token: SpecialBlock; trigger: SpecialTrigger; triggerColor?: BlockColor };
type SuperSpecialGroup = {
  centerColumn: number;
  centerRow: number;
  id: string;
  keys: string[];
  token: SuperSpecialToken;
};
type SpecialEvent =
  | { eventKey: string; kind: "normal" }
  | { group: SuperSpecialGroup; kind: "super" };

const adjacentOffsets = [
  { row: -1, column: 0 },
  { row: 1, column: 0 },
  { row: 0, column: -1 },
  { row: 0, column: 1 }
] as const;

function isSpecialBlock(token: BoardCell): token is SpecialBlock {
  return token !== null && !isBlockColor(token);
}

function isSuperSpecialBlock(token: BoardCell): token is SuperSpecialToken {
  return token === BOMB_BLOCK
    || token === VERTICAL_LASER_BLOCK
    || token === HORIZONTAL_LASER_BLOCK
    || token === COLOR_BREAKER_BLOCK;
}

function findSuperSpecialGroups(board: Board): SuperSpecialGroup[] {
  const visited = new Set<string>();
  const groups: SuperSpecialGroup[] = [];

  for (let startRow = 0; startRow < TOTAL_ROWS; startRow += 1) {
    for (let startColumn = 0; startColumn < BOARD_COLUMNS; startColumn += 1) {
      const token = board[startRow][startColumn];
      if (!isSuperSpecialBlock(token)) continue;
      const startKey = cellKey(startRow, startColumn);
      if (visited.has(startKey)) continue;

      const keys: string[] = [];
      const queued = [startKey];
      visited.add(startKey);
      while (queued.length > 0) {
        const key = queued.shift();
        if (!key) continue;
        keys.push(key);
        const { row, column } = parseCellKey(key);
        for (const offset of adjacentOffsets) {
          const targetRow = row + offset.row;
          const targetColumn = column + offset.column;
          const targetKey = cellKey(targetRow, targetColumn);
          if (
            !isInside(targetRow, targetColumn)
            || visited.has(targetKey)
            || board[targetRow][targetColumn] !== token
          ) continue;
          visited.add(targetKey);
          queued.push(targetKey);
        }
      }

      if (keys.length < 2) continue;
      const positions = keys.map(parseCellKey);
      const centerRow = Math.round(positions.reduce((sum, position) => sum + position.row, 0) / positions.length);
      const centerColumn = Math.round(positions.reduce((sum, position) => sum + position.column, 0) / positions.length);
      groups.push({
        centerColumn,
        centerRow,
        id: `${token}:${[...keys].sort().join("|")}`,
        keys,
        token
      });
    }
  }

  return groups;
}

function randomColorOnBoard(board: Board): BlockColor | null {
  const available = blockColors.filter((color) => board.some((row) => row.includes(color)));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)] ?? null;
}

function emptySpecialClearResult(): SpecialClearResult {
  return {
    bombs: new Set<string>(),
    cells: new Set<string>(),
    colorBreakerColors: new Set<BlockColor>(),
    colorBreakerClearedCells: new Set<string>(),
    colorBreakers: new Set<string>(),
    horizontalLaserRows: new Set<number>(),
    horizontalLasers: new Set<string>(),
    superBombs: new Set<string>(),
    superColorBreakers: new Set<string>(),
    superHorizontalLasers: new Set<string>(),
    superVerticalLasers: new Set<string>(),
    verticalLaserColumns: new Set<number>(),
    verticalLasers: new Set<string>()
  };
}

function findSpecialCascade(
  board: Board,
  initialCells: Iterable<string>,
  initialSpecials: Iterable<QueuedSpecial>,
  autoTriggerSuper = false
): SpecialClearResult {
  const result = emptySpecialClearResult();
  const queued: SpecialEvent[] = [];
  const queuedEvents = new Set<string>();
  const queuedSpecials = new Map<string, QueuedSpecial>();
  const processedSpecials = new Set<string>();
  const superGroups = findSuperSpecialGroups(board);
  const groupByCell = new Map<string, SuperSpecialGroup>();
  superGroups.forEach((group) => group.keys.forEach((key) => groupByCell.set(key, group)));

  const queueSuperGroup = (group: SuperSpecialGroup) => {
    const eventKey = `super:${group.id}`;
    if (queuedEvents.has(eventKey)) return;
    queuedEvents.add(eventKey);
    queued.push({ group, kind: "super" });
  };

  const queueSpecial = (special: QueuedSpecial) => {
    const group = groupByCell.get(special.key);
    if (group) {
      queueSuperGroup(group);
      return;
    }
    const eventKey = `normal:${special.token}:${special.key}`;
    if (processedSpecials.has(eventKey)) return;
    const existing = queuedSpecials.get(eventKey);
    if (existing) {
      if (special.trigger === "effect" && existing.trigger !== "effect") {
        queuedSpecials.set(eventKey, { ...special, triggerColor: undefined });
      } else if (
        special.trigger === "adjacent"
        && existing.trigger === "adjacent"
        && !existing.triggerColor
        && special.triggerColor
      ) {
        queuedSpecials.set(eventKey, special);
      }
      return;
    }
    queuedEvents.add(eventKey);
    queuedSpecials.set(eventKey, special);
    queued.push({ eventKey, kind: "normal" });
  };

  const queueCell = (key: string, trigger: SpecialTrigger = "effect") => {
    const { row, column } = parseCellKey(key);
    if (!isInside(row, column) || board[row][column] === null) return;
    const firstClear = !result.cells.has(key);
    result.cells.add(key);
    const token = board[row][column];
    if (isSpecialBlock(token)) queueSpecial({ key, token, trigger });
    if (!firstClear) return;

    for (const offset of adjacentOffsets) {
      const targetRow = row + offset.row;
      const targetColumn = column + offset.column;
      if (!isInside(targetRow, targetColumn)) continue;
      const adjacentToken = board[targetRow][targetColumn];
      if (!isSpecialBlock(adjacentToken)) continue;
      if (adjacentToken === COLOR_BREAKER_BLOCK && !isBlockColor(token)) continue;
      queueSpecial({
        key: cellKey(targetRow, targetColumn),
        token: adjacentToken,
        trigger: "adjacent",
        ...(adjacentToken === COLOR_BREAKER_BLOCK && isBlockColor(token) ? { triggerColor: token } : {})
      });
    }
  };

  for (const special of initialSpecials) queueSpecial(special);
  if (autoTriggerSuper) superGroups.forEach(queueSuperGroup);
  for (const key of initialCells) queueCell(key);

  while (queued.length > 0) {
    const superIndex = queued.findIndex((event) => event.kind === "super");
    const nonBreakerIndex = queued.findIndex((event) => (
      event.kind === "normal" && queuedSpecials.get(event.eventKey)?.token !== COLOR_BREAKER_BLOCK
    ));
    const effectBreakerIndex = queued.findIndex((event) => (
      event.kind === "normal" && queuedSpecials.get(event.eventKey)?.trigger === "effect"
    ));
    const nextIndex = superIndex >= 0 ? superIndex : nonBreakerIndex >= 0 ? nonBreakerIndex : effectBreakerIndex >= 0 ? effectBreakerIndex : 0;
    const [special] = queued.splice(nextIndex, 1);
    if (!special) continue;

    if (special.kind === "super") {
      const { group } = special;
      const activeKeys = group.keys.filter((key) => {
        const { row, column } = parseCellKey(key);
        return isInside(row, column) && board[row][column] === group.token;
      });
      if (activeKeys.length < 2) continue;
      activeKeys.forEach((key) => {
        queueCell(key);
        if (group.token === BOMB_BLOCK) result.bombs.add(key);
        else if (group.token === VERTICAL_LASER_BLOCK) result.verticalLasers.add(key);
        else if (group.token === HORIZONTAL_LASER_BLOCK) result.horizontalLasers.add(key);
        else result.colorBreakers.add(key);
      });

      if (group.token === BOMB_BLOCK) {
        if (result.superBombs.has(group.id)) continue;
        result.superBombs.add(group.id);
        for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
          for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
            queueCell(cellKey(group.centerRow + rowOffset, group.centerColumn + columnOffset));
          }
        }
      } else if (group.token === VERTICAL_LASER_BLOCK) {
        if (result.superVerticalLasers.has(group.id)) continue;
        result.superVerticalLasers.add(group.id);
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const targetColumn = group.centerColumn + columnOffset;
          if (targetColumn < 0 || targetColumn >= BOARD_COLUMNS) continue;
          result.verticalLaserColumns.add(targetColumn);
          for (let targetRow = 0; targetRow < TOTAL_ROWS; targetRow += 1) {
            queueCell(cellKey(targetRow, targetColumn));
          }
        }
      } else if (group.token === HORIZONTAL_LASER_BLOCK) {
        if (result.superHorizontalLasers.has(group.id)) continue;
        result.superHorizontalLasers.add(group.id);
        for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
          const targetRow = group.centerRow + rowOffset;
          if (targetRow < 0 || targetRow >= TOTAL_ROWS) continue;
          result.horizontalLaserRows.add(targetRow);
          for (let targetColumn = 0; targetColumn < BOARD_COLUMNS; targetColumn += 1) {
            queueCell(cellKey(targetRow, targetColumn));
          }
        }
      } else {
        if (result.superColorBreakers.has(group.id)) continue;
        result.superColorBreakers.add(group.id);
        for (let targetRow = 0; targetRow < TOTAL_ROWS; targetRow += 1) {
          for (let targetColumn = 0; targetColumn < BOARD_COLUMNS; targetColumn += 1) {
            if (!isBlockColor(board[targetRow][targetColumn])) continue;
            const targetKey = cellKey(targetRow, targetColumn);
            result.colorBreakerClearedCells.add(targetKey);
            queueCell(targetKey);
          }
        }
      }
      continue;
    }

    const queuedSpecial = queuedSpecials.get(special.eventKey);
    if (!queuedSpecial) continue;
    processedSpecials.add(special.eventKey);
    const { row, column } = parseCellKey(queuedSpecial.key);
    if (!isInside(row, column) || board[row][column] !== queuedSpecial.token) continue;

    if (queuedSpecial.token === BOMB_BLOCK) {
      if (result.bombs.has(queuedSpecial.key)) continue;
      result.bombs.add(queuedSpecial.key);
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          queueCell(cellKey(row + rowOffset, column + columnOffset));
        }
      }
    } else if (queuedSpecial.token === VERTICAL_LASER_BLOCK) {
      if (result.verticalLasers.has(queuedSpecial.key)) continue;
      result.verticalLasers.add(queuedSpecial.key);
      result.verticalLaserColumns.add(column);
      for (let targetRow = 0; targetRow < TOTAL_ROWS; targetRow += 1) {
        queueCell(cellKey(targetRow, column));
      }
    } else if (queuedSpecial.token === HORIZONTAL_LASER_BLOCK) {
      if (result.horizontalLasers.has(queuedSpecial.key)) continue;
      result.horizontalLasers.add(queuedSpecial.key);
      result.horizontalLaserRows.add(row);
      for (let targetColumn = 0; targetColumn < BOARD_COLUMNS; targetColumn += 1) {
        queueCell(cellKey(row, targetColumn));
      }
    } else {
      if (result.colorBreakers.has(queuedSpecial.key)) continue;
      result.colorBreakers.add(queuedSpecial.key);
      queueCell(queuedSpecial.key, queuedSpecial.trigger);
      const targetColor = queuedSpecial.trigger === "effect"
        ? randomColorOnBoard(board)
        : queuedSpecial.triggerColor ?? randomColorOnBoard(board);
      if (!targetColor) continue;
      result.colorBreakerColors.add(targetColor);
      for (let targetRow = 0; targetRow < TOTAL_ROWS; targetRow += 1) {
        for (let targetColumn = 0; targetColumn < BOARD_COLUMNS; targetColumn += 1) {
          if (board[targetRow][targetColumn] !== targetColor) continue;
          const targetKey = cellKey(targetRow, targetColumn);
          result.colorBreakerClearedCells.add(targetKey);
          queueCell(targetKey);
        }
      }
    }
  }

  return result;
}

function collectSpecials(board: Board, token?: SpecialBlock) {
  return board.flatMap((row, rowIndex) => row.flatMap((cell, columnIndex) => (
    isSpecialBlock(cell) && (!token || cell === token)
      ? [{ key: cellKey(rowIndex, columnIndex), token: cell }]
      : []
  )));
}

/**
 * Expands a normal clear into any special blocks touching it vertically or
 * horizontally. Specials caught by the resulting blast or beam are chained by
 * findSpecialCascade.
 */
export function findTriggeredSpecialClearCells(board: Board, clearedCells: Iterable<string>): SpecialClearResult {
  return findSpecialCascade(board, clearedCells, []);
}

/** Automatically activates adjacent groups of matching special blocks. */
export function findSuperSpecialClearCells(board: Board): SpecialClearResult {
  return findSpecialCascade(board, [], [], true);
}

export function findBombBlastCells(board: Board, initialBombs?: Iterable<string>): SpecialClearResult {
  const specials = initialBombs
    ? [...initialBombs].map((key) => ({ key, token: BOMB_BLOCK as typeof BOMB_BLOCK, trigger: "effect" as const }))
    : collectSpecials(board, BOMB_BLOCK).map((special) => ({ ...special, trigger: "effect" as const }));
  return findSpecialCascade(board, [], specials);
}

export function findVerticalLaserClearCells(board: Board, initialLasers?: Iterable<string>): SpecialClearResult {
  const specials = initialLasers
    ? [...initialLasers].map((key) => ({ key, token: VERTICAL_LASER_BLOCK as typeof VERTICAL_LASER_BLOCK, trigger: "effect" as const }))
    : collectSpecials(board, VERTICAL_LASER_BLOCK).map((special) => ({ ...special, trigger: "effect" as const }));
  return findSpecialCascade(board, [], specials);
}

export function findHorizontalLaserClearCells(board: Board, row: number): SpecialClearResult {
  if (row < 0 || row >= TOTAL_ROWS) return emptySpecialClearResult();

  const cells: string[] = [];
  const specials: QueuedSpecial[] = [];

  for (let column = 0; column < BOARD_COLUMNS; column += 1) {
    const cell = board[row][column];
    if (cell === null) continue;
    const key = cellKey(row, column);
    cells.push(key);
    if (isSpecialBlock(cell)) specials.push({ key, token: cell, trigger: "effect" });
  }

  return findSpecialCascade(board, cells, specials);
}

export function hasBlocksAboveTop(board: Board) {
  return board.slice(0, HIDDEN_ROWS).some((row) => row.some(Boolean));
}

const CHAIN_MULTIPLIERS = [1, 3, 10, 25, 60, 120] as const;

export function getChainMultiplier(chain: number) {
  const normalizedChain = Math.max(1, Math.floor(chain));
  return CHAIN_MULTIPLIERS[Math.min(normalizedChain, CHAIN_MULTIPLIERS.length) - 1];
}

export function calculateClearScore(match: MatchResult, chain: number) {
  const multiplier = getChainMultiplier(chain);
  const sizeBonus = Math.max(0, match.cells.size - 4) * 20;
  const lineBonus = Math.max(0, match.lines - 1) * 40;
  const colorBonus = Math.max(0, match.colors.size - 1) * 60;
  return (match.cells.size * 10 + sizeBonus + lineBonus + colorBonus) * multiplier;
}
