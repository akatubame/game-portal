import { Calculator, RotateCcw, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { MathOperator, MathProblem, MentalMathResult, MentalMathStatus } from "./types";

type MentalMathProps = {
  onBack: () => void;
};

const ROUND_SECONDS = 60;
const BEST_KEY = "game-shelf-mental-math-best";

function readBestResult(): MentalMathResult | null {
  const stored = window.localStorage.getItem(BEST_KEY);
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
  const [status, setStatus] = useState<MentalMathStatus>("idle");
  const [problem, setProblem] = useState<MathProblem>(() => createProblem());
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [solved, setSolved] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [message, setMessage] = useState("スタートを押して、60秒の暗算チャレンジを始めましょう。");
  const [bestResult, setBestResult] = useState<MentalMathResult | null>(() => readBestResult());
  const inputRef = useRef<HTMLInputElement | null>(null);

  const score = useMemo(() => calculateScore(solved, mistakes, bestStreak), [bestStreak, mistakes, solved]);
  const ranking = useRanking({ gameId: "mental-math-score", metricLabel: "Score", mode: "higher" });

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const timerId = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [status]);

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
    setTimeLeft(ROUND_SECONDS);
    setSolved(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setMessage("答えを入力してEnter、または回答ボタンで送信します。");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const finishRound = () => {
    setStatus("finished");
    setAnswer("");
    setMessage("終了です。もう一度挑戦して、ベストスコア更新を狙いましょう。");

    const result: MentalMathResult = {
      score,
      solved,
      mistakes,
      bestStreak,
      recordedAt: new Date().toISOString()
    };

    if (!bestResult || result.score > bestResult.score) {
      setBestResult(result);
      window.localStorage.setItem(BEST_KEY, JSON.stringify(result));
    }
  };

  const submitAnswer = () => {
    if (status !== "playing" || answer.trim() === "") {
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
      setMessage(nextStreak >= 5 ? `正解！ ${nextStreak}連続正解です。いい流れ。` : "正解です。次の問題へ！");
      return;
    }

    setMistakes((current) => current + 1);
    setStreak(0);
    setAnswer("");
    setMessage(`惜しいです。正解は ${problem.answer} でした。次で取り返しましょう。`);
    setProblem(createProblem());
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  return (
    <section className="puzzle-shell mental-math-shell" aria-labelledby="mental-math-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SCORE ATTACK / INTERNAL GAME</p>
          <h1 id="mental-math-title">計算ゲーム</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel mental-math-stats" aria-label="計算ゲームの状態">
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
              aria-label="答え"
              placeholder={status === "playing" ? "答え" : "スタート後に入力"}
            />
            <button className="mental-math-submit" type="button" onClick={submitAnswer} disabled={status !== "playing"}>
              <Send aria-hidden="true" />
              回答
            </button>
          </div>

          <button className="mental-math-start-button" type="button" onClick={startRound}>
            <Calculator aria-hidden="true" />
            {status === "playing" ? "最初から" : "スタート"}
          </button>
        </div>

        <aside className="puzzle-side mental-math-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              60秒以内に表示された計算問題をできるだけ多く解きます。足し算・引き算・掛け算がランダムに出題され、連続正解がスコアを伸ばす鍵です。
            </p>
          </div>

          <div className="mental-math-progress">
            <span>正解数: {solved}</span>
            <span>ミス: {mistakes}</span>
            <span>連続正解: {streak}</span>
            <span>最高連続: {bestStreak}</span>
          </div>

          <div className="mental-math-best">
            <h2>ベスト</h2>
            {bestResult ? (
              <p>
                {bestResult.score}点 / {bestResult.solved}問正解 / 最高{bestResult.bestStreak}連続
              </p>
            ) : (
              <p>まだ記録がありません。</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score, display: `${score}点`, meta: `${solved}問正解 / 最高${bestStreak}連続` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startRound}>
              <Calculator aria-hidden="true" />
              挑戦
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
