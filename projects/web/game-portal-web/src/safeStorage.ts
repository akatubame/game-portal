type Validator = (value: unknown) => boolean;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const number: Validator = (value) => typeof value === "number" && Number.isFinite(value);
const text: Validator = (value) => typeof value === "string";
const nullableNumber: Validator = (value) => value === null || number(value);
const shape = (fields: Record<string, Validator>): Validator => (value) =>
  object(value) && Object.entries(fields).every(([key, valid]) =>
    Object.prototype.hasOwnProperty.call(value, key) && valid(value[key]));
const numbers = (keys: string) => Object.fromEntries(keys.split(" ").map((key) => [key, number]));
const result = (keys: string): Validator => shape({ ...numbers(keys), recordedAt: text });
const map = (valid: Validator): Validator => (value) => object(value) && Object.values(value).every(valid);
const list = (valid: Validator): Validator => (value) => Array.isArray(value) && value.every(valid);

const schemas: Record<string, Validator> = {
  "reaction-best": result("milliseconds"),
  "reaction-history": list(result("milliseconds")),
  "aim-trainer-best": result("score hits misses accuracy bestStreak"),
  "typing-best": result("score accuracy correctChars totalTyped completedPhrases"),
  "mental-math-best": result("score solved mistakes bestStreak"),
  "whack-mole-best": result("score hits misses bestCombo"),
  "color-judge-best": result("score correct mistakes bestCombo"),
  "snake-best": result("score apples length"),
  "breakout-best": result("score clearedBricks lives"),
  "pong-best": shape({ ...numbers("playerScore cpuScore"), recordedAt: text,
    winner: (value) => value === "player" || value === "cpu" }),
  "simon-says-best": result("level score"),
  "yacht-dice-best": result("score"),
  "peg-solitaire-best": result("remaining moves"),
  "poker-record": shape({ ...numbers("plays bestScore"), bestHand: text }),
  "blackjack-record": shape(numbers("wins losses pushes chips")),
  "tic-tac-toe-record": shape(numbers("wins losses draws streak")),
  "connect-four-record": shape(numbers("wins losses draws streak")),
  "reversi-record": shape(numbers("wins losses draws")),
  "nim-record": shape(numbers("wins losses streak bestStreak")),
  "word-guess-record": shape(numbers("wins losses streak bestStreak")),
  "hangman-record": shape(numbers("wins losses streak")),
  "one-to-fifty-record": shape({ plays: number, bestTimeMs: nullableNumber }),
  "solitaire-record": shape({ clears: number, bestTimeMs: nullableNumber, bestMoves: nullableNumber }),
  "water-sort-record-v2": map(number),
  "nonogram-record": map(number),
  "sudoku-best-times": map(number),
  "minesweeper-best-times": map(number),
  "hanoi-best-times": map(number),
  "hanoi-best": map(result("moves disks")),
  "maze-escape-best": map(result("size moves seconds")),
  "flood-fill-best": map(shape({ moves: number, difficulty: text, recordedAt: text })),
  "same-game-best": map(shape({ score: number, difficulty: text, recordedAt: text })),
  "hit-blow-best": map(shape({ attempts: number, seconds: number, difficulty: text, recordedAt: text })),
  favorites: list(text),
  "recently-played": list(text)
};

export function validStoredValue(key: string, raw: string): boolean {
  const name = key.replace(/^game-shelf-/, "");
  if (name === "language") return raw === "ja" || raw === "en";
  if (/^(2048|memory|slide15|lights-out)-best-/.test(name)) {
    return raw.trim() !== "" && Number.isFinite(Number(raw)) && Number(raw) >= 0;
  }
  let validate = schemas[name];
  if (name.startsWith("ranking-")) {
    validate = list((value) => shape({ id: text, name: text, score: number, recordedAt: text })(value) &&
      object(value) && (value.meta === undefined || text(value.meta)));
  }
  if (!validate) return true;
  try { return validate(JSON.parse(raw)); } catch { return false; }
}

export type StorageIssue = "unavailable" | "invalid" | null;

export function createSafeStorage(getStorage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  const temporary = new Map<string, string | null>();
  let issue: StorageIssue = null;
  const listeners = new Set<() => void>();
  function report(next: Exclude<StorageIssue, null>) {
    if (issue === next || issue === "unavailable") return;
    issue = next;
    // 読み込みがReactの描画中でも、通知による状態更新を描画後に送る。
    queueMicrotask(() => listeners.forEach((listener) => listener()));
  }
  return {
    getIssue: () => issue,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getItem(key: string): string | null {
      if (temporary.has(key)) return temporary.get(key) ?? null;
      let raw: string | null;
      try { raw = getStorage().getItem(key); }
      catch { report("unavailable"); return null; }
      if (raw !== null && !validStoredValue(key, raw)) {
        // 壊れた元データは削除せず、今回の読み込みだけ未記録として扱う。
        report("invalid");
        return null;
      }
      return raw;
    },
    setItem(key: string, value: string) {
      try { getStorage().setItem(key, value); temporary.delete(key); }
      catch { temporary.set(key, value); report("unavailable"); }
    },
    removeItem(key: string) {
      try { getStorage().removeItem(key); temporary.delete(key); }
      catch { temporary.set(key, null); report("unavailable"); }
    }
  };
}

export const safeStorage = createSafeStorage(() => window.localStorage);
