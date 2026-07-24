import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function compileTypeScriptSource(relativePath, importMap = {}) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const source = fs.readFileSync(sourceUrl, "utf8");
  let compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  for (const [specifier, replacement] of Object.entries(importMap)) {
    compiled = compiled
      .replaceAll(`from "${specifier}"`, `from "${replacement}"`)
      .replaceAll(`from '${specifier}'`, `from '${replacement}'`);
  }

  return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}

const tokensUrl = compileTypeScriptSource("../src/games/colorChain/tokens.ts");
const tokens = await import(tokensUrl);
const rotationSpecialsUrl = compileTypeScriptSource(
  "../src/games/colorChain/rotationSpecials.ts",
  { "./tokens": tokensUrl }
);
const rotationSpecials = await import(rotationSpecialsUrl);
const rotationUrl = compileTypeScriptSource(
  "../src/games/colorChain/rotationLogic.ts",
  {
    "./tokens": tokensUrl,
    "./rotationSpecials": rotationSpecialsUrl,
  }
);
const rotation = await import(rotationUrl);
const interaction = await import(
  compileTypeScriptSource(
    "../src/games/colorChain/rotationInteraction.ts",
    { "./rotationLogic": rotationUrl }
  )
);

const {
  ROTATION_COLUMNS,
  ROTATION_ROWS,
  calculateRotationClearScore,
  clearRotationMatches,
  collapseRotationColumns,
  createEmptyRotationBoard,
  createPlayableRotationBoard,
  enumerateProductiveRotations,
  findRotationMatches,
  isProductiveRotation,
  refillRotationBoard,
  resolveRotationChain,
  resolveRotationMove,
  rotateSquare,
  shuffleToPlayableRotationBoard,
} = rotation;
const {
  findRotationSpecialClearCells,
  getRotationMatchRewards,
} = rotationSpecials;
const {
  classifyRotationGesture,
  findChangedOccupiedCells,
  findRefilledCells,
  moveRotationPoint,
} = interaction;
const {
  BOMB_BLOCK,
  COLOR_BREAKER_BLOCK,
  HORIZONTAL_LASER_BLOCK,
  VERTICAL_LASER_BLOCK,
} = tokens;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function makePatternBoard() {
  const colors = ["coral", "gold", "mint", "sky"];
  return Array.from(
    { length: ROTATION_ROWS },
    (_, row) => Array.from(
      { length: ROTATION_COLUMNS },
      (_, column) => colors[(row * 2 + column) % colors.length]
    )
  );
}

function assertBoardShape(board) {
  assert.equal(board.length, ROTATION_ROWS);
  board.forEach((row) => assert.equal(row.length, ROTATION_COLUMNS));
}

{
  assert.equal(
    classifyRotationGesture({ deltaX: 4, deltaY: 3, durationMs: 180 }),
    "clockwise",
    "a short tap rotates clockwise"
  );
  assert.equal(
    classifyRotationGesture({ deltaX: 30, deltaY: 4, durationMs: 400 }),
    "clockwise",
    "a right swipe rotates clockwise"
  );
  assert.equal(
    classifyRotationGesture({ deltaX: -30, deltaY: 4, durationMs: 400 }),
    "counterclockwise",
    "a left swipe rotates counterclockwise"
  );
  assert.equal(
    classifyRotationGesture({ deltaX: 8, deltaY: 34, durationMs: 220 }),
    null,
    "a vertical swipe is cancelled"
  );
  assert.deepEqual(
    moveRotationPoint({ row: 0, column: 0 }, "ArrowUp"),
    { row: 0, column: 0 },
    "keyboard navigation stays inside the top edge"
  );
  assert.deepEqual(
    moveRotationPoint({ row: 6, column: 6 }, "ArrowRight"),
    { row: 6, column: 6 },
    "keyboard navigation stays inside the right edge"
  );
  assert.deepEqual(
    moveRotationPoint({ row: 3, column: 3 }, "ArrowLeft"),
    { row: 3, column: 2 },
    "keyboard navigation moves one intersection"
  );

  const beforeMotion = createEmptyRotationBoard();
  beforeMotion[7][0] = "coral";
  beforeMotion[7][1] = "gold";
  const afterMotion = createEmptyRotationBoard();
  afterMotion[7][0] = "coral";
  afterMotion[6][1] = "gold";
  assert.deepEqual(
    [...findChangedOccupiedCells(beforeMotion, afterMotion)],
    ["6:1"],
    "only visibly changed occupied cells receive falling animation"
  );
  assert.deepEqual(
    [...findRefilledCells(beforeMotion, afterMotion)],
    ["6:1"],
    "only newly occupied cells receive refill animation"
  );
}

{
  const board = makePatternBoard();
  board[0][0] = "coral";
  board[0][1] = "gold";
  board[1][0] = "mint";
  board[1][1] = "sky";
  const original = structuredClone(board);
  const clockwise = rotateSquare(board, 0, 0, "clockwise");
  assert.deepEqual(
    [
      [clockwise[0][0], clockwise[0][1]],
      [clockwise[1][0], clockwise[1][1]],
    ],
    [
      ["mint", "coral"],
      ["sky", "gold"],
    ],
    "clockwise rotation maps all four cells correctly"
  );
  const counterclockwise = rotateSquare(board, 0, 0, "counterclockwise");
  assert.deepEqual(
    [
      [counterclockwise[0][0], counterclockwise[0][1]],
      [counterclockwise[1][0], counterclockwise[1][1]],
    ],
    [
      ["gold", "sky"],
      ["coral", "mint"],
    ],
    "counterclockwise rotation maps all four cells correctly"
  );
  assert.deepEqual(board, original, "rotation does not mutate the source board");
  assert.deepEqual(
    rotateSquare(clockwise, 0, 0, "counterclockwise"),
    board,
    "opposite rotations restore the board"
  );

  let fourTurns = board;
  for (let index = 0; index < 4; index += 1) {
    fourTurns = rotateSquare(fourTurns, 0, 0, "clockwise");
  }
  assert.deepEqual(fourTurns, board, "four clockwise turns restore the board");
  assert.throws(() => rotateSquare(board, 7, 7, "clockwise"), RangeError);
}

{
  const cases = [
    {
      label: "horizontal",
      cells: [[2, 1], [2, 2], [2, 3], [2, 4]],
      direction: "horizontal",
    },
    {
      label: "vertical",
      cells: [[1, 5], [2, 5], [3, 5], [4, 5]],
      direction: "vertical",
    },
    {
      label: "diagonal-down",
      cells: [[1, 1], [2, 2], [3, 3], [4, 4]],
      direction: "diagonal-down",
    },
    {
      label: "diagonal-up",
      cells: [[5, 1], [4, 2], [3, 3], [2, 4]],
      direction: "diagonal-up",
    },
  ];

  for (const testCase of cases) {
    const board = makePatternBoard();
    for (const [row, column] of testCase.cells) board[row][column] = "rose";
    const matches = findRotationMatches(board);
    assert.ok(
      matches.lines.some((line) => line.direction === testCase.direction),
      `${testCase.label} matches are detected`
    );
    testCase.cells.forEach(([row, column]) => {
      assert.ok(matches.cells.has(`${row}:${column}`), `${testCase.label} includes ${row}:${column}`);
    });
  }
}

{
  const board = makePatternBoard();
  board[3][1] = "mint";
  board[3][2] = "mint";
  board[4][2] = "mint";
  assert.equal(findRotationMatches(board).cells.size, 0, "guaranteed board starts without matches");
  assert.equal(
    isProductiveRotation(board, 3, 2, "clockwise"),
    true,
    "the guaranteed rotation creates a match"
  );
  assert.ok(enumerateProductiveRotations(board).length > 0);

  const invalidMove = resolveRotationMove(
    board,
    { row: 0, column: 0, direction: "clockwise" },
    seededRandom(1),
    { colorCount: 4 }
  );
  assert.equal(invalidMove.productive, false);
  assert.equal(invalidMove.reverted, true);
  assert.deepEqual(invalidMove.board, board, "an invalid move is reverted");
}

{
  for (let seed = 1; seed <= 1000; seed += 1) {
    const board = createPlayableRotationBoard(
      { colorCount: 4 },
      seededRandom(seed)
    );
    assertBoardShape(board);
    assert.equal(findRotationMatches(board).cells.size, 0, `seed ${seed} has no initial match`);
    assert.ok(enumerateProductiveRotations(board).length > 0, `seed ${seed} has a valid move`);
  }
}

{
  const board = createEmptyRotationBoard();
  board[0][0] = "coral";
  board[3][0] = "gold";
  board[7][0] = "mint";
  const collapsed = collapseRotationColumns(board);
  assert.deepEqual(
    [collapsed[5][0], collapsed[6][0], collapsed[7][0]],
    ["coral", "gold", "mint"],
    "gravity preserves vertical order"
  );
  assert.equal(collapsed[4][0], null);

  const refilled = refillRotationBoard(collapsed, seededRandom(5), { colorCount: 4 });
  assertBoardShape(refilled);
  assert.ok(refilled.flat().every((cell) => ["coral", "gold", "mint", "sky"].includes(cell)));
}

{
  const board = makePatternBoard();
  for (let column = 0; column < 4; column += 1) board[7][column] = "coral";
  const matches = findRotationMatches(board);
  assert.equal(calculateRotationClearScore(matches, 1), 40);
  assert.equal(calculateRotationClearScore(matches, 2), 120);
  const cleared = clearRotationMatches(board, matches.cells);
  assert.ok([...matches.cells].every((key) => {
    const [row, column] = key.split(":").map(Number);
    return cleared[row][column] === null;
  }));

  const resolved = resolveRotationChain(board, seededRandom(19), {
    colorCount: 4,
    maxChainSteps: 30,
  });
  assert.ok(resolved.steps.length >= 1);
  assert.equal(resolved.capped, false);
  assert.equal(findRotationMatches(resolved.board).cells.size, 0);
}

{
  const board = createPlayableRotationBoard({ colorCount: 4 }, seededRandom(77));
  const shuffled = shuffleToPlayableRotationBoard(board, seededRandom(88), { colorCount: 4 });
  assertBoardShape(shuffled);
  assert.equal(findRotationMatches(shuffled).cells.size, 0);
  assert.ok(enumerateProductiveRotations(shuffled).length > 0);
}

{
  const board = makePatternBoard();
  board[0][0] = BOMB_BLOCK;
  board[0][2] = BOMB_BLOCK;
  assert.equal(
    isProductiveRotation(board, 0, 0, "clockwise"),
    true,
    "forming a new adjacent equal-special pair is productive"
  );
}

{
  const rewards = getRotationMatchRewards([
    {
      cells: ["3:1", "3:2", "3:3", "3:4", "3:5"],
      color: "coral",
      direction: "horizontal",
    },
  ], ["3:4"]);
  assert.deepEqual(
    rewards,
    [{ key: "3:4", token: HORIZONTAL_LASER_BLOCK }],
    "a five-block horizontal line rewards a Chain Wave at a rotated cell"
  );

  const crossedRewards = getRotationMatchRewards([
    {
      cells: ["3:1", "3:2", "3:3", "3:4"],
      color: "gold",
      direction: "horizontal",
    },
    {
      cells: ["1:3", "2:3", "3:3", "4:3"],
      color: "gold",
      direction: "vertical",
    },
  ]);
  assert.deepEqual(
    crossedRewards,
    [{ key: "3:3", token: BOMB_BLOCK }],
    "crossing horizontal and vertical matches reward one Chain Bomb"
  );

  const verticalRewards = getRotationMatchRewards([
    {
      cells: ["1:5", "2:5", "3:5", "4:5", "5:5"],
      color: "mint",
      direction: "vertical",
    },
  ]);
  assert.equal(verticalRewards[0]?.token, VERTICAL_LASER_BLOCK);

  const diagonalRewards = getRotationMatchRewards([
    {
      cells: ["1:1", "2:2", "3:3", "4:4", "5:5"],
      color: "sky",
      direction: "diagonal-down",
    },
  ]);
  assert.equal(diagonalRewards[0]?.token, COLOR_BREAKER_BLOCK);
}

{
  const board = makePatternBoard();
  board[4][4] = BOMB_BLOCK;
  const result = findRotationSpecialClearCells(
    board,
    ["4:3"],
    seededRandom(7)
  );
  assert.ok(
    result.effects.some((effect) => effect.token === BOMB_BLOCK && !effect.super),
    "a bomb next to a cleared block activates"
  );
  for (let row = 3; row <= 5; row += 1) {
    for (let column = 3; column <= 5; column += 1) {
      assert.ok(result.cells.has(`${row}:${column}`), "a normal bomb clears its 3x3 area");
    }
  }
}

{
  const pillarBoard = makePatternBoard();
  pillarBoard[4][4] = VERTICAL_LASER_BLOCK;
  const pillar = findRotationSpecialClearCells(
    pillarBoard,
    ["4:3"],
    seededRandom(70)
  );
  for (let row = 0; row < ROTATION_ROWS; row += 1) {
    assert.ok(pillar.cells.has(`${row}:4`), "Chain Pillar clears one full column");
  }

  const waveBoard = makePatternBoard();
  waveBoard[4][4] = HORIZONTAL_LASER_BLOCK;
  const wave = findRotationSpecialClearCells(
    waveBoard,
    ["4:3"],
    seededRandom(71)
  );
  for (let column = 0; column < ROTATION_COLUMNS; column += 1) {
    assert.ok(wave.cells.has(`4:${column}`), "Chain Wave clears one full row");
  }
}

{
  const board = makePatternBoard();
  board[3][3] = VERTICAL_LASER_BLOCK;
  board[4][3] = VERTICAL_LASER_BLOCK;
  const result = findRotationSpecialClearCells(board, [], seededRandom(8));
  assert.ok(
    result.effects.some((effect) => effect.token === VERTICAL_LASER_BLOCK && effect.super),
    "adjacent pillars automatically activate Trinity Pillar"
  );
  for (let row = 0; row < ROTATION_ROWS; row += 1) {
    for (let column = 2; column <= 4; column += 1) {
      assert.ok(result.cells.has(`${row}:${column}`), "Trinity Pillar clears three columns");
    }
  }
}

{
  const bombBoard = makePatternBoard();
  bombBoard[3][3] = BOMB_BLOCK;
  bombBoard[3][4] = BOMB_BLOCK;
  const grandBomb = findRotationSpecialClearCells(bombBoard, [], seededRandom(80));
  assert.equal(grandBomb.cells.size, 25, "Grand Chain Bomb clears a 5x5 area");
  assert.ok(
    grandBomb.effects.some((effect) => effect.token === BOMB_BLOCK && effect.super)
  );

  const waveBoard = makePatternBoard();
  waveBoard[3][3] = HORIZONTAL_LASER_BLOCK;
  waveBoard[4][3] = HORIZONTAL_LASER_BLOCK;
  const trinityWave = findRotationSpecialClearCells(waveBoard, [], seededRandom(81));
  for (let row = 3; row <= 5; row += 1) {
    for (let column = 0; column < ROTATION_COLUMNS; column += 1) {
      assert.ok(
        trinityWave.cells.has(`${row}:${column}`),
        "Trinity Wave clears three rows"
      );
    }
  }

  const prismBoard = makePatternBoard();
  prismBoard[3][3] = COLOR_BREAKER_BLOCK;
  prismBoard[3][4] = COLOR_BREAKER_BLOCK;
  const prismNova = findRotationSpecialClearCells(prismBoard, [], seededRandom(82));
  assert.equal(prismNova.cells.size, 64, "Prism Nova clears every normal color and its pair");
  assert.ok(
    prismNova.effects.some((effect) => effect.token === COLOR_BREAKER_BLOCK && effect.super)
  );
}

{
  const board = makePatternBoard();
  board[4][4] = COLOR_BREAKER_BLOCK;
  board[4][3] = "gold";
  const result = findRotationSpecialClearCells(
    board,
    ["4:3"],
    seededRandom(9)
  );
  const prism = result.effects.find((effect) => effect.token === COLOR_BREAKER_BLOCK);
  assert.equal(prism?.targetColor, "gold", "Prism Break inherits the adjacent cleared color");
  board.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    if (cell === "gold") {
      assert.ok(result.cells.has(`${rowIndex}:${columnIndex}`));
    }
  }));
}

{
  const board = createEmptyRotationBoard();
  const refilled = refillRotationBoard(
    board,
    () => 0,
    { colorCount: 4, maxSpecialBlocks: 2, specialDropRate: 1 }
  );
  assert.equal(
    refilled.flat().filter((cell) => cell === BOMB_BLOCK).length,
    2,
    "random refill respects the special-block cap"
  );
}

console.log("Color Chain rotation logic tests passed.");
