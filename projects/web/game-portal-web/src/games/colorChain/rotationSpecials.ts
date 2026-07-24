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

const ROWS = 8;
const COLUMNS = 8;

type RotationMatchLineLike = {
  cells: string[];
  color: BlockColor;
  direction: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up";
};

export type RotationRewardBlock = {
  key: string;
  token: SpecialBlock;
};

export type RotationSpecialEffect = {
  originKeys: string[];
  super: boolean;
  targetColor?: BlockColor;
  token: SpecialBlock;
};

export type RotationSpecialClearResult = {
  cells: Set<string>;
  effects: RotationSpecialEffect[];
};

type SpecialTrigger = "adjacent" | "effect";
type QueuedSpecial = {
  key: string;
  token: SpecialBlock;
  trigger: SpecialTrigger;
  triggerColor?: BlockColor;
};
type SuperSpecialGroup = {
  centerColumn: number;
  centerRow: number;
  id: string;
  keys: string[];
  token: SpecialBlock;
};
type SpecialEvent =
  | { eventKey: string; kind: "normal" }
  | { group: SuperSpecialGroup; kind: "super" };

const specialBlocks = new Set<SpecialBlock>([
  BOMB_BLOCK,
  VERTICAL_LASER_BLOCK,
  HORIZONTAL_LASER_BLOCK,
  COLOR_BREAKER_BLOCK
]);

const adjacentOffsets = [
  { row: -1, column: 0 },
  { row: 1, column: 0 },
  { row: 0, column: -1 },
  { row: 0, column: 1 }
] as const;

function cellKey(row: number, column: number) {
  return `${row}:${column}`;
}

function parseCellKey(key: string) {
  const [row, column] = key.split(":").map(Number);
  return { row, column };
}

function isInside(row: number, column: number) {
  return row >= 0 && row < ROWS && column >= 0 && column < COLUMNS;
}

function isBlockColor(token: BoardCell): token is BlockColor {
  return token !== null && blockColors.includes(token as BlockColor);
}

function isSpecialBlock(token: BoardCell): token is SpecialBlock {
  return token !== null && specialBlocks.has(token as SpecialBlock);
}

function preferredRewardKeys(lines: RotationMatchLineLike[]) {
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

export function getRotationMatchRewards(
  matchLines: RotationMatchLineLike[],
  preferredKeys: Iterable<string> = []
): RotationRewardBlock[] {
  const rewards: RotationRewardBlock[] = [];
  const usedKeys = new Set<string>();
  const preferred = [...preferredKeys];
  const horizontalLines = matchLines.filter((line) => line.direction === "horizontal");
  const verticalLines = matchLines.filter((line) => line.direction === "vertical");
  const diagonalLines = matchLines.filter(
    (line) => line.direction === "diagonal-down" || line.direction === "diagonal-up"
  );

  const addReward = (
    token: SpecialBlock,
    lines: RotationMatchLineLike[],
    preferredKey?: string
  ) => {
    const lineKeys = new Set(lines.flatMap((line) => line.cells));
    const candidates = [
      ...(preferredKey ? [preferredKey] : []),
      ...preferred.filter((key) => lineKeys.has(key)),
      ...preferredRewardKeys(lines)
    ];
    const key = candidates.find((candidate) => lineKeys.has(candidate) && !usedKeys.has(candidate));
    if (!key) return;
    usedKeys.add(key);
    rewards.push({ key, token });
  };

  const crossedLines = new Set<RotationMatchLineLike>();
  const visitedLines = new Set<RotationMatchLineLike>();
  const orthogonalLines = [...horizontalLines, ...verticalLines];

  for (const startLine of orthogonalLines) {
    if (visitedLines.has(startLine)) continue;
    const component: RotationMatchLineLike[] = [];
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

  const clearedCellCount = new Set(matchLines.flatMap((line) => line.cells)).size;
  const hasLongLineReward = matchLines.some((line) => line.cells.length >= 5);
  const alreadyHasBombReward = rewards.some((reward) => reward.token === BOMB_BLOCK);
  if (!hasLongLineReward && !alreadyHasBombReward && clearedCellCount >= 5) {
    addReward(BOMB_BLOCK, matchLines);
  }

  return rewards;
}

function findSuperSpecialGroups(board: Board): SuperSpecialGroup[] {
  const visited = new Set<string>();
  const groups: SuperSpecialGroup[] = [];

  for (let startRow = 0; startRow < ROWS; startRow += 1) {
    for (let startColumn = 0; startColumn < COLUMNS; startColumn += 1) {
      const token = board[startRow][startColumn];
      if (!isSpecialBlock(token)) continue;
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
          ) {
            continue;
          }
          visited.add(targetKey);
          queued.push(targetKey);
        }
      }

      if (keys.length < 2) continue;
      const positions = keys.map(parseCellKey);
      groups.push({
        centerColumn: Math.round(
          positions.reduce((sum, position) => sum + position.column, 0) / positions.length
        ),
        centerRow: Math.round(
          positions.reduce((sum, position) => sum + position.row, 0) / positions.length
        ),
        id: `${token}:${[...keys].sort().join("|")}`,
        keys,
        token
      });
    }
  }

  return groups;
}

export function hasRotationSuperSpecialGroup(board: Board) {
  return findSuperSpecialGroups(board).length > 0;
}

function randomColorOnBoard(board: Board, random: () => number): BlockColor | null {
  const available = blockColors.filter((color) => board.some((row) => row.includes(color)));
  if (available.length === 0) return null;
  const index = Math.min(
    available.length - 1,
    Math.max(0, Math.floor(random() * available.length))
  );
  return available[index] ?? null;
}

export function findRotationSpecialClearCells(
  board: Board,
  initialCells: Iterable<string>,
  random: () => number,
  autoTriggerSuper = true
): RotationSpecialClearResult {
  const result: RotationSpecialClearResult = {
    cells: new Set<string>(),
    effects: []
  };
  const queued: SpecialEvent[] = [];
  const queuedEvents = new Set<string>();
  const queuedSpecials = new Map<string, QueuedSpecial>();
  const processedSpecials = new Set<string>();
  const processedSuperGroups = new Set<string>();
  const superGroups = findSuperSpecialGroups(board);
  const groupByCell = new Map<string, SuperSpecialGroup>();
  superGroups.forEach((group) => group.keys.forEach((key) => groupByCell.set(key, group)));

  const queueSuperGroup = (group: SuperSpecialGroup) => {
    const eventKey = `super:${group.id}`;
    if (queuedEvents.has(eventKey) || processedSuperGroups.has(group.id)) return;
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
        ...(adjacentToken === COLOR_BREAKER_BLOCK && isBlockColor(token)
          ? { triggerColor: token }
          : {})
      });
    }
  };

  if (autoTriggerSuper) superGroups.forEach(queueSuperGroup);
  for (const key of initialCells) queueCell(key);

  while (queued.length > 0) {
    const superIndex = queued.findIndex((event) => event.kind === "super");
    const nonBreakerIndex = queued.findIndex((event) => (
      event.kind === "normal"
      && queuedSpecials.get(event.eventKey)?.token !== COLOR_BREAKER_BLOCK
    ));
    const effectBreakerIndex = queued.findIndex((event) => (
      event.kind === "normal"
      && queuedSpecials.get(event.eventKey)?.trigger === "effect"
    ));
    const nextIndex = superIndex >= 0
      ? superIndex
      : nonBreakerIndex >= 0
        ? nonBreakerIndex
        : effectBreakerIndex >= 0
          ? effectBreakerIndex
          : 0;
    const [event] = queued.splice(nextIndex, 1);
    if (!event) continue;

    if (event.kind === "super") {
      const { group } = event;
      const activeKeys = group.keys.filter((key) => {
        const { row, column } = parseCellKey(key);
        return isInside(row, column) && board[row][column] === group.token;
      });
      if (activeKeys.length < 2 || processedSuperGroups.has(group.id)) continue;
      processedSuperGroups.add(group.id);
      activeKeys.forEach((key) => queueCell(key));
      result.effects.push({
        originKeys: activeKeys,
        super: true,
        token: group.token
      });

      if (group.token === BOMB_BLOCK) {
        for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
          for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
            queueCell(cellKey(group.centerRow + rowOffset, group.centerColumn + columnOffset));
          }
        }
      } else if (group.token === VERTICAL_LASER_BLOCK) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const targetColumn = group.centerColumn + columnOffset;
          if (targetColumn < 0 || targetColumn >= COLUMNS) continue;
          for (let targetRow = 0; targetRow < ROWS; targetRow += 1) {
            queueCell(cellKey(targetRow, targetColumn));
          }
        }
      } else if (group.token === HORIZONTAL_LASER_BLOCK) {
        for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
          const targetRow = group.centerRow + rowOffset;
          if (targetRow < 0 || targetRow >= ROWS) continue;
          for (let targetColumn = 0; targetColumn < COLUMNS; targetColumn += 1) {
            queueCell(cellKey(targetRow, targetColumn));
          }
        }
      } else {
        for (let targetRow = 0; targetRow < ROWS; targetRow += 1) {
          for (let targetColumn = 0; targetColumn < COLUMNS; targetColumn += 1) {
            if (isBlockColor(board[targetRow][targetColumn])) {
              queueCell(cellKey(targetRow, targetColumn));
            }
          }
        }
      }
      continue;
    }

    const special = queuedSpecials.get(event.eventKey);
    if (!special || processedSpecials.has(event.eventKey)) continue;
    processedSpecials.add(event.eventKey);
    const { row, column } = parseCellKey(special.key);
    if (!isInside(row, column) || board[row][column] !== special.token) continue;

    let targetColor: BlockColor | null = null;
    if (special.token === BOMB_BLOCK) {
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          queueCell(cellKey(row + rowOffset, column + columnOffset));
        }
      }
    } else if (special.token === VERTICAL_LASER_BLOCK) {
      for (let targetRow = 0; targetRow < ROWS; targetRow += 1) {
        queueCell(cellKey(targetRow, column));
      }
    } else if (special.token === HORIZONTAL_LASER_BLOCK) {
      for (let targetColumn = 0; targetColumn < COLUMNS; targetColumn += 1) {
        queueCell(cellKey(row, targetColumn));
      }
    } else {
      targetColor = special.trigger === "adjacent"
        ? special.triggerColor ?? randomColorOnBoard(board, random)
        : randomColorOnBoard(board, random);
      queueCell(special.key, special.trigger);
      if (targetColor) {
        for (let targetRow = 0; targetRow < ROWS; targetRow += 1) {
          for (let targetColumn = 0; targetColumn < COLUMNS; targetColumn += 1) {
            if (board[targetRow][targetColumn] === targetColor) {
              queueCell(cellKey(targetRow, targetColumn));
            }
          }
        }
      }
    }

    result.effects.push({
      originKeys: [special.key],
      super: false,
      ...(targetColor ? { targetColor } : {}),
      token: special.token
    });
  }

  return result;
}

export function clearRotationCellsWithRewards(
  board: Board,
  cells: ReadonlySet<string>,
  rewards: Iterable<RotationRewardBlock>
): Board {
  const next = board.map((row) => [...row]);
  for (const key of cells) {
    const { row, column } = parseCellKey(key);
    if (isInside(row, column)) next[row][column] = null;
  }
  for (const reward of rewards) {
    if (!cells.has(reward.key)) continue;
    const { row, column } = parseCellKey(reward.key);
    if (isInside(row, column)) next[row][column] = reward.token;
  }
  return next;
}

export function calculateRotationSpecialScore(effects: RotationSpecialEffect[]) {
  return effects.reduce((score, effect) => {
    const base = effect.token === COLOR_BREAKER_BLOCK
      ? 300
      : effect.token === BOMB_BLOCK
        ? 180
        : 220;
    return score + base * (effect.super ? 4 : 1);
  }, 0);
}
