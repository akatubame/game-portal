import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { useCountdown } from "../useCountdown";
import { safeStorage } from "../../safeStorage";
import { Keyboard, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { typingPhrases } from "./phrases";
import type { TypingPhrase, TypingResult, TypingStatus } from "./types";

type TypingGameProps = {
  onBack: () => void;
};

const ROUND_SECONDS = 60;
const BEST_KEY = "game-shelf-typing-best";
const RECENT_PHRASE_LIMIT = 8;

function readBestResult(): TypingResult | null {
  const stored = safeStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as TypingResult) : null;
}

function getNextPhrase(current?: TypingPhrase, excludedIds: string[] = []) {
  const excluded = new Set([current?.id, ...excludedIds].filter(Boolean));
  const candidates = typingPhrases.filter((phrase) => !excluded.has(phrase.id));
  const pool = candidates.length > 0 ? candidates : typingPhrases;
  return pool[Math.floor(Math.random() * pool.length)];
}

function calculateScore(correctChars: number, completedPhrases: number, accuracy: number) {
  if (correctChars === 0 && completedPhrases === 0) {
    return 0;
  }

  return Math.round(correctChars * 10 + completedPhrases * 80 + accuracy * 2);
}

export function TypingGame({ onBack }: TypingGameProps) {
  const confirmRecordReset = useConfirmRecordReset();
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [status, setStatus] = useState<TypingStatus>("idle");
  const [phrase, setPhrase] = useState<TypingPhrase>(() => getNextPhrase());
  const [input, setInput] = useState("");
  const { timeLeft, resetCountdown, hasExpired } = useCountdown(status === "playing", ROUND_SECONDS);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalTyped, setTotalTyped] = useState(0);
  const [completedPhrases, setCompletedPhrases] = useState(0);
  const [bestResult, setBestResult] = useState<TypingResult | null>(() => readBestResult());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recentPhraseIdsRef = useRef<string[]>([]);

  const accuracy = useMemo(() => {
    if (totalTyped === 0) {
      return 100;
    }

    return Math.round((correctChars / totalTyped) * 100);
  }, [correctChars, totalTyped]);

  const score = useMemo(
    () => calculateScore(correctChars, completedPhrases, accuracy),
    [accuracy, completedPhrases, correctChars]
  );
  const ranking = useRanking({ gameId: "typing-score", metricLabel: "Score", mode: "higher" });


  useEffect(() => {
    if (status === "playing" && timeLeft === 0) {
      finishRound();
    }
  }, [status, timeLeft]);

  const startRound = () => {
    const firstPhrase = getNextPhrase();
    recentPhraseIdsRef.current = [firstPhrase.id];
    setStatus("playing");
    setPhrase(firstPhrase);
    setInput("");
    resetCountdown();
    setCorrectChars(0);
    setTotalTyped(0);
    setCompletedPhrases(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const finishRound = () => {
    setStatus("finished");
    setInput("");
    const result: TypingResult = {
      score,
      accuracy,
      correctChars,
      totalTyped,
      completedPhrases,
      recordedAt: new Date().toISOString()
    };

    if (!bestResult || result.score > bestResult.score) {
      setBestResult(result);
      safeStorage.setItem(BEST_KEY, JSON.stringify(result));
    }
  };

  const handleInput = (value: string) => {
    if (hasExpired() || status !== "playing") {
      return;
    }

    const normalized = value.toLowerCase();
    const expected = phrase.reading.toLowerCase();
    const previousInputLength = input.length;

    if (normalized.length > previousInputLength) {
      const addedCharacters = normalized.slice(previousInputLength);
      let addedCorrectCharacters = 0;

      addedCharacters.split("").forEach((character, offset) => {
        const expectedCharacter = expected[previousInputLength + offset];

        if (character === expectedCharacter) {
          addedCorrectCharacters += 1;
        }
      });

      setTotalTyped((current) => current + addedCharacters.length);
      setCorrectChars((current) => current + addedCorrectCharacters);
    }

    setInput(normalized);

    if (normalized === expected) {
      setCompletedPhrases((current) => current + 1);
      setPhrase((current) => {
        const nextPhrase = getNextPhrase(current, recentPhraseIdsRef.current);
        recentPhraseIdsRef.current = [nextPhrase.id, ...recentPhraseIdsRef.current].slice(0, RECENT_PHRASE_LIMIT);
        return nextPhrase;
      });
      setInput("");
    }
  };

  const resetBest = () => {
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  const expected = phrase.reading.toLowerCase();
  const isCurrentInputValid = expected.startsWith(input);
  const remaining = expected.slice(input.length);
  const statusText = (isEnglish ? {
    idle: "Press Start for a 60-second round. Type the romaji shown below.",
    playing: "Type the romaji. If you make a mistake, you can correct it.",
    finished: "Time's up! You can try again."
  } : {
    idle: "スタートを押したら60秒勝負です。表示されたローマ字を入力してください。",
    playing: "ローマ字を入力してください。間違えても、そのまま打ち直せます。",
    finished: "終了！もう一度挑戦できます。"
  })[status];

  return (
    <section className="puzzle-shell typing-shell" aria-labelledby="typing-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SCORE ATTACK / INTERNAL GAME</p>
          <h1 id="typing-title">{isEnglish ? "Typing Game" : "タイピングゲーム"}</h1>
          <p className="lead">{statusText}</p>
        </div>
        <div className="score-panel typing-stats" aria-label={isEnglish ? "Typing Game status" : "タイピングゲームの状態"}>
          <div>
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{timeLeft}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout typing-layout">
        <div className="typing-stage">
          <p className="typing-japanese">{phrase.text}</p>
          <p className={`typing-reading${isCurrentInputValid ? "" : " is-wrong"}`}>
            <span className="typed">{input}</span>
            <span>{remaining}</span>
          </p>
          <input
            ref={inputRef}
            className="typing-input"
            type="text"
            value={input}
            onChange={(event) => handleInput(event.target.value)}
            disabled={status !== "playing"}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label={isEnglish ? "Romaji input" : "ローマ字入力"}
            placeholder={status === "playing" ? (isEnglish ? "Type here" : "ここに入力") : (isEnglish ? "Press Start" : "スタートを押してください")}
          />
          <button className="typing-start-button" type="button" onClick={startRound}>
            <Keyboard aria-hidden="true" />
            {status === "playing" ? (isEnglish ? "Restart" : "最初から") : (isEnglish ? "Start" : "スタート")}
          </button>
        </div>

        <aside className="puzzle-side typing-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to Play" : "遊び方"}</h2>
            <p>{isEnglish ? "Type the romaji for the Japanese phrase shown on screen. Score as many accurate keystrokes as you can in 60 seconds." : "表示された日本語に対応するローマ字を入力します。60秒でどれだけ正確に打てるかを競います。"}</p>
          </div>

          <div className="typing-progress">
            <span>{isEnglish ? "Accuracy" : "正確率"}: {accuracy}%</span>
            <span>{isEnglish ? "Completed phrases" : "完了フレーズ"}: {completedPhrases}</span>
            <span>{isEnglish ? "Correct characters" : "正解文字"}: {correctChars}</span>
            <span>{isEnglish ? "Typed characters" : "入力文字"}: {totalTyped}</span>
          </div>

          <div className="typing-best">
            <h2>{isEnglish ? "Best" : "ベスト"}</h2>
            {bestResult ? (
              <p>
                {isEnglish
                  ? `${bestResult.score} pts / Accuracy ${bestResult.accuracy}% / ${bestResult.completedPhrases} phrases`
                  : `${bestResult.score}点 / 正確率${bestResult.accuracy}% / ${bestResult.completedPhrases}フレーズ`}
              </p>
            ) : (
              <p>{isEnglish ? "No record yet." : "まだ記録がありません。"}</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score, display: isEnglish ? `${score} pts` : `${score}点`, meta: isEnglish ? `Accuracy ${accuracy}% / ${completedPhrases} phrases` : `正確率${accuracy}% / ${completedPhrases}フレーズ` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startRound}>
              <Keyboard aria-hidden="true" />
              {isEnglish ? "Start round" : "挑戦"}
            </button>
            <button className="ghost-button" type="button" onClick={resetBest}>
              <RotateCcw aria-hidden="true" />
              {isEnglish ? "Clear best" : "ベスト削除"}
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            {isEnglish ? "Back to shelf" : "棚へ戻る"}
          </button>
        </aside>
      </div>
    </section>
  );
}
