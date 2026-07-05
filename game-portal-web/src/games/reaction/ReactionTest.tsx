import { RotateCcw, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactionResult, ReactionStatus } from "./types";

type ReactionTestProps = {
  onBack: () => void;
};

const BEST_KEY = "game-shelf-reaction-best";
const HISTORY_KEY = "game-shelf-reaction-history";

function readBestResult(): ReactionResult | null {
  const stored = window.localStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as ReactionResult) : null;
}

function readHistory(): ReactionResult[] {
  const stored = window.localStorage.getItem(HISTORY_KEY);
  return stored ? (JSON.parse(stored) as ReactionResult[]) : [];
}

function getMessage(status: ReactionStatus, lastResult: ReactionResult | null) {
  if (status === "waiting") {
    return "まだです……画面が光るまで待ってください。";
  }

  if (status === "ready") {
    return "今です！クリック！";
  }

  if (status === "tooSoon") {
    return "早すぎました。合図が出てからクリックしましょう。";
  }

  if (status === "finished" && lastResult) {
    return `${lastResult.milliseconds}ms。もう一回いきますか？`;
  }

  return "スタートを押して、画面が光ったらできるだけ早くクリックしてください。";
}

export function ReactionTest({ onBack }: ReactionTestProps) {
  const [status, setStatus] = useState<ReactionStatus>("idle");
  const [bestResult, setBestResult] = useState<ReactionResult | null>(() => readBestResult());
  const [lastResult, setLastResult] = useState<ReactionResult | null>(null);
  const [history, setHistory] = useState<ReactionResult[]>(() => readHistory());
  const timeoutRef = useRef<number | null>(null);
  const readyAtRef = useRef<number | null>(null);

  const average = useMemo(() => {
    if (history.length === 0) {
      return null;
    }

    return Math.round(history.reduce((total, result) => total + result.milliseconds, 0) / history.length);
  }, [history]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startRound = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    readyAtRef.current = null;
    setLastResult(null);
    setStatus("waiting");

    const delay = 1400 + Math.floor(Math.random() * 3200);
    timeoutRef.current = window.setTimeout(() => {
      readyAtRef.current = performance.now();
      setStatus("ready");
    }, delay);
  };

  const resetRecords = () => {
    window.localStorage.removeItem(BEST_KEY);
    window.localStorage.removeItem(HISTORY_KEY);
    setBestResult(null);
    setHistory([]);
    setLastResult(null);
    setStatus("idle");
  };

  const handleTargetClick = () => {
    if (status === "idle" || status === "finished" || status === "tooSoon") {
      startRound();
      return;
    }

    if (status === "waiting") {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      readyAtRef.current = null;
      setStatus("tooSoon");
      return;
    }

    if (status === "ready" && readyAtRef.current !== null) {
      const milliseconds = Math.round(performance.now() - readyAtRef.current);
      const result = { milliseconds, recordedAt: new Date().toISOString() };
      const nextHistory = [result, ...history].slice(0, 5);

      setLastResult(result);
      setHistory(nextHistory);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));

      if (!bestResult || milliseconds < bestResult.milliseconds) {
        setBestResult(result);
        window.localStorage.setItem(BEST_KEY, JSON.stringify(result));
      }

      setStatus("finished");
    }
  };

  const message = getMessage(status, lastResult);

  return (
    <section className="puzzle-shell reaction-shell" aria-labelledby="reaction-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SCORE ATTACK / INTERNAL GAME</p>
          <h1 id="reaction-title">反射神経テスト</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel reaction-stats" aria-label="反射神経テストの状態">
          <div>
            <span>Best</span>
            <strong>{bestResult ? `${bestResult.milliseconds}` : "---"}</strong>
          </div>
          <div>
            <span>Last</span>
            <strong>{lastResult ? `${lastResult.milliseconds}` : "---"}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout reaction-layout">
        <button
          className={`reaction-target is-${status}`}
          type="button"
          onClick={handleTargetClick}
          aria-label="反射神経テストの操作エリア"
        >
          <Zap aria-hidden="true" />
          <span>
            {status === "waiting"
              ? "待て"
              : status === "ready"
                ? "CLICK"
                : status === "tooSoon"
                  ? "早い！"
                  : "START"}
          </span>
        </button>

        <aside className="puzzle-side reaction-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              スタート後、合図が出るまではクリックしないでください。画面が光った瞬間にクリックすると反応速度を測定します。
            </p>
          </div>

          <div className="reaction-progress">
            <span>平均: {average ? `${average}ms` : "未記録"}</span>
            <span>記録数: {history.length}/5</span>
            <span>状態: {status === "waiting" ? "待機中" : status === "ready" ? "合図中" : "待機前"}</span>
          </div>

          <div className="reaction-history">
            <h2>最近の記録</h2>
            {history.length === 0 ? (
              <p>まだ記録がありません。</p>
            ) : (
              <ol>
                {history.map((result) => (
                  <li key={result.recordedAt}>{result.milliseconds}ms</li>
                ))}
              </ol>
            )}
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startRound}>
              <Zap aria-hidden="true" />
              スタート
            </button>
            <button className="ghost-button" type="button" onClick={resetRecords}>
              <RotateCcw aria-hidden="true" />
              記録リセット
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
