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
  BOMB_BLOCK,
  BOARD_COLUMNS,
  TOTAL_ROWS,
  addSlowCharge,
  applyGravity,
  applyGravityStep,
  calculateClearScore,
  clearMatchedCells,
  createEmptyBoard,
  createRandomPair,
  findBombBlastCells,
  findLaserClearCells,
  findMatches,
  getPairCells,
  mergePair,
  preparePairForSpawn,
  rotatePair,
  settlePair,
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

const steppedBoard = createEmptyBoard();
steppedBoard[TOTAL_ROWS - 1][0] = "sky";
const horizontalPair = {
  row: TOTAL_ROWS - 2,
  column: 0,
  orientation: 1,
  colors: ["coral", "gold"],
};
const mergedPair = mergePair(steppedBoard, horizontalPair);
assert.equal(mergedPair[TOTAL_ROWS - 2][1], "gold", "unsupported half initially floats beside the step");
const settledPair = settlePair(steppedBoard, horizontalPair);
assert.equal(settledPair[TOTAL_ROWS - 2][0], "coral", "supported half remains on the step");
assert.equal(settledPair[TOTAL_ROWS - 1][1], "gold", "unsupported half falls independently");
assert.equal(settledPair[TOTAL_ROWS - 2][1], null, "no floating half remains after landing");

let animatedPair = mergedPair;
let gravityFrames = 0;
while (true) {
  const step = applyGravityStep(animatedPair);
  if (!step.moved) break;
  animatedPair = step.board;
  gravityFrames += 1;
}
assert.ok(gravityFrames > 0, "unsupported blocks animate through at least one gravity frame");
assert.deepEqual(animatedPair, settledPair, "step animation reaches the same settled board");

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

const generatedBombPair = createRandomPair(4, (() => {
  const values = [0, 0.3, 0, 0.9];
  return () => values.shift() ?? 0;
})(), 1);
assert.equal(generatedBombPair.colors.filter((token) => token === BOMB_BLOCK).length, 1, "a special pair contains one bomb");

const bombBoard = createEmptyBoard();
for (let row = 8; row <= 10; row += 1) {
  for (let column = 2; column <= 4; column += 1) bombBoard[row][column] = "coral";
}
bombBoard[9][3] = BOMB_BLOCK;
const centerBlast = findBombBlastCells(bombBoard);
assert.equal(centerBlast.cells.size, 9, "a centered bomb clears a 3 by 3 occupied area");
assert.equal(centerBlast.bombs.size, 1, "the triggering bomb is counted once");

const edgeBombBoard = createEmptyBoard();
edgeBombBoard[0][0] = BOMB_BLOCK;
edgeBombBoard[0][1] = "gold";
edgeBombBoard[1][0] = "mint";
edgeBombBoard[1][1] = "sky";
assert.equal(findBombBlastCells(edgeBombBoard).cells.size, 4, "a corner blast is clipped to the board");

const chainBombBoard = createEmptyBoard();
chainBombBoard[8][2] = BOMB_BLOCK;
chainBombBoard[9][3] = BOMB_BLOCK;
chainBombBoard[10][4] = "rose";
const chainBlast = findBombBlastCells(chainBombBoard, ["8:2"]);
assert.equal(chainBlast.bombs.size, 2, "a bomb inside the blast area is triggered");
assert.ok(chainBlast.cells.has("10:4"), "the chained bomb extends the blast area");

const bombLine = createEmptyBoard();
for (let column = 0; column < 4; column += 1) bombLine[12][column] = BOMB_BLOCK;
assert.equal(findMatches(bombLine).cells.size, 0, "bombs never form a color match");

const laserBoard = createEmptyBoard();
laserBoard[8][3] = "coral";
laserBoard[9][3] = BOMB_BLOCK;
laserBoard[10][3] = "gold";
laserBoard[9][4] = "mint";
const laserClear = findLaserClearCells(laserBoard, 3);
assert.equal(laserClear.bombs.size, 1, "a laser triggers a bomb in its column");
assert.ok(laserClear.cells.has("9:4"), "laser-triggered bomb clears an adjacent block");
assert.equal(findLaserClearCells(laserBoard, -1).cells.size, 0, "an invalid laser column clears nothing");

const shaftBoard = createEmptyBoard();
const shaftRow = TOTAL_ROWS - 4;
const shaftColumn = 3;
for (const row of [shaftRow - 1, shaftRow, shaftRow + 1]) {
  shaftBoard[row][shaftColumn - 1] = "violet";
  shaftBoard[row][shaftColumn + 1] = "violet";
}
const verticalPair = {
  row: shaftRow,
  column: shaftColumn,
  orientation: 0,
  colors: ["coral", "gold"],
};
const halfTurnedPair = rotatePair(shaftBoard, verticalPair, 1);
assert.equal(halfTurnedPair.orientation, 2, "blocked quarter turn falls back to a half turn");
assert.equal(halfTurnedPair.row, shaftRow - 1, "half turn stays in the same two shaft cells");
assert.deepEqual(
  getPairCells(halfTurnedPair).map(({ row, column, color }) => [row, column, color]),
  [[shaftRow - 1, shaftColumn, "coral"], [shaftRow, shaftColumn, "gold"]],
  "half turn swaps the colors vertically without leaving the shaft",
);

const heldPair = preparePairForSpawn({
  row: 12,
  column: 6,
  orientation: 3,
  colors: [BOMB_BLOCK, "mint"],
});
assert.equal(heldPair.row, 1, "a held pair returns to the spawn row");
assert.equal(heldPair.column, Math.floor(BOARD_COLUMNS / 2) - 1, "a held pair returns to the spawn column");
assert.equal(heldPair.orientation, 0, "a held pair returns to its initial orientation");
assert.deepEqual(heldPair.colors, [BOMB_BLOCK, "mint"], "hold preserves both block tokens");

assert.equal(addSlowCharge(0, 16), 100, "clearing 16 blocks fills the Slow Time gauge");
assert.equal(addSlowCharge(80, 8), 100, "Slow Time charge is capped at 100 percent");
assert.equal(addSlowCharge(40, 8, true), 40, "clears during Slow Time do not refill the active gauge");
assert.equal(addSlowCharge(-10, 0), 0, "Slow Time charge never drops below zero");

console.log("Color Chain logic: all tests passed");
