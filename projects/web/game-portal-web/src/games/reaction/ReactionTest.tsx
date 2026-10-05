import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { safeStorage } from "../../safeStorage";
import { useI18n } from "../../i18n";
import { RotateCcw, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { ReactionResult, ReactionStatus } from "./types";

type ReactionTestProps = {
  onBack: () => void;
};

const BEST_KEY = "game-shelf-reaction-best";
const HISTORY_KEY = "game-shelf-reaction-history";

function readBestResult(): ReactionResult | null {
  const stored = safeStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as ReactionResult) : null;
}

function readHistory(): ReactionResult[] {
  const stored = safeStorage.getItem(HISTORY_KEY);
  return stored ? (JSON.parse(stored) as ReactionResult[]) : [];
}

function getMessage(status: ReactionStatus, lastResult: ReactionResult | null, en: boolean) {
  if (status === "waiting") {
    return en ? "Not yet... Wait for the signal." : "まだです……画面が光るまで待ってください。";
  }

  if (status === "ready") {
    return en ? "Now! Click!" : "今です！クリック！";
  }

  if (status === "tooSoon") {
    return en ? "Too soon! Wait for the signal before clicking." : "早すぎました。合図が出てからクリックしましょう。";
  }

  if (status === "finished" && lastResult) {
    return en ? `${lastResult.milliseconds}ms. Try again?` : `${lastResult.milliseconds}ms。もう一回いきますか？`;
  }

  return en ? "Press Start, then click as quickly as you can when the signal appears." : "スタートを押して、画面が光ったらできるだけ早くクリックしてください。";
}

export function ReactionTest({ onBack }: ReactionTestProps) {
  const confirmRecordReset = useConfirmRecordReset();
  const { language } = useI18n();
  const en = language === "en";
  const text = (ja: string, english: string) => en ? english : ja;
  const [status, setStatus] = useState<ReactionStatus>("idle");
  const [bestResult, setBestResult] = useState<ReactionResult | null>(() => readBestResult());
  const [lastResult, setLastResult] = useState<ReactionResult | null>(null);
  const [history, setHistory] = useState<ReactionResult[]>(() => readHistory());
  const timeoutRef = useRef<number | null>(null);
  const readyAtRef = useRef<number | null>(null);
  const ranking = useRanking({ gameId: "reaction-time", metricLabel: "Time", mode: "lower" });

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
    if (!confirmRecordReset()) return;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    readyAtRef.current = null;
    safeStorage.removeItem(BEST_KEY);
    safeStorage.removeItem(HISTORY_KEY);
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
      safeStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));

      if (!bestResult || milliseconds < bestResult.milliseconds) {
        setBestResult(result);
        safeStorage.setItem(BEST_KEY, JSON.stringify(result));
      }

      setStatus("finished");
    }
  };

  const message = getMessage(status, lastResult, en);

  return (
    <section data-native-i18n className="puzzle-shell reaction-shell" aria-labelledby="reaction-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SCORE ATTACK / INTERNAL GAME</p>
          <h1 id="reaction-title">{text("反射神経テスト", "Reaction Test")}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel reaction-stats" aria-label={text("反射神経テストの状態", "Reaction test status")}>
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
          aria-label={text("反射神経テストの操作エリア", "Reaction test target")}
        >
          <Zap aria-hidden="true" />
          <span>
            {status === "waiting"
              ? text("待て", "WAIT")
              : status === "ready"
                ? "CLICK"
                : status === "tooSoon"
                  ? text("早い！", "TOO SOON!")
                  : "START"}
          </span>
        </button>

        <aside className="puzzle-side reaction-side">
          <div className="rule-card">
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("スタート後、合図が出るまではクリックしないでください。画面が光った瞬間にクリックすると反応速度を測定します。", "After starting, wait for the signal. Click as soon as the target lights up to measure your reaction time.")}
            </p>
          </div>

          <div className="reaction-progress">
            <span>{text("平均", "Average")}: {average !== null ? `${average}ms` : text("未記録", "No record")}</span>
            <span>{text("記録数", "Records")}: {history.length}/5</span>
            <span>{text("状態", "Status")}: {status === "waiting" ? text("待機中", "Waiting") : status === "ready" ? text("合図中", "Go!") : status === "finished" ? text("測定完了", "Finished") : status === "tooSoon" ? text("フライング", "Too soon") : text("待機前", "Idle")}</span>
          </div>

          <div className="reaction-history">
            <h2>{text("最近の記録", "Recent results")}</h2>
            {history.length === 0 ? (
              <p>{text("まだ記録がありません。", "No records yet.")}</p>
            ) : (
              <ol>
                {history.map((result) => (
                  <li key={result.recordedAt}>{result.milliseconds}ms</li>
                ))}
              </ol>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={lastResult ? { score: lastResult.milliseconds, display: `${lastResult.milliseconds}ms` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startRound}>
              <Zap aria-hidden="true" />
              {text("スタート", "Start")}
            </button>
            <button className="ghost-button" type="button" onClick={resetRecords}>
              <RotateCcw aria-hidden="true" />
              {text("記録リセット", "Reset records")}
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
