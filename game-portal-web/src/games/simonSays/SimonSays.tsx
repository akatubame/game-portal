import { Brain, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SimonBest, SimonColor, SimonStatus } from "./types";

type SimonSaysProps = {
  onBack: () => void;
};

type SimonPad = {
  id: SimonColor;
  label: string;
  tone: string;
};

const BEST_KEY = "game-shelf-simon-says-best";
const ROUND_CLEAR_LEVEL = 12;
const PADS: SimonPad[] = [
  { id: "green", label: "GREEN", tone: "みどり" },
  { id: "red", label: "RED", tone: "あか" },
  { id: "yellow", label: "YELLOW", tone: "きいろ" },
  { id: "blue", label: "BLUE", tone: "あお" }
];

function readBest(): SimonBest | null {
  const stored = window.localStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as SimonBest) : null;
}

function randomColor(): SimonColor {
  return PADS[Math.floor(Math.random() * PADS.length)].id;
}

function getMessage(status: SimonStatus, level: number, inputIndex: number) {
  if (status === "watching") {
    return "光る順番をよく見て覚えましょう。入力はまだ少し我慢です。";
  }

  if (status === "input") {
    return `${level}手のパターンを再現中です。${inputIndex + 1}つ目を押してください。`;
  }

  if (status === "failed") {
    return "惜しい！パターンが途切れました。もう一度チャレンジしましょう。";
  }

  if (status === "cleared") {
    return "全ラウンドクリア！この棚、記憶力の筋トレ場になってきました。";
  }

  return "スタートすると4色のボタンが順番に光ります。同じ順番で押して記憶力を試しましょう。";
}

export function SimonSays({ onBack }: SimonSaysProps) {
  const [status, setStatus] = useState<SimonStatus>("idle");
  const [sequence, setSequence] = useState<SimonColor[]>([]);
  const [inputIndex, setInputIndex] = useState(0);
  const [activeColor, setActiveColor] = useState<SimonColor | null>(null);
  const [best, setBest] = useState<SimonBest | null>(() => readBest());
  const [lastScore, setLastScore] = useState(0);
  const timeoutRefs = useRef<number[]>([]);

  const level = sequence.length;
  const score = useMemo(() => Math.max(0, level - (status === "idle" ? 0 : 1)) * 10 + inputIndex, [inputIndex, level, status]);
  const message = getMessage(status, level, inputIndex);

  const clearTimers = () => {
    timeoutRefs.current.forEach((timerId) => window.clearTimeout(timerId));
    timeoutRefs.current = [];
  };

  useEffect(() => {
    return clearTimers;
  }, []);

  const saveBest = (nextLevel: number, nextScore: number) => {
    if (best && (best.level > nextLevel || (best.level === nextLevel && best.score >= nextScore))) {
      return;
    }

    const nextBest = {
      level: nextLevel,
      score: nextScore,
      recordedAt: new Date().toISOString()
    };
    setBest(nextBest);
    window.localStorage.setItem(BEST_KEY, JSON.stringify(nextBest));
  };

  const showSequence = (nextSequence: SimonColor[]) => {
    clearTimers();
    setStatus("watching");
    setInputIndex(0);
    setActiveColor(null);

    const interval = Math.max(430, 760 - nextSequence.length * 24);
    nextSequence.forEach((color, index) => {
      const onTimer = window.setTimeout(() => {
        setActiveColor(color);
      }, 520 + index * interval);
      const offTimer = window.setTimeout(() => {
        setActiveColor(null);
      }, 820 + index * interval);
      timeoutRefs.current.push(onTimer, offTimer);
    });

    const inputTimer = window.setTimeout(() => {
      setStatus("input");
      setActiveColor(null);
    }, 980 + nextSequence.length * interval);
    timeoutRefs.current.push(inputTimer);
  };

  const startGame = () => {
    const firstSequence = [randomColor()];
    setLastScore(0);
    setSequence(firstSequence);
    showSequence(firstSequence);
  };

  const advanceRound = (currentSequence: SimonColor[]) => {
    const clearedScore = currentSequence.length * 10;
    setLastScore(clearedScore);
    saveBest(currentSequence.length, clearedScore);

    if (currentSequence.length >= ROUND_CLEAR_LEVEL) {
      setStatus("cleared");
      setActiveColor(null);
      setInputIndex(0);
      return;
    }

    const nextSequence = [...currentSequence, randomColor()];
    setSequence(nextSequence);
    showSequence(nextSequence);
  };

  const handlePadPress = (color: SimonColor) => {
    if (status !== "input") {
      return;
    }

    setActiveColor(color);
    const offTimer = window.setTimeout(() => setActiveColor(null), 180);
    timeoutRefs.current.push(offTimer);

    if (sequence[inputIndex] !== color) {
      const failedScore = Math.max(0, (sequence.length - 1) * 10 + inputIndex);
      setLastScore(failedScore);
      saveBest(Math.max(0, sequence.length - 1), failedScore);
      setStatus("failed");
      setInputIndex(0);
      return;
    }

    const nextInputIndex = inputIndex + 1;
    if (nextInputIndex >= sequence.length) {
      advanceRound(sequence);
      return;
    }

    setInputIndex(nextInputIndex);
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBest(null);
  };

  return (
    <section className="puzzle-shell simon-shell" aria-labelledby="simon-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">MEMORY / INTERNAL GAME</p>
          <h1 id="simon-title">Simon Says</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel simon-score" aria-label="Simon Saysの状態">
          <div>
            <span>Level</span>
            <strong>{level}</strong>
          </div>
          <div>
            <span>Input</span>
            <strong>{status === "input" ? `${inputIndex + 1}/${level}` : "--"}</strong>
          </div>
          <div>
            <span>Score</span>
            <strong>{score}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout simon-layout">
        <div className="simon-stage" aria-label="Simon Saysの4色ボタン">
          <div className="simon-board">
            {PADS.map((pad) => (
              <button
                className={`simon-pad is-${pad.id}${activeColor === pad.id ? " is-active" : ""}`}
                key={pad.id}
                type="button"
                onClick={() => handlePadPress(pad.id)}
                disabled={status !== "input"}
                aria-label={`${pad.tone}のボタン`}
              >
                <span>{pad.label}</span>
              </button>
            ))}
          </div>
          <div className="simon-orb" aria-hidden="true">
            <Brain />
          </div>
        </div>

        <aside className="puzzle-side simon-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              光った色の順番を覚えて、同じ順番で4色のボタンを押します。1ラウンドごとにパターンが1つずつ増え、
              12手まで到達するとクリアです。
            </p>
          </div>

          <div className="simon-progress">
            <span>現在: {status === "watching" ? "出題中" : status === "input" ? "入力中" : status === "cleared" ? "クリア" : status === "failed" ? "失敗" : "待機中"}</span>
            <span>直近スコア: {lastScore}</span>
            <span>ベスト: {best ? `Lv.${best.level} / ${best.score}点` : "まだ記録なし"}</span>
          </div>

          <div className="simon-sequence-preview" aria-label="現在のラウンド情報">
            <span>Pattern Length</span>
            <strong>{level || "-"}</strong>
            <small>出題中はボタンが自動で光ります。入力中になってから押してください。</small>
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startGame}>
              <Play aria-hidden="true" />
              スタート
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
