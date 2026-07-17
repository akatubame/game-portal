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
  COLOR_BREAKER_BLOCK,
  HORIZONTAL_LASER_BLOCK,
  VERTICAL_LASER_BLOCK,
  BOARD_COLUMNS,
  TOTAL_ROWS,
  addLaserCharge,
  addSlowCharge,
  applyGravity,
  applyGravityStep,
  calculateClearScore,
  clearMatchedCells,
  createEmptyBoard,
  createRandomPair,
  findBombBlastCells,
  findHorizontalLaserClearCells,
  findSuperSpecialClearCells,
  findTriggeredSpecialClearCells,
  findVerticalLaserClearCells,
  findMatches,
  getChainMultiplier,
  getPairCells,
  getSpawnPreviewTokens,
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
assert.deepEqual(
  findMatches(crossing).rewardBlocks.map(({ token }) => token),
  [BOMB_BLOCK],
  "simultaneous horizontal and vertical lines create a bomb reward",
);

const verticalRewardBoard = createEmptyBoard();
for (let row = 10; row < 15; row += 1) verticalRewardBoard[row][2] = "coral";
const verticalRewardMatch = findMatches(verticalRewardBoard);
assert.deepEqual(
  verticalRewardMatch.rewardBlocks.map(({ token }) => token),
  [VERTICAL_LASER_BLOCK],
  "five vertical blocks create a vertical-laser reward",
);
const verticalReward = verticalRewardMatch.rewardBlocks[0];
assert.ok(verticalReward, "a vertical reward has a placement cell");
const [verticalRewardRow, verticalRewardColumn] = verticalReward.key.split(":").map(Number);
const verticalRewardCleared = clearMatchedCells(verticalRewardBoard, verticalRewardMatch.cells, verticalRewardMatch.rewardBlocks);
assert.equal(verticalRewardCleared[verticalRewardRow][verticalRewardColumn], VERTICAL_LASER_BLOCK, "a reward remains on the cleared board");

const horizontalRewardBoard = createEmptyBoard();
for (let column = 1; column < 6; column += 1) horizontalRewardBoard[13][column] = "gold";
assert.deepEqual(
  findMatches(horizontalRewardBoard).rewardBlocks.map(({ token }) => token),
  [HORIZONTAL_LASER_BLOCK],
  "five horizontal blocks create a horizontal-laser reward",
);

const parallelHorizontalRewardBoard = createEmptyBoard();
for (let column = 1; column < 6; column += 1) {
  parallelHorizontalRewardBoard[11][column] = "gold";
  parallelHorizontalRewardBoard[13][column] = "mint";
}
assert.deepEqual(
  findMatches(parallelHorizontalRewardBoard).rewardBlocks.map(({ token }) => token),
  [HORIZONTAL_LASER_BLOCK, HORIZONTAL_LASER_BLOCK],
  "independent long horizontal lines each create a reward",
);

const disconnectedOrthogonalRewardBoard = createEmptyBoard();
for (let column = 0; column < 5; column += 1) disconnectedOrthogonalRewardBoard[13][column] = "gold";
for (let row = 7; row < 12; row += 1) disconnectedOrthogonalRewardBoard[row][7] = "mint";
assert.deepEqual(
  findMatches(disconnectedOrthogonalRewardBoard).rewardBlocks.map(({ token }) => token),
  [VERTICAL_LASER_BLOCK, HORIZONTAL_LASER_BLOCK],
  "separate horizontal and vertical matches earn lasers instead of a bomb",
);

const crossWithIndependentLineBoard = createEmptyBoard();
for (let column = 1; column < 6; column += 1) crossWithIndependentLineBoard[9][column] = "coral";
for (let row = 7; row < 12; row += 1) crossWithIndependentLineBoard[row][3] = "coral";
for (let column = 1; column < 6; column += 1) crossWithIndependentLineBoard[14][column] = "mint";
assert.deepEqual(
  findMatches(crossWithIndependentLineBoard).rewardBlocks.map(({ token }) => token),
  [BOMB_BLOCK, HORIZONTAL_LASER_BLOCK],
  "a cross creates a bomb without consuming an independent long-line reward",
);

const diagonalRewardBoard = createEmptyBoard();
for (let offset = 0; offset < 5; offset += 1) diagonalRewardBoard[8 + offset][1 + offset] = "mint";
assert.deepEqual(
  findMatches(diagonalRewardBoard).rewardBlocks.map(({ token }) => token),
  [COLOR_BREAKER_BLOCK],
  "five diagonal blocks create a Color Breaker reward",
);

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
assert.equal(getChainMultiplier(1), 1, "the first clear uses the base score");
assert.equal(getChainMultiplier(2), 3, "the second chain triples its score");
assert.equal(getChainMultiplier(3), 10, "the rare third chain awards a tenfold score");
assert.equal(getChainMultiplier(4), 25, "the fourth chain awards a major score bonus");
assert.equal(getChainMultiplier(5), 60, "the fifth chain awards a jackpot score bonus");
assert.equal(getChainMultiplier(6), 120, "the sixth chain reaches the maximum multiplier");
assert.equal(getChainMultiplier(99), 120, "the chain multiplier remains capped after the sixth chain");
assert.equal(calculateClearScore(secondClear, 3), firstScore * 10, "clear scoring uses the boosted third-chain multiplier");
assert.equal(BOARD_COLUMNS, 8, "board width remains fixed");

const previewPair = {
  row: 1,
  column: 3,
  orientation: 0,
  colors: ["coral", "sky"],
};
const spawnedCells = getPairCells(previewPair).sort((a, b) => a.row - b.row);
assert.deepEqual(
  getSpawnPreviewTokens(previewPair),
  spawnedCells.map(({ color }) => color),
  "next preview uses the same top-to-bottom order as a newly spawned pair",
);

const generatedBombPair = createRandomPair(4, (() => {
  const values = [0, 0.3, 0, 0.9];
  return () => values.shift() ?? 0;
})(), 1);
assert.equal(generatedBombPair.colors.filter((token) => token === BOMB_BLOCK).length, 1, "a special pair contains one bomb");

const generatedVerticalLaserPair = createRandomPair(4, (() => {
  const values = [0, 0.3, 0, 0.9];
  return () => values.shift() ?? 0;
})(), 0, 1);
assert.equal(
  generatedVerticalLaserPair.colors.filter((token) => token === VERTICAL_LASER_BLOCK).length,
  1,
  "a special pair can contain one vertical laser",
);

const generatedHorizontalLaserPair = createRandomPair(4, (() => {
  const values = [0, 0.3, 0.5, 0.9];
  return () => values.shift() ?? 0;
})(), 0, 0, 1);
assert.equal(
  generatedHorizontalLaserPair.colors.filter((token) => token === HORIZONTAL_LASER_BLOCK).length,
  1,
  "a falling pair can contain one horizontal laser",
);

const generatedColorBreakerPair = createRandomPair(4, (() => {
  const values = [0, 0.3, 0.5, 0.1];
  return () => values.shift() ?? 0;
})(), 0, 0, 0, 1);
assert.equal(
  generatedColorBreakerPair.colors.filter((token) => token === COLOR_BREAKER_BLOCK).length,
  1,
  "a falling pair can contain one Color Breaker",
);

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

const verticalLaserBoard = createEmptyBoard();
verticalLaserBoard[8][3] = "coral";
verticalLaserBoard[9][3] = VERTICAL_LASER_BLOCK;
verticalLaserBoard[10][3] = BOMB_BLOCK;
verticalLaserBoard[10][4] = "mint";
const verticalLaserClear = findVerticalLaserClearCells(verticalLaserBoard);
assert.equal(verticalLaserClear.verticalLasers.size, 1, "a vertical laser special block triggers once");
assert.equal(verticalLaserClear.bombs.size, 1, "a vertical laser triggers a bomb in its column");
assert.ok(verticalLaserClear.cells.has("10:4"), "a bomb hit by a vertical laser clears an adjacent block");

const horizontalLaserBoard = createEmptyBoard();
horizontalLaserBoard[12][1] = "coral";
horizontalLaserBoard[12][3] = BOMB_BLOCK;
horizontalLaserBoard[11][3] = "gold";
horizontalLaserBoard[12][6] = VERTICAL_LASER_BLOCK;
horizontalLaserBoard[9][6] = "sky";
const horizontalLaserClear = findHorizontalLaserClearCells(horizontalLaserBoard, 12);
assert.equal(horizontalLaserClear.bombs.size, 1, "a horizontal laser triggers a bomb in its row");
assert.equal(horizontalLaserClear.verticalLasers.size, 1, "a horizontal laser triggers a vertical-laser block in its row");
assert.ok(horizontalLaserClear.cells.has("11:3"), "the triggered bomb expands the horizontal laser clear area");
assert.ok(horizontalLaserClear.cells.has("9:6"), "the triggered vertical laser clears its column");
assert.equal(findHorizontalLaserClearCells(horizontalLaserBoard, -1).cells.size, 0, "an invalid laser row clears nothing");

const inertSpecialBoard = createEmptyBoard();
inertSpecialBoard[10][3] = BOMB_BLOCK;
inertSpecialBoard[10][6] = VERTICAL_LASER_BLOCK;
const inertSpecials = findTriggeredSpecialClearCells(inertSpecialBoard, []);
assert.equal(inertSpecials.cells.size, 0, "landed special blocks remain inert without a neighboring clear");
assert.equal(inertSpecials.bombs.size, 0, "a landed bomb does not activate by itself");
assert.equal(inertSpecials.verticalLasers.size, 0, "a landed vertical laser does not activate by itself");

const adjacentSpecialBoard = createEmptyBoard();
adjacentSpecialBoard[10][2] = "coral";
adjacentSpecialBoard[10][3] = BOMB_BLOCK;
adjacentSpecialBoard[9][4] = VERTICAL_LASER_BLOCK;
adjacentSpecialBoard[7][4] = "sky";
const adjacentSpecialClear = findTriggeredSpecialClearCells(adjacentSpecialBoard, ["10:2"]);
assert.equal(adjacentSpecialClear.bombs.size, 1, "an orthogonally adjacent clear activates a bomb");
assert.equal(adjacentSpecialClear.verticalLasers.size, 1, "a special hit by the blast activates in a cascade");
assert.ok(adjacentSpecialClear.cells.has("7:4"), "the chained vertical laser clears its column");

const diagonalSpecialBoard = createEmptyBoard();
diagonalSpecialBoard[10][2] = "mint";
diagonalSpecialBoard[9][3] = BOMB_BLOCK;
const diagonalSpecialClear = findTriggeredSpecialClearCells(diagonalSpecialBoard, ["10:2"]);
assert.equal(diagonalSpecialClear.bombs.size, 0, "a diagonal clear does not activate a special block");

const horizontalLaserBlockBoard = createEmptyBoard();
horizontalLaserBlockBoard[10][2] = "coral";
horizontalLaserBlockBoard[10][3] = HORIZONTAL_LASER_BLOCK;
horizontalLaserBlockBoard[10][7] = "mint";
const horizontalLaserBlockClear = findTriggeredSpecialClearCells(horizontalLaserBlockBoard, ["10:2"]);
assert.equal(horizontalLaserBlockClear.horizontalLasers.size, 1, "an adjacent clear activates a horizontal-laser block");
assert.ok(horizontalLaserBlockClear.cells.has("10:7"), "a horizontal-laser block clears its row");

const colorBreakerBoard = createEmptyBoard();
colorBreakerBoard[10][2] = "coral";
colorBreakerBoard[10][3] = COLOR_BREAKER_BLOCK;
colorBreakerBoard[5][0] = "coral";
colorBreakerBoard[8][7] = "coral";
colorBreakerBoard[5][1] = "sky";
const colorBreakerClear = findTriggeredSpecialClearCells(colorBreakerBoard, ["10:2"]);
assert.equal(colorBreakerClear.colorBreakers.size, 1, "an adjacent clear activates a Color Breaker");
assert.ok(colorBreakerClear.cells.has("5:0") && colorBreakerClear.cells.has("8:7"), "a Color Breaker clears every block of the adjacent color");
assert.ok(!colorBreakerClear.cells.has("5:1"), "a Color Breaker leaves other colors untouched when color-matched");
assert.equal(colorBreakerClear.colorBreakerClearedCells.size, 3, "Color Breaker clear counts include normal color blocks only");

const colorBreakerCascadeBoard = createEmptyBoard();
colorBreakerCascadeBoard[10][2] = "coral";
colorBreakerCascadeBoard[10][3] = COLOR_BREAKER_BLOCK;
colorBreakerCascadeBoard[7][4] = "coral";
colorBreakerCascadeBoard[7][5] = BOMB_BLOCK;
colorBreakerCascadeBoard[6][6] = "sky";
const colorBreakerCascadeClear = findTriggeredSpecialClearCells(colorBreakerCascadeBoard, ["10:2"]);
assert.equal(colorBreakerCascadeClear.bombs.size, 1, "a color cleared by a Color Breaker activates an adjacent bomb");
assert.ok(colorBreakerCascadeClear.cells.has("6:6"), "the bomb chained from a Color Breaker expands the clear area");

const mixedTriggerColorBreakerBoard = createEmptyBoard();
mixedTriggerColorBreakerBoard[10][2] = "coral";
mixedTriggerColorBreakerBoard[10][3] = COLOR_BREAKER_BLOCK;
mixedTriggerColorBreakerBoard[9][2] = BOMB_BLOCK;
mixedTriggerColorBreakerBoard[5][0] = "gold";
const originalRandom = Math.random;
let mixedTriggerColorBreakerClear;
try {
  Math.random = () => 0.99;
  mixedTriggerColorBreakerClear = findTriggeredSpecialClearCells(mixedTriggerColorBreakerBoard, ["10:2"]);
} finally {
  Math.random = originalRandom;
}
assert.deepEqual(
  [...mixedTriggerColorBreakerClear.colorBreakerColors],
  ["gold"],
  "a Color Breaker caught by a blast uses the random-effect rule even when it was also adjacent to a color clear",
);
assert.ok(mixedTriggerColorBreakerClear.cells.has("5:0"), "the blast-triggered Color Breaker clears the selected random color");

const randomColorBreakerBoard = createEmptyBoard();
randomColorBreakerBoard[10][2] = BOMB_BLOCK;
randomColorBreakerBoard[10][3] = COLOR_BREAKER_BLOCK;
randomColorBreakerBoard[5][0] = "gold";
const randomColorBreakerClear = findBombBlastCells(randomColorBreakerBoard, ["10:2"]);
assert.equal(randomColorBreakerClear.colorBreakers.size, 1, "a bomb caught in a blast activates a Color Breaker");
assert.ok(randomColorBreakerClear.cells.has("5:0"), "a blast-triggered Color Breaker clears its randomly selected available color");

const superVerticalLaserBoard = createEmptyBoard();
superVerticalLaserBoard[10][3] = VERTICAL_LASER_BLOCK;
superVerticalLaserBoard[11][3] = VERTICAL_LASER_BLOCK;
superVerticalLaserBoard[5][2] = "coral";
superVerticalLaserBoard[5][3] = "gold";
superVerticalLaserBoard[5][4] = "mint";
superVerticalLaserBoard[5][1] = "sky";
const superVerticalLaserClear = findSuperSpecialClearCells(superVerticalLaserBoard);
assert.equal(superVerticalLaserClear.superVerticalLasers.size, 1, "adjacent vertical lasers create one super laser");
assert.equal(superVerticalLaserClear.verticalLasers.size, 2, "both adjacent vertical-laser blocks are consumed");
assert.deepEqual(
  [...superVerticalLaserClear.verticalLaserColumns].sort((a, b) => a - b),
  [2, 3, 4],
  "a super vertical laser targets exactly three columns",
);
assert.ok(superVerticalLaserClear.cells.has("5:2"), "the super vertical laser clears its left column");
assert.ok(superVerticalLaserClear.cells.has("5:3"), "the super vertical laser clears its center column");
assert.ok(superVerticalLaserClear.cells.has("5:4"), "the super vertical laser clears its right column");
assert.ok(!superVerticalLaserClear.cells.has("5:1"), "the super vertical laser does not clear a fourth column");

const superHorizontalLaserBoard = createEmptyBoard();
superHorizontalLaserBoard[10][3] = HORIZONTAL_LASER_BLOCK;
superHorizontalLaserBoard[10][4] = HORIZONTAL_LASER_BLOCK;
superHorizontalLaserBoard[9][0] = "coral";
superHorizontalLaserBoard[10][7] = "gold";
superHorizontalLaserBoard[11][2] = "mint";
superHorizontalLaserBoard[8][1] = "sky";
const superHorizontalLaserClear = findSuperSpecialClearCells(superHorizontalLaserBoard);
assert.equal(superHorizontalLaserClear.superHorizontalLasers.size, 1, "adjacent horizontal lasers create one super laser");
assert.equal(superHorizontalLaserClear.horizontalLasers.size, 2, "both adjacent horizontal-laser blocks are consumed");
assert.deepEqual(
  [...superHorizontalLaserClear.horizontalLaserRows].sort((a, b) => a - b),
  [9, 10, 11],
  "a super horizontal laser targets exactly three rows",
);
assert.ok(superHorizontalLaserClear.cells.has("9:0"), "the super horizontal laser clears its upper row");
assert.ok(superHorizontalLaserClear.cells.has("10:7"), "the super horizontal laser clears its center row");
assert.ok(superHorizontalLaserClear.cells.has("11:2"), "the super horizontal laser clears its lower row");
assert.ok(!superHorizontalLaserClear.cells.has("8:1"), "the super horizontal laser does not clear a fourth row");

const superColorBreakerBoard = createEmptyBoard();
superColorBreakerBoard[10][3] = COLOR_BREAKER_BLOCK;
superColorBreakerBoard[10][4] = COLOR_BREAKER_BLOCK;
superColorBreakerBoard[5][0] = "coral";
superColorBreakerBoard[7][2] = "gold";
superColorBreakerBoard[9][7] = "violet";
const superColorBreakerClear = findSuperSpecialClearCells(superColorBreakerBoard);
assert.equal(superColorBreakerClear.superColorBreakers.size, 1, "adjacent Color Breakers create one super effect");
assert.equal(superColorBreakerClear.colorBreakerClearedCells.size, 3, "Super Color Breaker count excludes its two special blocks");
assert.ok(
  superColorBreakerClear.cells.has("5:0")
    && superColorBreakerClear.cells.has("7:2")
    && superColorBreakerClear.cells.has("9:7"),
  "a Super Color Breaker clears every normal color block",
);

const superBombBoard = createEmptyBoard();
for (let row = 8; row <= 12; row += 1) {
  for (let column = 2; column <= 6; column += 1) superBombBoard[row][column] = "rose";
}
superBombBoard[10][3] = BOMB_BLOCK;
superBombBoard[10][4] = BOMB_BLOCK;
const superBombClear = findSuperSpecialClearCells(superBombBoard);
assert.equal(superBombClear.superBombs.size, 1, "adjacent bombs create one super bomb");
assert.equal(superBombClear.bombs.size, 2, "both adjacent bomb blocks are consumed");
assert.equal(superBombClear.cells.size, 25, "a centered super bomb clears a filled 5 by 5 area");

const nonMatchingSpecialBoard = createEmptyBoard();
nonMatchingSpecialBoard[10][3] = BOMB_BLOCK;
nonMatchingSpecialBoard[10][4] = VERTICAL_LASER_BLOCK;
assert.equal(
  findSuperSpecialClearCells(nonMatchingSpecialBoard).cells.size,
  0,
  "different adjacent special types do not activate automatically",
);

const diagonalSuperBoard = createEmptyBoard();
diagonalSuperBoard[10][3] = BOMB_BLOCK;
diagonalSuperBoard[9][4] = BOMB_BLOCK;
assert.equal(
  findSuperSpecialClearCells(diagonalSuperBoard).cells.size,
  0,
  "diagonally touching matching specials do not create a super effect",
);

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

assert.equal(addLaserCharge(0, 20, 20), 100, "clearing the target block count fills the horizontal laser gauge");
assert.equal(addLaserCharge(50, 5, 20), 75, "horizontal laser charge follows cleared block count");
assert.equal(addLaserCharge(90, 5, 20), 100, "horizontal laser charge is capped at 100 percent");

console.log("Color Chain logic: all tests passed");
