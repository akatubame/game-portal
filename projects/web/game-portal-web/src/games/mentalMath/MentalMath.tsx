import { useLocalizedMessage } from "../useLocalizedMessage";
import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { useCountdown } from "../useCountdown";
import { safeStorage } from "../../safeStorage";
import { Calculator, RotateCcw, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import type { MathOperator, MathProblem, MentalMathResult, MentalMathStatus } from "./types";

type MentalMathProps = {
  onBack: () => void;
};

const ROUND_SECONDS = 60;
const BEST_KEY = "game-shelf-mental-math-best";

function readBestResult(): MentalMathResult | null {
  const stored = safeStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as MentalMathResult) : null;
}

function createProblem(): MathProblem {
  const operators: MathOperator[] = ["+", "-", "×"];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  if (operator === "+") {
    const left = 8 + Math.floor(Math.random() * 92);
    const right = 5 + Math.floor(Math.random() * 95);
    return { left, right, operator, answer: left + right };
  }

  if (operator === "-") {
    const answer = 3 + Math.floor(Math.random() * 97);
    const right = 4 + Math.floor(Math.random() * 86);
    return { left: answer + right, right, operator, answer };
  }

  const left = 3 + Math.floor(Math.random() * 10);
  const right = 3 + Math.floor(Math.random() * 10);
  return { left, right, operator, answer: left * right };
}

function calculateScore(solved: number, mistakes: number, bestStreak: number) {
  return Math.max(0, solved * 120 + bestStreak * 40 - mistakes * 35);
}

export function MentalMath({ onBack }: MentalMathProps) {
  const confirmRecordReset = useConfirmRecordReset();
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [status, setStatus] = useState<MentalMathStatus>("idle");
  const [problem, setProblem] = useState<MathProblem>(() => createProblem());
  const [answer, setAnswer] = useState("");
  const { timeLeft, resetCountdown, hasExpired } = useCountdown(status === "playing", ROUND_SECONDS);
  const [solved, setSolved] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [message, setMessage] = useLocalizedMessage("スタートを押して、60秒の暗算チャレンジを始めましょう。", "Press Start to begin a 60-second mental math challenge.");
  const [bestResult, setBestResult] = useState<MentalMathResult | null>(() => readBestResult());
  const inputRef = useRef<HTMLInputElement | null>(null);

  const score = useMemo(() => calculateScore(solved, mistakes, bestStreak), [bestStreak, mistakes, solved]);
  const ranking = useRanking({ gameId: "mental-math-score", metricLabel: "Score", mode: "higher" });
  const visibleMessage = message;


  useEffect(() => {
    if (status !== "playing" || timeLeft > 0) {
      return;
    }

    finishRound();
  }, [status, timeLeft]);

  const startRound = () => {
    setStatus("playing");
    setProblem(createProblem());
    setAnswer("");
    resetCountdown();
    setSolved(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setMessage("答えを入力してEnter、または回答ボタンで送信します。", "Enter your answer and press Enter, or use the Answer button.");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const finishRound = () => {
    setStatus("finished");
    setAnswer("");
    setMessage("終了です。もう一度挑戦して、ベストスコア更新を狙いましょう。", "Finished. Try again and aim for a new best score.");

    const result: MentalMathResult = {
      score,
      solved,
      mistakes,
      bestStreak,
      recordedAt: new Date().toISOString()
    };

    if (!bestResult || result.score > bestResult.score) {
      setBestResult(result);
      safeStorage.setItem(BEST_KEY, JSON.stringify(result));
    }
  };

  const submitAnswer = () => {
    if (hasExpired() || status !== "playing" || answer.trim() === "") {
      return;
    }

    const numericAnswer = Number(answer);

    if (numericAnswer === problem.answer) {
      const nextStreak = streak + 1;
      setSolved((current) => current + 1);
      setStreak(nextStreak);
      setBestStreak((current) => Math.max(current, nextStreak));
      setProblem(createProblem());
      setAnswer("");
      setMessage(nextStreak >= 5 ? `正解！ ${nextStreak}連続正解です。いい流れ。` : "正解です。次の問題へ！", nextStreak >= 5 ? `Correct! ${nextStreak} in a row. Nice streak!` : "Correct! On to the next problem.");
      return;
    }

    setMistakes((current) => current + 1);
    setStreak(0);
    setAnswer("");
    setMessage(`惜しいです。正解は ${problem.answer} でした。次で取り返しましょう。`, `Not quite. The answer was ${problem.answer}. Try the next problem!`);
    setProblem(createProblem());
  };

  const resetBest = () => {
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  return (
    <section data-native-i18n className="puzzle-shell mental-math-shell" aria-labelledby="mental-math-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SCORE ATTACK / INTERNAL GAME</p>
          <h1 id="mental-math-title">{isEnglish ? "Mental Math" : "計算ゲーム"}</h1>
          <p className="lead">{visibleMessage}</p>
        </div>
        <div className="score-panel mental-math-stats" aria-label={isEnglish ? "Mental Math status" : "計算ゲームの状態"}>
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

      <div className="puzzle-layout mental-math-layout">
        <div className="mental-math-stage">
          <div className="mental-math-problem" aria-live="polite">
            <span>{problem.left}</span>
            <span>{problem.operator}</span>
            <span>{problem.right}</span>
            <span>=</span>
            <span>?</span>
          </div>

          <div className="mental-math-answer-row">
            <input
              ref={inputRef}
              className="mental-math-input"
              type="number"
              inputMode="numeric"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submitAnswer();
                }
              }}
              disabled={status !== "playing"}
              aria-label={isEnglish ? "Answer" : "答え"}
              placeholder={status === "playing" ? (isEnglish ? "Answer" : "答え") : (isEnglish ? "Type after starting" : "スタート後に入力")}
            />
            <button className="mental-math-submit" type="button" onClick={submitAnswer} disabled={status !== "playing"}>
              <Send aria-hidden="true" />
              {isEnglish ? "Answer" : "回答"}
            </button>
          </div>

          <button className="mental-math-start-button" type="button" onClick={startRound}>
            <Calculator aria-hidden="true" />
            {status === "playing" ? (isEnglish ? "Restart" : "最初から") : (isEnglish ? "Start" : "スタート")}
          </button>
        </div>

        <aside className="puzzle-side mental-math-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to play" : "遊び方"}</h2>
            <p>
              {isEnglish
                ? "Solve as many displayed math problems as you can in 60 seconds. Addition, subtraction, and multiplication appear randomly; correct streaks are the key to higher scores."
                : "60秒以内に表示された計算問題をできるだけ多く解きます。足し算・引き算・掛け算がランダムに出題され、連続正解がスコアを伸ばす鍵です。"}
            </p>
          </div>

          <div className="mental-math-progress">
            <span>{isEnglish ? "Correct" : "正解数"}: {solved}</span>
            <span>{isEnglish ? "Misses" : "ミス"}: {mistakes}</span>
            <span>{isEnglish ? "Streak" : "連続正解"}: {streak}</span>
            <span>{isEnglish ? "Best streak" : "最高連続"}: {bestStreak}</span>
          </div>

          <div className="mental-math-best">
            <h2>{isEnglish ? "Best" : "ベスト"}</h2>
            {bestResult ? (
              <p>
                {isEnglish
                  ? `${bestResult.score} pts / ${bestResult.solved} solved / best ${bestResult.bestStreak} streak`
                  : `${bestResult.score}点 / ${bestResult.solved}問正解 / 最高${bestResult.bestStreak}連続`}
              </p>
            ) : (
              <p>{isEnglish ? "No record yet." : "まだ記録がありません。"}</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score, display: isEnglish ? `${score} pts` : `${score}点`, meta: isEnglish ? `${solved} solved / best ${bestStreak} streak` : `${solved}問正解 / 最高${bestStreak}連続` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startRound}>
              <Calculator aria-hidden="true" />
              {isEnglish ? "Challenge" : "挑戦"}
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
