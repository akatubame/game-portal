import { Check, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import type { ColorChoice, ColorJudgeBest, ColorJudgeStatus, ColorQuestion } from "./types";

type ColorJudgeProps = {
  onBack: () => void;
};

const ROUND_SECONDS = 30;
const BEST_KEY = "game-shelf-color-judge-best";

const COLORS: ColorChoice[] = [
  { name: "red", label: "赤", value: "#ff6b6b" },
  { name: "blue", label: "青", value: "#72a7ff" },
  { name: "green", label: "緑", value: "#7ee787" },
  { name: "yellow", label: "黄", value: "#ffdf6e" },
  { name: "purple", label: "紫", value: "#c99cff" },
  { name: "pink", label: "桃", value: "#ff8ac7" }
];

const colorLabelsEn: Record<string, string> = {
  red: "Red",
  blue: "Blue",
  green: "Green",
  yellow: "Yellow",
  purple: "Purple",
  pink: "Pink"
};

function readBest(): ColorJudgeBest | null {
  const stored = window.localStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as ColorJudgeBest) : null;
}

function pickColor(excludeName?: string) {
  const candidates = excludeName ? COLORS.filter((color) => color.name !== excludeName) : COLORS;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function createQuestion(previous?: ColorQuestion): ColorQuestion {
  const shouldMatch = Math.random() < 0.5;
  const textColor = pickColor(previous?.textColor.name);
  const wordColor = shouldMatch ? textColor : pickColor(textColor.name);
  return { textColor, wordColor };
}

function calculateScore(correct: number, mistakes: number, bestCombo: number) {
  return Math.max(0, correct * 120 + bestCombo * 35 - mistakes * 80);
}

export function ColorJudge({ onBack }: ColorJudgeProps) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [status, setStatus] = useState<ColorJudgeStatus>("idle");
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [question, setQuestion] = useState<ColorQuestion>(() => createQuestion());
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [message, setMessage] = useState("文字の意味と文字色が一致しているか、素早く判定しましょう。");
  const [best, setBest] = useState<ColorJudgeBest | null>(() => readBest());
  const resultSavedRef = useRef(false);

  const score = useMemo(() => calculateScore(correct, mistakes, bestCombo), [bestCombo, correct, mistakes]);
  const ranking = useRanking({ gameId: "color-judge-score", metricLabel: "Score", mode: "higher" });
  const isMatch = question.textColor.name === question.wordColor.name;
  const visibleMessage = isEnglish
    ? status === "idle"
      ? "Quickly judge whether the word meaning matches its text color."
      : status === "playing"
        ? "Ignore the word meaning and focus on the text color."
        : message.includes("更新")
          ? "Finished! You set a new best score."
          : message.includes("終了")
            ? "Finished! Try again and aim for a new best score."
            : message
    : message;

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
    if (status !== "playing" || timeLeft > 0 || resultSavedRef.current) {
      return;
    }

    resultSavedRef.current = true;
    const result: ColorJudgeBest = {
      score,
      correct,
      mistakes,
      bestCombo,
      recordedAt: new Date().toISOString()
    };

    if (!best || result.score > best.score) {
      setBest(result);
      window.localStorage.setItem(BEST_KEY, JSON.stringify(result));
      setMessage("終了！ベストスコアを更新しました。");
    } else {
      setMessage("終了！もう一度挑戦してベスト更新を狙いましょう。");
    }

    setStatus("finished");
  }, [best, bestCombo, correct, mistakes, score, status, timeLeft]);

  const startRound = () => {
    resultSavedRef.current = false;
    setStatus("playing");
    setTimeLeft(ROUND_SECONDS);
    setQuestion(createQuestion());
    setCorrect(0);
    setMistakes(0);
    setCombo(0);
    setBestCombo(0);
    setMessage("意味ではなく、文字色との一致を見ましょう。");
  };

  const answer = (answerIsMatch: boolean) => {
    if (status !== "playing") {
      return;
    }

    if (answerIsMatch === isMatch) {
      const nextCombo = combo + 1;
      setCorrect((current) => current + 1);
      setCombo(nextCombo);
      setBestCombo((current) => Math.max(current, nextCombo));
      setMessage(nextCombo >= 5 ? `${nextCombo}コンボ！いい集中です。` : "正解！");
    } else {
      setMistakes((current) => current + 1);
      setCombo(0);
      setMessage("ミス。文字の意味と色を分けて見ましょう。");
    }

    setQuestion((current) => createQuestion(current));
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBest(null);
  };

  return (
    <section className="puzzle-shell color-shell" aria-labelledby="color-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">BRAIN TRAINING / INTERNAL GAME</p>
          <h1 id="color-title">{isEnglish ? "Color Judge" : "カラー判定ゲーム"}</h1>
          <p className="lead">{visibleMessage}</p>
        </div>
        <div className="score-panel color-score" aria-label={isEnglish ? "Color Judge status" : "カラー判定ゲームの状態"}>
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

      <div className="puzzle-layout color-layout">
        <div className="color-stage" aria-label={isEnglish ? "current question" : "現在の問題"}>
          <p className="color-instruction">{isEnglish ? "Does this word match its text color?" : "この文字は、意味と色が一致していますか？"}</p>
          <div className="color-word-card">
            <span className="color-word" style={{ color: question.textColor.value }}>
              {isEnglish ? colorLabelsEn[question.wordColor.name] : question.wordColor.label}
            </span>
            <span className="color-reading">{isEnglish ? "Text color" : "文字色"}: {isEnglish ? colorLabelsEn[question.textColor.name] : question.textColor.label}</span>
          </div>

          <div className="color-answer-row">
            <button className="color-answer is-match" type="button" onClick={() => answer(true)} disabled={status !== "playing"}>
              <Check aria-hidden="true" />
              {isEnglish ? "Match" : "一致"}
            </button>
            <button className="color-answer is-different" type="button" onClick={() => answer(false)} disabled={status !== "playing"}>
              <X aria-hidden="true" />
              {isEnglish ? "Different" : "違う"}
            </button>
          </div>
        </div>

        <aside className="puzzle-side color-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to play" : "遊び方"}</h2>
            <p>
              {isEnglish
                ? "Example: if the word “Red” is shown in red, choose Match; if it is shown in blue, choose Different. Get as many correct answers and combos as you can in 30 seconds."
                : "例: 「赤」という文字が赤色で表示されていれば「一致」、青色で表示されていれば「違う」です。30秒間で正答数とコンボを伸ばしましょう。"}
            </p>
          </div>

          <div className="color-progress">
            <span>{isEnglish ? "Correct" : "正解"}: {correct}</span>
            <span>{isEnglish ? "Misses" : "ミス"}: {mistakes}</span>
            <span>{isEnglish ? "Combo" : "コンボ"}: {combo}</span>
            <span>{isEnglish ? "Best combo" : "最高コンボ"}: {bestCombo}</span>
          </div>

          <div className="color-best">
            <h2>{isEnglish ? "Best" : "ベスト"}</h2>
            {best ? (
              <p>
                {isEnglish ? `${best.score} pts / Correct ${best.correct} / Best combo ${best.bestCombo}` : `${best.score}点 / 正解 ${best.correct} / 最高 ${best.bestCombo}コンボ`}
              </p>
            ) : (
              <p>{isEnglish ? "No record yet." : "まだ記録がありません。"}</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score, display: isEnglish ? `${score} pts` : `${score}点`, meta: isEnglish ? `Correct ${correct} / Best combo ${bestCombo}` : `正解 ${correct} / 最高 ${bestCombo}コンボ` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startRound}>
              <Check aria-hidden="true" />
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
