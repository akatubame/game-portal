import { Hammer, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { MoleHole, WhackMoleResult, WhackMoleStatus } from "./types";

type WhackMoleProps = {
  onBack: () => void;
};

const ROUND_SECONDS = 30;
const HOLE_COUNT = 9;
const BEST_KEY = "game-shelf-whack-mole-best";

function readBestResult(): WhackMoleResult | null {
  const stored = window.localStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as WhackMoleResult) : null;
}

function createEmptyHoles(): MoleHole[] {
  return Array.from({ length: HOLE_COUNT }, (_, index) => ({ id: index, kind: "empty" }));
}

function pickMoleKind(): MoleHole["kind"] {
  const roll = Math.random();

  if (roll < 0.14) {
    return "golden";
  }

  if (roll < 0.26) {
    return "bomb";
  }

  return "mole";
}

function createRoundHoles(): MoleHole[] {
  const holes = createEmptyHoles();
  const firstIndex = Math.floor(Math.random() * HOLE_COUNT);
  holes[firstIndex] = { id: firstIndex, kind: pickMoleKind() };

  if (Math.random() < 0.28) {
    const candidates = holes.filter((hole) => hole.kind === "empty");
    const second = candidates[Math.floor(Math.random() * candidates.length)];

    if (second) {
      holes[second.id] = { id: second.id, kind: pickMoleKind() };
    }
  }

  return holes;
}

function calculateScore(hits: number, misses: number, combo: number, goldenHits: number, bombHits: number) {
  return Math.max(0, hits * 80 + goldenHits * 180 + combo * 25 - misses * 35 - bombHits * 120);
}

export function WhackMole({ onBack }: WhackMoleProps) {
  const [status, setStatus] = useState<WhackMoleStatus>("idle");
  const [holes, setHoles] = useState<MoleHole[]>(() => createEmptyHoles());
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [goldenHits, setGoldenHits] = useState(0);
  const [bombHits, setBombHits] = useState(0);
  const [message, setMessage] = useState("スタートを押して、30秒間のもぐらたたきを始めましょう。");
  const [bestResult, setBestResult] = useState<WhackMoleResult | null>(() => readBestResult());
  const statusRef = useRef(status);

  const score = useMemo(
    () => calculateScore(hits, misses, bestCombo, goldenHits, bombHits),
    [bestCombo, bombHits, goldenHits, hits, misses]
  );
  const ranking = useRanking({ gameId: "whack-mole-score", metricLabel: "Score", mode: "higher" });

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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
    if (status !== "playing") {
      return;
    }

    const moleTimer = window.setInterval(() => {
      setHoles(createRoundHoles());
    }, 720);

    return () => {
      window.clearInterval(moleTimer);
    };
  }, [status]);

  useEffect(() => {
    if (status === "playing" && timeLeft === 0) {
      finishRound();
    }
  }, [status, timeLeft]);

  const startRound = () => {
    setStatus("playing");
    setHoles(createRoundHoles());
    setTimeLeft(ROUND_SECONDS);
    setHits(0);
    setMisses(0);
    setCombo(0);
    setBestCombo(0);
    setGoldenHits(0);
    setBombHits(0);
    setMessage("もぐらを叩くと得点。金もぐらは高得点、爆弾は減点です。");
  };

  const finishRound = () => {
    setStatus("finished");
    setHoles(createEmptyHoles());
    setMessage("終了です。金もぐらを逃さず、爆弾を避けてベスト更新を狙いましょう。");

    const result: WhackMoleResult = {
      score,
      hits,
      misses,
      bestCombo,
      recordedAt: new Date().toISOString()
    };

    if (!bestResult || result.score > bestResult.score) {
      setBestResult(result);
      window.localStorage.setItem(BEST_KEY, JSON.stringify(result));
    }
  };

  const hitHole = (hole: MoleHole) => {
    if (statusRef.current !== "playing") {
      return;
    }

    if (hole.kind === "empty") {
      setMisses((current) => current + 1);
      setCombo(0);
      setMessage("空振り。よく見てから叩きましょう。");
      return;
    }

    if (hole.kind === "bomb") {
      setBombHits((current) => current + 1);
      setMisses((current) => current + 1);
      setCombo(0);
      setMessage("爆弾！減点です。次は避けましょう。");
    } else {
      const nextCombo = combo + 1;
      setHits((current) => current + 1);
      setCombo(nextCombo);
      setBestCombo((current) => Math.max(current, nextCombo));

      if (hole.kind === "golden") {
        setGoldenHits((current) => current + 1);
        setMessage(`金もぐら！ ${nextCombo}コンボです。`);
      } else {
        setMessage(nextCombo >= 5 ? `${nextCombo}コンボ！いいテンポです。` : "ヒット！");
      }
    }

    setHoles((current) => current.map((item) => (item.id === hole.id ? { ...item, kind: "empty" } : item)));
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  return (
    <section className="puzzle-shell whack-shell" aria-labelledby="whack-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SCORE ATTACK / INTERNAL GAME</p>
          <h1 id="whack-title">もぐらたたき</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel whack-stats" aria-label="もぐらたたきの状態">
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

      <div className="puzzle-layout whack-layout">
        <div className="whack-board" aria-label="もぐらたたき盤面">
          {holes.map((hole) => (
            <button
              className={`whack-hole is-${hole.kind}`}
              key={hole.id}
              type="button"
              onClick={() => hitHole(hole)}
              aria-label={hole.kind === "empty" ? "空の穴" : hole.kind === "bomb" ? "爆弾" : "もぐら"}
            >
              <span className="whack-hole-dirt" />
              {hole.kind !== "empty" && (
                <span className="whack-mole-face">
                  {hole.kind === "bomb" ? "💣" : hole.kind === "golden" ? "✨" : "🐹"}
                </span>
              )}
            </button>
          ))}
        </div>

        <aside className="puzzle-side whack-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              30秒間、出てきたもぐらをクリックします。金もぐらは高得点、爆弾は減点。空振りするとコンボが途切れます。
            </p>
          </div>

          <div className="whack-progress">
            <span>ヒット: {hits}</span>
            <span>ミス: {misses}</span>
            <span>コンボ: {combo}</span>
            <span>最高コンボ: {bestCombo}</span>
            <span>金もぐら: {goldenHits}</span>
            <span>爆弾: {bombHits}</span>
          </div>

          <div className="whack-best">
            <h2>ベスト</h2>
            {bestResult ? (
              <p>
                {bestResult.score}点 / {bestResult.hits}ヒット / 最高{bestResult.bestCombo}コンボ
              </p>
            ) : (
              <p>まだ記録がありません。</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score, display: `${score}点`, meta: `${hits}ヒット / 最高${bestCombo}コンボ` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startRound}>
              <Hammer aria-hidden="true" />
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
