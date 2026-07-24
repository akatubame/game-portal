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
const rotation = await import(
  compileTypeScriptSource(
    "../src/games/colorChain/rotationLogic.ts",
    { "./tokens": tokensUrl }
  )
);

const {
  ROTATION_COLUMNS,
  ROTATION_ROWS,
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
const { BOMB_BLOCK } = tokens;

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

console.log("Color Chain rotation logic tests passed.");
