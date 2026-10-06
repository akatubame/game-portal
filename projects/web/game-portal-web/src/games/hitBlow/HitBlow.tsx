import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { useStopwatch } from "../useStopwatch";
import { safeStorage } from "../../safeStorage";
import { Check, Delete, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { isPlainRecord, readSavedProgress } from "../savedProgress";
import { useLocalizedMessage } from "../useLocalizedMessage";
import type { HitBlowBest, HitBlowDifficulty, HitBlowGuess, HitBlowStatus } from "./types";

type HitBlowProps = {
  onBack: () => void;
};

const BEST_KEY = "game-shelf-hit-blow-best";
const PROGRESS_KEY = "game-shelf-progress-hit-blow-v1";
type SavedHitBlow = { version: 1; difficulty: HitBlowDifficulty; answer: string; input: string; guesses: HitBlowGuess[]; seconds: number };
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const difficultySettings: Record<HitBlowDifficulty, { label: string; attempts: number; hint: boolean; description: string }> = {
  easy: {
    label: "やさしい",
    attempts: 12,
    hint: true,
    description: "12回まで挑戦可能。最初の数字だけヒントがあります。"
  },
  normal: {
    label: "ふつう",
    attempts: 10,
    hint: false,
    description: "10回まで挑戦可能。標準ルールです。"
  },
  hard: {
    label: "むずかしい",
    attempts: 8,
    hint: false,
    description: "8回で当て切る、少し緊張感のある設定です。"
  }
};

function readBest(): Record<HitBlowDifficulty, HitBlowBest | undefined> {
  const stored = safeStorage.getItem(BEST_KEY);
  return {
    easy: undefined,
    normal: undefined,
    hard: undefined,
    ...(stored ? (JSON.parse(stored) as Partial<Record<HitBlowDifficulty, HitBlowBest>>) : {})
  };
}

function createAnswer() {
  const pool = [...DIGITS];
  const answer: string[] = [];

  while (answer.length < 4) {
    const index = Math.floor(Math.random() * pool.length);
    answer.push(pool.splice(index, 1)[0]);
  }

  return answer.join("");
}

function judgeGuess(answer: string, guess: string) {
  return guess.split("").reduce(
    (result, digit, index) => {
      if (answer[index] === digit) {
        return { ...result, hits: result.hits + 1 };
      }

      if (answer.includes(digit)) {
        return { ...result, blows: result.blows + 1 };
      }

      return result;
    },
    { hits: 0, blows: 0 }
  );
}

function isSavedHitBlow(value: unknown): value is SavedHitBlow {
  if (!isPlainRecord(value) || value.version !== 1 || typeof value.difficulty !== "string" ||
      !Object.prototype.hasOwnProperty.call(difficultySettings, value.difficulty) ||
      typeof value.answer !== "string" || !/^\d{4}$/.test(value.answer) || new Set(value.answer).size !== 4 ||
      typeof value.input !== "string" || !/^\d{0,4}$/.test(value.input) || new Set(value.input).size !== value.input.length ||
      !Number.isSafeInteger(value.seconds) || (value.seconds as number) < 0 || !Array.isArray(value.guesses)) return false;
  const limit = difficultySettings[value.difficulty as HitBlowDifficulty].attempts;
  return value.guesses.length < limit && value.guesses.every((entry) => {
    if (!isPlainRecord(entry) || typeof entry.value !== "string" || !/^\d{4}$/.test(entry.value) ||
        new Set(entry.value).size !== 4 || entry.value === value.answer) return false;
    const expected = judgeGuess(value.answer as string, entry.value);
    return entry.hits === expected.hits && entry.blows === expected.blows;
  });
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function isBetterBest(currentBest: HitBlowBest | undefined, attempts: number, seconds: number) {
  if (!currentBest) {
    return true;
  }

  if (attempts !== currentBest.attempts) {
    return attempts < currentBest.attempts;
  }

  return seconds < currentBest.seconds;
}

export function HitBlow({ onBack }: HitBlowProps) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const text = (ja: string, en: string) => isEnglish ? en : ja;
  const confirmRecordReset = useConfirmRecordReset();
  const [saved] = useState(() => readSavedProgress(PROGRESS_KEY, isSavedHitBlow));
  const [difficulty, setDifficulty] = useState<HitBlowDifficulty>(saved?.difficulty ?? "normal");
  const [answer, setAnswer] = useState(() => saved?.answer ?? createAnswer());
  const [status, setStatus] = useState<HitBlowStatus>(saved ? "playing" : "idle");
  const [input, setInput] = useState(saved?.input ?? "");
  const [guesses, setGuesses] = useState<HitBlowGuess[]>(saved?.guesses ?? []);
  const [message, setMessage] = useLocalizedMessage(saved ? "前回の続きから再開しました。推理を続けましょう。" : "重複しない4桁の数字を推理しましょう。Hitは位置も数字も一致、Blowは数字だけ一致です。", saved ? "Resumed your previous game. Keep guessing." : "Guess four distinct digits. A Hit has the right digit in the right place; a Blow has the right digit in a different place.");
  const { seconds, resetTimer, stopTimer } = useStopwatch(saved?.seconds ?? 0, saved !== null);
  const [bestByDifficulty, setBestByDifficulty] = useState<Record<HitBlowDifficulty, HitBlowBest | undefined>>(() => readBest());

  const settings = difficultySettings[difficulty];
  const ranking = useRanking({ gameId: `hit-blow-${difficulty}`, metricLabel: "Attempts", mode: "lower" });
  const attemptsLeft = settings.attempts - guesses.length;
  const currentBest = bestByDifficulty[difficulty];
  const inputDigits = useMemo(() => input.padEnd(4, " ").split("").slice(0, 4), [input]);
  const canSubmit = status === "playing" && input.length === 4 && new Set(input).size === 4;

  useEffect(() => {
    if (status === "playing") {
      safeStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, difficulty, answer, input, guesses, seconds } satisfies SavedHitBlow));
    } else if (status === "cleared" || status === "failed") {
      safeStorage.removeItem(PROGRESS_KEY);
    }
  }, [answer, difficulty, guesses, input, seconds, status]);


  const saveBest = (attempts: number, clearSeconds: number) => {
    if (!isBetterBest(currentBest, attempts, clearSeconds)) {
      return;
    }

    const nextBest: HitBlowBest = {
      attempts,
      seconds: clearSeconds,
      difficulty,
      recordedAt: new Date().toISOString()
    };
    const nextBestByDifficulty = { ...bestByDifficulty, [difficulty]: nextBest };
    setBestByDifficulty(nextBestByDifficulty);
    safeStorage.setItem(BEST_KEY, JSON.stringify(nextBestByDifficulty));
  };

  const startGame = (nextDifficulty = difficulty) => {
    safeStorage.removeItem(PROGRESS_KEY);
    setDifficulty(nextDifficulty);
    setAnswer(createAnswer());
    setStatus("playing");
    setInput("");
    setGuesses([]);
    resetTimer(true);
    setMessage("数字ボタンで4桁を入力し、判定しましょう。数字は重複できません。", "Enter four different digits and submit your guess.");
  };

  const addDigit = (digit: string) => {
    if (status !== "playing" || input.length >= 4 || input.includes(digit)) {
      return;
    }

    setInput(`${input}${digit}`);
  };

  const deleteDigit = () => {
    setInput(input.slice(0, -1));
  };

  const submitGuess = () => {
    if (!canSubmit) {
      setMessage(input.length < 4 ? "4桁そろえてから判定しましょう。" : "同じ数字は使えません。", input.length < 4 ? "Enter all four digits before submitting." : "You cannot use the same digit twice.");
      return;
    }

    const result = judgeGuess(answer, input);
    const nextGuess = { value: input, ...result };
    const nextGuesses = [nextGuess, ...guesses];
    setGuesses(nextGuesses);
    setInput("");

    if (result.hits === 4) {
      setStatus("cleared");
      setMessage(`正解！${nextGuesses.length}回で当てました。`, `Correct! You found the code in ${nextGuesses.length} ${nextGuesses.length === 1 ? "try" : "tries"}.`);
      saveBest(nextGuesses.length, stopTimer());
      return;
    }

    if (nextGuesses.length >= settings.attempts) {
      stopTimer();
      setStatus("failed");
      setMessage(`ゲームオーバー。答えは ${answer} でした。`, `Game over. The code was ${answer}.`);
      return;
    }

    setMessage(`${result.hits} Hit / ${result.blows} Blow。残り${settings.attempts - nextGuesses.length}回です。`, `${result.hits} Hit / ${result.blows} Blow. ${settings.attempts - nextGuesses.length} tries left.`);
  };

  const resetBest = () => {
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestByDifficulty({ easy: undefined, normal: undefined, hard: undefined });
  };

  return (
    <section className="puzzle-shell hitblow-shell" aria-labelledby="hitblow-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">LOGIC / INTERNAL GAME</p>
          <h1 id="hitblow-title">Hit & Blow</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel hitblow-score" aria-label={text("Hit and Blowの状態", "Hit & Blow status")}>
          <div>
            <span>Tries</span>
            <strong>{guesses.length}</strong>
          </div>
          <div>
            <span>Left</span>
            <strong>{attemptsLeft}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{formatTime(seconds)}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout hitblow-layout">
        <div className="hitblow-play-area">
          <div className="hitblow-input" aria-label={text("現在の入力", "Current input")}>
            {inputDigits.map((digit, index) => (
              <span className={digit.trim() ? "is-filled" : ""} key={index}>
                {digit.trim() || "?"}
              </span>
            ))}
          </div>

          <div className="hitblow-keypad" aria-label={text("数字入力", "Number keypad")}>
            {DIGITS.map((digit) => (
              <button disabled={status !== "playing" || input.includes(digit) || input.length >= 4} key={digit} type="button" onClick={() => addDigit(digit)}>
                {digit}
              </button>
            ))}
          </div>

          <div className="hitblow-actions">
            <button className="ghost-button" type="button" onClick={deleteDigit} disabled={status !== "playing" || input.length === 0}>
              <Delete aria-hidden="true" />
              {text("1文字削除", "Delete digit")}
            </button>
            <button className="primary-button" type="button" onClick={submitGuess} disabled={status !== "playing"}>
              <Check aria-hidden="true" />
              {text("判定", "Submit")}
            </button>
          </div>

          <div className="hitblow-history" aria-label={text("判定履歴", "Guess history")}>
            <h2>{text("履歴", "History")}</h2>
            {guesses.length === 0 ? (
              <p>{text("まだ履歴はありません。まずは直感の4桁からどうぞ。", "No guesses yet. Try any four distinct digits.")}</p>
            ) : (
              <ol>
                {guesses.map((guess, index) => (
                  <li key={`${guess.value}-${index}`}>
                    <strong>{guess.value}</strong>
                    <span>{guess.hits} Hit</span>
                    <span>{guess.blows} Blow</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <aside className="puzzle-side hitblow-side">
          <div className="rule-card">
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("答えは重複しない4桁の数字です。Hitは数字と位置が一致、Blowは数字は含まれるが位置が違う、という意味です。履歴を見ながら候補を絞り込みましょう。",
                "The answer has four distinct digits. A Hit matches both digit and position; a Blow matches the digit in another position. Use the history to narrow it down.")}
            </p>
          </div>

          <div className="hitblow-options" aria-label={text("難易度", "Difficulty")}>
            {(Object.keys(difficultySettings) as HitBlowDifficulty[]).map((level) => (
              <button
                className={difficulty === level ? "is-selected" : ""}
                disabled={status === "playing"}
                key={level}
                type="button"
                onClick={() => startGame(level)}
              >
                <span>{isEnglish ? { easy: "Easy", normal: "Normal", hard: "Hard" }[level] : difficultySettings[level].label}</span>
                <small>{isEnglish ? { easy: "12 tries. The first digit is shown.", normal: "10 tries. Standard rules.", hard: "Find the code in 8 tries." }[level] : difficultySettings[level].description}</small>
              </button>
            ))}
          </div>

          <div className="hitblow-progress">
            <span>{text("現在", "Status")}: {status === "playing" ? text("推理中", "Guessing") : status === "cleared" ? text("正解", "Solved") : status === "failed" ? text("失敗", "Failed") : text("待機中", "Ready")}</span>
            <span>{text("ヒント", "Hint")}: {settings.hint && status !== "idle" ? text(`先頭は ${answer[0]}`, `First digit: ${answer[0]}`) : text("なし", "None")}</span>
            <span>{text("ベスト", "Best")}: {currentBest ? text(`${currentBest.attempts}回 / ${formatTime(currentBest.seconds)}`, `${currentBest.attempts} tries / ${formatTime(currentBest.seconds)}`) : text("まだ記録なし", "No record yet")}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "cleared" ? { score: guesses.length * 10000 + seconds, display: text(`${guesses.length}回 / ${formatTime(seconds)}`, `${guesses.length} tries / ${formatTime(seconds)}`), meta: isEnglish ? { easy: "Easy", normal: "Normal", hard: "Hard" }[difficulty] : settings.label } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startGame()}>
              <Sparkles aria-hidden="true" />
              {text("新しく始める", "New game")}
            </button>
            <button className="ghost-button" type="button" onClick={resetBest}>
              <RotateCcw aria-hidden="true" />
              {text("ベスト削除", "Clear best")}
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            {text("棚へ戻る", "Back to shelf")}
          </button>
        </aside>
      </div>
    </section>
  );
}
