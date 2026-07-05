import { Check, Delete, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { HitBlowBest, HitBlowDifficulty, HitBlowGuess, HitBlowStatus } from "./types";

type HitBlowProps = {
  onBack: () => void;
};

const BEST_KEY = "game-shelf-hit-blow-best";
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
  const stored = window.localStorage.getItem(BEST_KEY);
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
  const [difficulty, setDifficulty] = useState<HitBlowDifficulty>("normal");
  const [answer, setAnswer] = useState(() => createAnswer());
  const [status, setStatus] = useState<HitBlowStatus>("idle");
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<HitBlowGuess[]>([]);
  const [message, setMessage] = useState("重複しない4桁の数字を推理しましょう。Hitは位置も数字も一致、Blowは数字だけ一致です。");
  const [seconds, setSeconds] = useState(0);
  const [bestByDifficulty, setBestByDifficulty] = useState<Record<HitBlowDifficulty, HitBlowBest | undefined>>(() => readBest());

  const settings = difficultySettings[difficulty];
  const attemptsLeft = settings.attempts - guesses.length;
  const currentBest = bestByDifficulty[difficulty];
  const inputDigits = useMemo(() => input.padEnd(4, " ").split("").slice(0, 4), [input]);
  const canSubmit = status === "playing" && input.length === 4 && new Set(input).size === 4;

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const timerId = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [status]);

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
    window.localStorage.setItem(BEST_KEY, JSON.stringify(nextBestByDifficulty));
  };

  const startGame = (nextDifficulty = difficulty) => {
    setDifficulty(nextDifficulty);
    setAnswer(createAnswer());
    setStatus("playing");
    setInput("");
    setGuesses([]);
    setSeconds(0);
    setMessage("数字ボタンで4桁を入力し、判定しましょう。数字は重複できません。");
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
      setMessage(input.length < 4 ? "4桁そろえてから判定しましょう。" : "同じ数字は使えません。");
      return;
    }

    const result = judgeGuess(answer, input);
    const nextGuess = { value: input, ...result };
    const nextGuesses = [nextGuess, ...guesses];
    setGuesses(nextGuesses);
    setInput("");

    if (result.hits === 4) {
      setStatus("cleared");
      setMessage(`正解！${nextGuesses.length}回で当てました。`);
      saveBest(nextGuesses.length, seconds);
      return;
    }

    if (nextGuesses.length >= settings.attempts) {
      setStatus("failed");
      setMessage(`ゲームオーバー。答えは ${answer} でした。`);
      return;
    }

    setMessage(`${result.hits} Hit / ${result.blows} Blow。残り${settings.attempts - nextGuesses.length}回です。`);
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBestByDifficulty({ easy: undefined, normal: undefined, hard: undefined });
  };

  return (
    <section className="puzzle-shell hitblow-shell" aria-labelledby="hitblow-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">LOGIC / INTERNAL GAME</p>
          <h1 id="hitblow-title">Hit & Blow</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel hitblow-score" aria-label="Hit and Blowの状態">
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
          <div className="hitblow-input" aria-label="現在の入力">
            {inputDigits.map((digit, index) => (
              <span className={digit.trim() ? "is-filled" : ""} key={index}>
                {digit.trim() || "?"}
              </span>
            ))}
          </div>

          <div className="hitblow-keypad" aria-label="数字入力">
            {DIGITS.map((digit) => (
              <button disabled={status !== "playing" || input.includes(digit) || input.length >= 4} key={digit} type="button" onClick={() => addDigit(digit)}>
                {digit}
              </button>
            ))}
          </div>

          <div className="hitblow-actions">
            <button className="ghost-button" type="button" onClick={deleteDigit} disabled={status !== "playing" || input.length === 0}>
              <Delete aria-hidden="true" />
              1文字削除
            </button>
            <button className="primary-button" type="button" onClick={submitGuess} disabled={status !== "playing"}>
              <Check aria-hidden="true" />
              判定
            </button>
          </div>

          <div className="hitblow-history" aria-label="判定履歴">
            <h2>履歴</h2>
            {guesses.length === 0 ? (
              <p>まだ履歴はありません。まずは直感の4桁からどうぞ。</p>
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
            <h2>遊び方</h2>
            <p>
              答えは重複しない4桁の数字です。Hitは数字と位置が一致、Blowは数字は含まれるが位置が違う、という意味です。
              履歴を見ながら候補を絞り込みましょう。
            </p>
          </div>

          <div className="hitblow-options" aria-label="難易度">
            {(Object.keys(difficultySettings) as HitBlowDifficulty[]).map((level) => (
              <button
                className={difficulty === level ? "is-selected" : ""}
                disabled={status === "playing"}
                key={level}
                type="button"
                onClick={() => startGame(level)}
              >
                <span>{difficultySettings[level].label}</span>
                <small>{difficultySettings[level].description}</small>
              </button>
            ))}
          </div>

          <div className="hitblow-progress">
            <span>現在: {status === "playing" ? "推理中" : status === "cleared" ? "正解" : status === "failed" ? "失敗" : "待機中"}</span>
            <span>ヒント: {settings.hint && status !== "idle" ? `先頭は ${answer[0]}` : "なし"}</span>
            <span>ベスト: {currentBest ? `${currentBest.attempts}回 / ${formatTime(currentBest.seconds)}` : "まだ記録なし"}</span>
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startGame()}>
              <Sparkles aria-hidden="true" />
              新しく始める
            </button>
            <button className="ghost-button" type="button" onClick={resetBest}>
              <RotateCcw aria-hidden="true" />
              ベスト削除
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            棚へ戻る
          </button>
        </aside>
      </div>
    </section>
  );
}
