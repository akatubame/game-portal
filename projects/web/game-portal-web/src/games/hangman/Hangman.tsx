import { Lightbulb, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { HangmanRecord, HangmanStatus, HangmanWord } from "./types";
import { HANGMAN_WORDS } from "./words";

type HangmanProps = {
  onBack: () => void;
};

const MAX_MISSES = 6;
const RECORD_KEY = "game-shelf-hangman-record";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function readRecord(): HangmanRecord {
  const stored = window.localStorage.getItem(RECORD_KEY);
  return stored ? (JSON.parse(stored) as HangmanRecord) : { wins: 0, losses: 0, streak: 0 };
}

function pickWord(previous?: HangmanWord) {
  const candidates = previous ? HANGMAN_WORDS.filter((item) => item.word !== previous.word) : HANGMAN_WORDS;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function isWordSolved(word: string, guessed: Set<string>) {
  return word.split("").every((letter) => guessed.has(letter));
}

function getVisibleWord(word: string, guessed: Set<string>) {
  return word.split("").map((letter) => (guessed.has(letter) ? letter : ""));
}

function updateRecord(record: HangmanRecord, status: HangmanStatus): HangmanRecord {
  if (status === "won") {
    return { ...record, wins: record.wins + 1, streak: record.streak + 1 };
  }

  if (status === "lost") {
    return { ...record, losses: record.losses + 1, streak: 0 };
  }

  return record;
}

export function Hangman({ onBack }: HangmanProps) {
  const [currentWord, setCurrentWord] = useState<HangmanWord>(() => pickWord());
  const [status, setStatus] = useState<HangmanStatus>("idle");
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wrongLetters, setWrongLetters] = useState<string[]>([]);
  const [record, setRecord] = useState<HangmanRecord>(() => readRecord());
  const [message, setMessage] = useState("ヒントを頼りに、英単語を1文字ずつ当てましょう。");

  const guessedSet = useMemo(() => new Set(guessedLetters), [guessedLetters]);
  const visibleWord = getVisibleWord(currentWord.word, guessedSet);
  const remainingMisses = MAX_MISSES - wrongLetters.length;
  const ranking = useRanking({ gameId: "hangman-streak", metricLabel: "Streak", mode: "higher" });

  const startGame = () => {
    setCurrentWord((previous) => pickWord(previous));
    setStatus("playing");
    setGuessedLetters([]);
    setWrongLetters([]);
    setMessage("アルファベットを選んで単語を完成させましょう。");
  };

  const finishGame = (nextStatus: HangmanStatus) => {
    const nextRecord = updateRecord(record, nextStatus);
    setRecord(nextRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus(nextStatus);

    if (nextStatus === "won") {
      setMessage(`正解！答えは ${currentWord.word} でした。`);
    } else if (nextStatus === "lost") {
      setMessage(`残念。答えは ${currentWord.word} でした。`);
    }
  };

  const guessLetter = (letter: string) => {
    if (status !== "playing" || guessedSet.has(letter)) {
      return;
    }

    const nextGuessed = [...guessedLetters, letter];
    const nextGuessedSet = new Set(nextGuessed);
    setGuessedLetters(nextGuessed);

    if (currentWord.word.includes(letter)) {
      if (isWordSolved(currentWord.word, nextGuessedSet)) {
        finishGame("won");
      } else {
        setMessage(`${letter} は含まれています。いい読みです。`);
      }
      return;
    }

    const nextWrongLetters = [...wrongLetters, letter];
    setWrongLetters(nextWrongLetters);

    if (nextWrongLetters.length >= MAX_MISSES) {
      finishGame("lost");
    } else {
      setMessage(`${letter} はありません。残りミス ${MAX_MISSES - nextWrongLetters.length} 回です。`);
    }
  };

  const resetRecord = () => {
    const emptyRecord = { wins: 0, losses: 0, streak: 0 };
    setRecord(emptyRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(emptyRecord));
  };

  return (
    <section className="puzzle-shell hangman-shell" aria-labelledby="hangman-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">WORD GAME / INTERNAL GAME</p>
          <h1 id="hangman-title">ハングマン</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel hangman-score" aria-label="ハングマンの戦績">
          <div>
            <span>Win</span>
            <strong>{record.wins}</strong>
          </div>
          <div>
            <span>Lose</span>
            <strong>{record.losses}</strong>
          </div>
          <div>
            <span>Streak</span>
            <strong>{record.streak}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout hangman-layout">
        <div className="hangman-stage" aria-label="ハングマンの問題">
          <div className={`hangman-gallows miss-${wrongLetters.length}`} aria-hidden="true">
            <span className="hangman-rope" />
            <span className="hangman-head" />
            <span className="hangman-body" />
            <span className="hangman-arm left" />
            <span className="hangman-arm right" />
            <span className="hangman-leg left" />
            <span className="hangman-leg right" />
          </div>

          <div className="hangman-word" aria-label={`現在の単語 ${visibleWord.map((letter) => letter || "未回答").join(" ")}`}>
            {visibleWord.map((letter, index) => (
              <span key={`${currentWord.word}-${index}`}>{letter}</span>
            ))}
          </div>

          <div className="hangman-keyboard" aria-label="アルファベット">
            {ALPHABET.map((letter) => {
              const isGuessed = guessedSet.has(letter);
              const isWrong = wrongLetters.includes(letter);

              return (
                <button
                  className={`${isGuessed ? "is-used" : ""}${isWrong ? " is-wrong" : ""}`}
                  disabled={status !== "playing" || isGuessed}
                  key={letter}
                  type="button"
                  onClick={() => guessLetter(letter)}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="puzzle-side hangman-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              ヒントを見て、英単語に含まれていそうなアルファベットを選びます。
              間違えられるのは6回まで。単語がすべて開けば勝ちです。
            </p>
          </div>

          <div className="hangman-hint">
            <Lightbulb aria-hidden="true" />
            <div>
              <span>カテゴリ: {currentWord.category}</span>
              <strong>{currentWord.hint}</strong>
            </div>
          </div>

          <div className="hangman-progress">
            <span>残りミス: {remainingMisses}</span>
            <span>ミスした文字: {wrongLetters.length > 0 ? wrongLetters.join(", ") : "なし"}</span>
            <span>状態: {status === "playing" ? "挑戦中" : status === "won" ? "勝利" : status === "lost" ? "失敗" : "待機中"}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "won" ? { score: record.streak, display: `${record.streak}連勝`, meta: `${currentWord.word} / ミス${wrongLetters.length}` } : null}
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
