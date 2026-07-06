import { Delete, Keyboard, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { LetterState, WordGuessAttempt, WordGuessRecord, WordGuessStatus } from "./types";

type WordGuessProps = {
  onBack: () => void;
};

const RECORD_KEY = "game-shelf-word-guess-record";
const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const WORDS = [
  "ABOUT",
  "ABOVE",
  "ALERT",
  "APPLE",
  "BEACH",
  "BRAIN",
  "BRAVE",
  "BREAD",
  "BRICK",
  "CHAIR",
  "CHARM",
  "CLOUD",
  "COAST",
  "CRANE",
  "DANCE",
  "DREAM",
  "DRINK",
  "EARTH",
  "FIELD",
  "FLAME",
  "FLASH",
  "FLOOD",
  "FRAME",
  "FRUIT",
  "GHOST",
  "GRAPE",
  "GREEN",
  "HEART",
  "HONEY",
  "HOUSE",
  "IMAGE",
  "JELLY",
  "JOKER",
  "KNIFE",
  "LAUGH",
  "LEMON",
  "LIGHT",
  "MAGIC",
  "MONEY",
  "MOUSE",
  "MUSIC",
  "NIGHT",
  "NORTH",
  "OCEAN",
  "PAINT",
  "PAPER",
  "PEACH",
  "PIZZA",
  "PLANT",
  "PRIZE",
  "QUEEN",
  "QUICK",
  "RIVER",
  "ROUND",
  "SHAPE",
  "SHEEP",
  "SMILE",
  "SOUND",
  "SPACE",
  "SPICE",
  "STONE",
  "STORM",
  "TABLE",
  "TIGER",
  "TRAIN",
  "UNITY",
  "VOICE",
  "WATER",
  "WORLD",
  "YOUTH"
];

const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function readRecord(): WordGuessRecord {
  try {
    const stored = window.localStorage.getItem(RECORD_KEY);
    return stored ? (JSON.parse(stored) as WordGuessRecord) : { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
  } catch {
    return { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
  }
}

function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function judgeGuess(answer: string, guess: string): LetterState[] {
  const result: LetterState[] = Array.from({ length: WORD_LENGTH }, () => "absent");
  const remaining = answer.split("");

  guess.split("").forEach((letter, index) => {
    if (answer[index] === letter) {
      result[index] = "correct";
      remaining[index] = "";
    }
  });

  guess.split("").forEach((letter, index) => {
    if (result[index] === "correct") {
      return;
    }

    const foundIndex = remaining.indexOf(letter);
    if (foundIndex >= 0) {
      result[index] = "present";
      remaining[foundIndex] = "";
    }
  });

  return result;
}

function getKeyStates(attempts: WordGuessAttempt[]) {
  const priority: Record<LetterState, number> = {
    absent: 1,
    present: 2,
    correct: 3
  };
  const states: Partial<Record<string, LetterState>> = {};

  attempts.forEach((attempt) => {
    attempt.guess.split("").forEach((letter, index) => {
      const nextState = attempt.result[index];
      const currentState = states[letter];

      if (!currentState || priority[nextState] > priority[currentState]) {
        states[letter] = nextState;
      }
    });
  });

  return states;
}

function updateRecord(record: WordGuessRecord, result: "win" | "loss"): WordGuessRecord {
  if (result === "win") {
    const streak = record.streak + 1;
    return {
      wins: record.wins + 1,
      losses: record.losses,
      streak,
      bestStreak: Math.max(record.bestStreak, streak)
    };
  }

  return {
    wins: record.wins,
    losses: record.losses + 1,
    streak: 0,
    bestStreak: record.bestStreak
  };
}

export function WordGuess({ onBack }: WordGuessProps) {
  const [answer, setAnswer] = useState(() => pickWord());
  const [status, setStatus] = useState<WordGuessStatus>("idle");
  const [input, setInput] = useState("");
  const [attempts, setAttempts] = useState<WordGuessAttempt[]>([]);
  const [record, setRecord] = useState<WordGuessRecord>(() => readRecord());
  const [message, setMessage] = useState("5文字の英単語を6回以内に当てましょう。緑は位置も一致、黄は文字だけ一致です。");

  const keyStates = useMemo(() => getKeyStates(attempts), [attempts]);
  const attemptsLeft = MAX_ATTEMPTS - attempts.length;
  const ranking = useRanking({ gameId: "word-guess-attempts", metricLabel: "Attempts", mode: "lower" });

  const startGame = useCallback(() => {
    setAnswer(pickWord());
    setStatus("playing");
    setInput("");
    setAttempts([]);
    setMessage("キーボードまたは画面のキーで5文字を入力して、判定しましょう。");
  }, []);

  const finish = useCallback((result: "win" | "loss", nextAttempts: WordGuessAttempt[]) => {
    const nextRecord = updateRecord(record, result);
    setRecord(nextRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus(result === "win" ? "won" : "lost");
    setMessage(result === "win" ? `${nextAttempts.length}回で正解！` : `残念。答えは ${answer} でした。`);
  }, [answer, record]);

  const addLetter = useCallback((letter: string) => {
    if (status !== "playing") {
      return;
    }

    setInput((current) => current.length >= WORD_LENGTH ? current : `${current}${letter}`);
  }, [status]);

  const deleteLetter = useCallback(() => {
    if (status !== "playing") {
      return;
    }

    setInput((current) => current.slice(0, -1));
  }, [status]);

  const submitGuess = useCallback(() => {
    if (status !== "playing") {
      return;
    }

    if (input.length < WORD_LENGTH) {
      setMessage("5文字そろえてから判定しましょう。");
      return;
    }

    if (!WORDS.includes(input)) {
      setMessage("候補リストにある英単語を入力してください。");
      return;
    }

    const attempt = {
      guess: input,
      result: judgeGuess(answer, input)
    };
    const nextAttempts = [...attempts, attempt];
    setAttempts(nextAttempts);
    setInput("");

    if (input === answer) {
      finish("win", nextAttempts);
      return;
    }

    if (nextAttempts.length >= MAX_ATTEMPTS) {
      finish("loss", nextAttempts);
      return;
    }

    setMessage(`判定しました。残り${MAX_ATTEMPTS - nextAttempts.length}回です。`);
  }, [answer, attempts, finish, input, status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (status !== "playing") {
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        addLetter(event.key.toUpperCase());
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        deleteLetter();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        submitGuess();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addLetter, deleteLetter, status, submitGuess]);

  const resetRecord = () => {
    const emptyRecord = { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
    setRecord(emptyRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(emptyRecord));
  };

  const rows = Array.from({ length: MAX_ATTEMPTS }, (_, rowIndex) => {
    const attempt = attempts[rowIndex];
    const letters = attempt ? attempt.guess.split("") : rowIndex === attempts.length ? input.padEnd(WORD_LENGTH, " ").split("") : Array.from({ length: WORD_LENGTH }, () => " ");

    return { attempt, letters };
  });

  return (
    <section className="puzzle-shell wordguess-shell" aria-labelledby="wordguess-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">WORD GAME / INTERNAL GAME</p>
          <h1 id="wordguess-title">Wordle風ゲーム</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel wordguess-score" aria-label="Wordle風ゲームの状態">
          <div>
            <span>勝利</span>
            <strong>{record.wins}</strong>
          </div>
          <div>
            <span>残り</span>
            <strong>{attemptsLeft}</strong>
          </div>
          <div>
            <span>連勝</span>
            <strong>{record.streak}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout wordguess-layout">
        <div className="wordguess-play-area">
          <div className="wordguess-grid" aria-label="推理盤面">
            {rows.map((row, rowIndex) =>
              row.letters.map((letter, columnIndex) => (
                <span className={`wordguess-tile${row.attempt ? ` is-${row.attempt.result[columnIndex]}` : ""}${letter.trim() ? " is-filled" : ""}`} key={`${rowIndex}-${columnIndex}`}>
                  {letter.trim()}
                </span>
              ))
            )}
          </div>

          <div className="wordguess-keyboard" aria-label="文字入力">
            {keyboardRows.map((row) => (
              <div key={row}>
                {row.split("").map((letter) => (
                  <button
                    className={keyStates[letter] ? `is-${keyStates[letter]}` : ""}
                    disabled={status !== "playing"}
                    key={letter}
                    type="button"
                    onClick={() => addLetter(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="wordguess-actions">
            <button className="ghost-button" type="button" onClick={deleteLetter} disabled={status !== "playing" || input.length === 0}>
              <Delete aria-hidden="true" />
              1文字削除
            </button>
            <button className="primary-button" type="button" onClick={submitGuess} disabled={status !== "playing"}>
              <Keyboard aria-hidden="true" />
              判定
            </button>
          </div>
        </div>

        <aside className="puzzle-side wordguess-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              5文字の英単語を入力します。緑は文字と位置が一致、黄は文字は含まれるが位置が違う、黒は含まれない文字です。
              6回以内に答えを絞り込みましょう。
            </p>
          </div>

          <div className="wordguess-progress">
            <span>現在: {status === "playing" ? "推理中" : status === "won" ? "正解" : status === "lost" ? "失敗" : "待機中"}</span>
            <span>最高連勝: {record.bestStreak}</span>
            <span>単語数: {WORDS.length}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "won" ? { score: attempts.length, display: `${attempts.length}回`, meta: `連勝${record.streak} / ${answer}` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startGame}>
              <Sparkles aria-hidden="true" />
              新しく始める
            </button>
            <button className="ghost-button" type="button" onClick={resetRecord}>
              <RotateCcw aria-hidden="true" />
              戦績リセット
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
