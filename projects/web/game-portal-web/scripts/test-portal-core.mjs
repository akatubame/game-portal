import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function load(relative) {
  const source = await readFile(new URL(relative, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
}
const { createSafeStorage, validStoredValue } = await load("../src/safeStorage.ts");
const disk = new Map();
let blocked = false;
const storage = createSafeStorage(() => {
  if (blocked) throw new Error("保存拒否");
  return { getItem: key => disk.get(key) ?? null, setItem: (key, value) => disk.set(key, value), removeItem: key => disk.delete(key) };
});
storage.setItem("game-shelf-reaction-history", "[]");
assert.equal(storage.getItem("game-shelf-reaction-history"), "[]");
disk.set("game-shelf-reaction-history", "{}");
assert.equal(storage.getItem("game-shelf-reaction-history"), null);
assert.equal(disk.get("game-shelf-reaction-history"), "{}");
assert.equal(storage.getIssue(), "invalid");
for (const raw of ["null", "{}", "[null]", "[{}]", "{", "123"]) {
  assert.equal(validStoredValue("game-shelf-reaction-history", raw), false);
}
assert.equal(validStoredValue("game-shelf-reaction-history", '[{"milliseconds":200,"recordedAt":"2026-10-04"}]'), true);
assert.equal(validStoredValue("game-shelf-sudoku-best-times", '{"easy-01":"速い"}'), false);
assert.equal(validStoredValue("game-shelf-sudoku-best-times", '{"easy-01":120}'), true);
assert.equal(validStoredValue("game-shelf-2048-best-score", "Infinity"), false);
assert.equal(validStoredValue("game-shelf-poker-record", '{"plays":1,"bestScore":10,"bestHand":"ペア"}'), true);
blocked = true;
assert.equal(storage.getItem("game-shelf-language"), null);
storage.setItem("game-shelf-language", "ja");
assert.equal(storage.getItem("game-shelf-language"), "ja");
storage.removeItem("game-shelf-language");
assert.equal(storage.getItem("game-shelf-language"), null);
assert.equal(storage.getIssue(), "unavailable");
blocked = false;
storage.setItem("game-shelf-language", "en");
assert.equal(disk.get("game-shelf-language"), "en");
assert.equal(storage.getItem("game-shelf-language"), "en");
const quota = createSafeStorage(() => ({
  getItem: () => "ja", setItem: () => { throw new Error("容量不足"); }, removeItem: () => { throw new Error("削除拒否"); }
}));
quota.setItem("game-shelf-language", "en");
assert.equal(quota.getItem("game-shelf-language"), "en");
quota.removeItem("game-shelf-language");
assert.equal(quota.getItem("game-shelf-language"), null);
console.log("保存処理: 通常・不正データ・アクセス拒否・容量不足・削除拒否を確認");

const { sudokuPuzzles } = await load("../src/games/sudoku/puzzles.ts");
const { isSolved, isComplete, countMistakes } = await load("../src/games/sudoku/logic.ts");
function solutions(input) {
  const board = input.map(row => row.slice());
  let count = 0;
  function walk() {
    let position, candidates;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!board[r][c]) {
      const possible = [];
      for (let n = 1; n <= 9; n++) {
        if (!board[r].includes(n) && !board.some(row => row[c] === n) &&
          !board.slice(r - r % 3, r - r % 3 + 3).some(row => row.slice(c - c % 3, c - c % 3 + 3).includes(n))) possible.push(n);
      }
      if (!possible.length) return;
      if (!candidates || possible.length < candidates.length) { position = [r, c]; candidates = possible; }
    }
    if (!position) { count++; return; }
    const [r, c] = position;
    for (const n of candidates) {
      board[r][c] = n; walk(); board[r][c] = 0;
      if (count >= 2) return;
    }
  }
  walk();
  return count;
}
for (const puzzle of sudokuPuzzles) {
  assert.equal(isSolved(puzzle.solution, puzzle.puzzle), true, puzzle.id);
  assert.equal(countMistakes(puzzle.solution), 0, puzzle.id);
  assert.equal(solutions(puzzle.puzzle), 1, puzzle.id + "の解が一意");
}
assert.equal(isComplete([]), false);
assert.equal(isSolved(Array.from({ length: 9 }, () => Array(9).fill(1)), sudokuPuzzles[0].puzzle), false);
const oldGivens = ["005060001","080000090","100004000","000100300","300000005","001003000","000300074","040050000","700008200"].map(row => [...row].map(Number));
const alternative = ["235967481","486215793","179834526","854192367","327486915","691573842","568329174","942751638","713648259"].map(row => [...row].map(Number));
assert.equal(isSolved(alternative, oldGivens), true);
assert.equal(countMistakes(alternative), 0);
console.log("数独: 全" + sudokuPuzzles.length + "問の一意解・正当な別解・不正盤面を確認");
