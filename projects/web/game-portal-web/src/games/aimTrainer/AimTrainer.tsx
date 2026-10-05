import { useI18n } from "../../i18n";
import { useLocalizedMessage } from "../useLocalizedMessage";
import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { useCountdown } from "../useCountdown";
import { safeStorage } from "../../safeStorage";
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
  const stored = safeStorage.getItem(BEST_KEY);
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
  const confirmRecordReset = useConfirmRecordReset();
  const { language } = useI18n();
  const text = (ja: string, en: string) => language === "en" ? en : ja;
  const [status, setStatus] = useState<AimTrainerStatus>("idle");
  const [target, setTarget] = useState<AimTarget>(() => createTarget());
  const { timeLeft, resetCountdown, hasExpired } = useCountdown(status === "playing", ROUND_SECONDS);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [message, setMessage] = useLocalizedMessage("スタートを押して、30秒間のエイム練習を始めましょう。", "Press Challenge to begin 30 seconds of aim practice.");
  const [bestResult, setBestResult] = useState<AimTrainerResult | null>(() => readBestResult());

  const accuracy = useMemo(() => calculateAccuracy(hits, misses), [hits, misses]);
  const score = useMemo(() => calculateScore(hits, misses, bestStreak), [bestStreak, hits, misses]);
  const ranking = useRanking({ gameId: "aim-trainer-score", metricLabel: "Score", mode: "higher" });


  useEffect(() => {
    if (status === "playing" && timeLeft === 0) {
      finishRound();
    }
  }, [status, timeLeft]);

  const startRound = () => {
    setStatus("playing");
    setTarget(createTarget());
    resetCountdown();
    setHits(0);
    setMisses(0);
    setStreak(0);
    setBestStreak(0);
    setMessage("丸いターゲットをクリック。空振りするとミスになります。", "Click the round target. Clicking outside it counts as a miss.");
  };

  const finishRound = () => {
    setStatus("finished");
    setMessage("終了です。次はもっと素早く、でも正確に狙ってみましょう。", "Finished. Try again for faster, more accurate hits.");

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
      safeStorage.setItem(BEST_KEY, JSON.stringify(result));
    }
  };

  const hitTarget = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (hasExpired() || status !== "playing") {
      return;
    }

    const nextStreak = streak + 1;
    setHits((current) => current + 1);
    setStreak(nextStreak);
    setBestStreak((current) => Math.max(current, nextStreak));
    setTarget(createTarget());
    setMessage(nextStreak >= 8 ? `${nextStreak}連続ヒット。かなりいいリズムです。` : "ヒット！次のターゲットへ。", nextStreak >= 8 ? `${nextStreak} hits in a row. Great rhythm!` : "Hit! On to the next target.");
  };

  const missTarget = () => {
    if (hasExpired() || status !== "playing") {
      return;
    }

    setMisses((current) => current + 1);
    setStreak(0);
    setMessage("ミス。落ち着いて中心を狙いましょう。", "Miss! Take your time and aim at the center.");
  };

  const resetBest = () => {
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  return (
    <section data-native-i18n className="puzzle-shell aim-shell" aria-labelledby="aim-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SCORE ATTACK / INTERNAL GAME</p>
          <h1 id="aim-title">{text("エイム練習", "Aim Trainer")}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel aim-stats" aria-label={text("エイム練習の状態", "Aim Trainer status")}>
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
          aria-label={text("エイム練習エリア", "Aim practice area")}
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
              aria-label={text("ターゲット", "Target")}
            >
              <span />
            </button>
          ) : (
            <div className="aim-idle-card">
              <Crosshair aria-hidden="true" />
              <p>{status === "finished" ? text("もう一度挑戦できます", "Ready to try again") : text("スタート待機中", "Ready to start")}</p>
            </div>
          )}
        </div>

        <aside className="puzzle-side aim-side">
          <div className="rule-card">
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("30秒間、出現するターゲットをクリックしてスコアを伸ばします。空振りはミスになり、連続ヒットが途切れます。", "Click targets to score during a 30-second round. Clicking outside a target counts as a miss and breaks your streak.")}
            </p>
          </div>

          <div className="aim-progress">
            <span>{text("ヒット", "Hits")}: {hits}</span>
            <span>{text("ミス", "Misses")}: {misses}</span>
            <span>{text("命中率", "Accuracy")}: {accuracy}%</span>
            <span>{text("連続ヒット", "Hit streak")}: {streak}</span>
            <span>{text("最高連続", "Best streak")}: {bestStreak}</span>
          </div>

          <div className="aim-best">
            <h2>{text("ベスト", "Best")}</h2>
            {bestResult ? (
              <p>
                {text(`${bestResult.score}点 / ${bestResult.hits}ヒット / 命中率${bestResult.accuracy}%`, `${bestResult.score} pts / ${bestResult.hits} hits / Accuracy ${bestResult.accuracy}%`)}
              </p>
            ) : (
              <p>{text("まだ記録がありません。", "No record yet.")}</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score, display: text(`${score}点`, `${score} pts`), meta: text(`${hits}ヒット / 命中率${accuracy}%`, `${hits} hits / Accuracy ${accuracy}%`) } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startRound}>
              <Target aria-hidden="true" />
              {text("挑戦", "Challenge")}
            </button>
            <button className="ghost-button" type="button" onClick={resetBest}>
              <RotateCcw aria-hidden="true" />
              {text("ベスト削除", "Clear best")}
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
