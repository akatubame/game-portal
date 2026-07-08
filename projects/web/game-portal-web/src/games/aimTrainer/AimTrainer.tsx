import { Crosshair, RotateCcw, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { AimTarget, AimTrainerResult, AimTrainerStatus } from "./types";

type AimTrainerProps = {
  onBack: () => void;
};

const ROUND_SECONDS = 30;
const BEST_KEY = "game-shelf-aim-trainer-best";

function readBestResult(): AimTrainerResult | null {
  const stored = window.localStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as AimTrainerResult) : null;
}

function createTarget(): AimTarget {
  return {
    x: 9 + Math.random() * 82,
    y: 12 + Math.random() * 76,
    size: 46 + Math.floor(Math.random() * 26)
  };
}

function calculateAccuracy(hits: number, misses: number) {
  const attempts = hits + misses;

  if (attempts === 0) {
    return 100;
  }

  return Math.round((hits / attempts) * 100);
}

function calculateScore(hits: number, misses: number, bestStreak: number) {
  return Math.max(0, hits * 100 + bestStreak * 35 - misses * 25);
}

export function AimTrainer({ onBack }: AimTrainerProps) {
  const [status, setStatus] = useState<AimTrainerStatus>("idle");
  const [target, setTarget] = useState<AimTarget>(() => createTarget());
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [message, setMessage] = useState("スタートを押して、30秒間のエイム練習を始めましょう。");
  const [bestResult, setBestResult] = useState<AimTrainerResult | null>(() => readBestResult());

  const accuracy = useMemo(() => calculateAccuracy(hits, misses), [hits, misses]);
  const score = useMemo(() => calculateScore(hits, misses, bestStreak), [bestStreak, hits, misses]);
  const ranking = useRanking({ gameId: "aim-trainer-score", metricLabel: "Score", mode: "higher" });

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
    if (status === "playing" && timeLeft === 0) {
      finishRound();
    }
  }, [status, timeLeft]);

  const startRound = () => {
    setStatus("playing");
    setTarget(createTarget());
    setTimeLeft(ROUND_SECONDS);
    setHits(0);
    setMisses(0);
    setStreak(0);
    setBestStreak(0);
    setMessage("丸いターゲットをクリック。空振りするとミスになります。");
  };

  const finishRound = () => {
    setStatus("finished");
    setMessage("終了です。次はもっと素早く、でも正確に狙ってみましょう。");

    const result: AimTrainerResult = {
      score,
      hits,
      misses,
      accuracy,
      bestStreak,
      recordedAt: new Date().toISOString()
    };

    if (!bestResult || result.score > bestResult.score) {
      setBestResult(result);
      window.localStorage.setItem(BEST_KEY, JSON.stringify(result));
    }
  };

  const hitTarget = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (status !== "playing") {
      return;
    }

    const nextStreak = streak + 1;
    setHits((current) => current + 1);
    setStreak(nextStreak);
    setBestStreak((current) => Math.max(current, nextStreak));
    setTarget(createTarget());
    setMessage(nextStreak >= 8 ? `${nextStreak}連続ヒット。かなりいいリズムです。` : "ヒット！次のターゲットへ。");
  };

  const missTarget = () => {
    if (status !== "playing") {
      return;
    }

    setMisses((current) => current + 1);
    setStreak(0);
    setMessage("ミス。落ち着いて中心を狙いましょう。");
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  return (
    <section className="puzzle-shell aim-shell" aria-labelledby="aim-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SCORE ATTACK / INTERNAL GAME</p>
          <h1 id="aim-title">エイム練習</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel aim-stats" aria-label="エイム練習の状態">
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

      <div className="puzzle-layout aim-layout">
        <div
          className={`aim-arena is-${status}`}
          onClick={missTarget}
          role="presentation"
          aria-label="エイム練習エリア"
        >
          {status === "playing" ? (
            <button
              className="aim-target"
              type="button"
              onClick={hitTarget}
              style={{
                left: `${target.x}%`,
                top: `${target.y}%`,
                width: `${target.size}px`,
                height: `${target.size}px`
              }}
              aria-label="ターゲット"
            >
              <span />
            </button>
          ) : (
            <div className="aim-idle-card">
              <Crosshair aria-hidden="true" />
              <p>{status === "finished" ? "もう一度挑戦できます" : "スタート待機中"}</p>
            </div>
          )}
        </div>

        <aside className="puzzle-side aim-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              30秒間、出現するターゲットをクリックしてスコアを伸ばします。空振りはミスになり、連続ヒットが途切れます。
            </p>
          </div>

          <div className="aim-progress">
            <span>ヒット: {hits}</span>
            <span>ミス: {misses}</span>
            <span>命中率: {accuracy}%</span>
            <span>連続ヒット: {streak}</span>
            <span>最高連続: {bestStreak}</span>
          </div>

          <div className="aim-best">
            <h2>ベスト</h2>
            {bestResult ? (
              <p>
                {bestResult.score}点 / {bestResult.hits}ヒット / 命中率{bestResult.accuracy}%
              </p>
            ) : (
              <p>まだ記録がありません。</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score, display: `${score}点`, meta: `${hits}ヒット / 命中率${accuracy}%` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startRound}>
              <Target aria-hidden="true" />
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
