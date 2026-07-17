import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const sourceUrl = new URL("../src/games/colorChain/logic.ts", import.meta.url);
const source = fs.readFileSync(sourceUrl, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const logic = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const {
  BOARD_COLUMNS,
  TOTAL_ROWS,
  applyGravity,
  calculateClearScore,
  clearMatchedCells,
  createEmptyBoard,
  findMatches,
} = logic;

const expectMatchSize = (cells, expected, label) => {
  const board = createEmptyBoard();
  for (const [row, column] of cells) board[row][column] = "coral";
  assert.equal(findMatches(board).cells.size, expected, label);
};

expectMatchSize([[17, 0], [17, 1], [17, 2], [17, 3]], 4, "horizontal match");
expectMatchSize([[14, 2], [15, 2], [16, 2], [17, 2]], 4, "vertical match");
expectMatchSize([[12, 0], [13, 1], [14, 2], [15, 3]], 4, "down-right diagonal match");
expectMatchSize([[12, 7], [13, 6], [14, 5], [15, 4]], 4, "down-left diagonal match");

const crossing = createEmptyBoard();
for (let column = 2; column <= 5; column += 1) crossing[10][column] = "gold";
for (let row = 8; row <= 11; row += 1) crossing[row][3] = "gold";
assert.equal(findMatches(crossing).cells.size, 7, "crossing cells are de-duplicated");

const floating = createEmptyBoard();
floating[0][0] = "coral";
floating[5][0] = "sky";
const fallen = applyGravity(floating);
assert.equal(fallen[TOTAL_ROWS - 2][0], "coral", "upper block keeps its order");
assert.equal(fallen[TOTAL_ROWS - 1][0], "sky", "lower block lands at the bottom");

let chainBoard = createEmptyBoard();
for (let column = 0; column < 4; column += 1) chainBoard[TOTAL_ROWS - 1][column] = "rose";
for (const [row, column] of [[16, 0], [14, 1], [15, 2], [13, 3]]) chainBoard[row][column] = "mint";
const firstClear = findMatches(chainBoard);
assert.equal(firstClear.cells.size, 4, "only the first group clears initially");
chainBoard = applyGravity(clearMatchedCells(chainBoard, firstClear.cells));
const secondClear = findMatches(chainBoard);
assert.equal(secondClear.cells.size, 4, "gravity creates a second-chain group");

const firstScore = calculateClearScore(secondClear, 1);
const chainScore = calculateClearScore(secondClear, 2);
assert.ok(chainScore > firstScore, "a chain awards a score bonus");
assert.equal(BOARD_COLUMNS, 8, "board width remains fixed");

console.log("Color Chain logic: all tests passed");
