import { useI18n } from "../../i18n";
import { useLocalizedMessage } from "../useLocalizedMessage";
import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { useCountdown } from "../useCountdown";
import { safeStorage } from "../../safeStorage";
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
  const stored = safeStorage.getItem(BEST_KEY);
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
  const confirmRecordReset = useConfirmRecordReset();
  const { language } = useI18n();
  const text = (ja: string, en: string) => language === "en" ? en : ja;
  const [status, setStatus] = useState<WhackMoleStatus>("idle");
  const [holes, setHoles] = useState<MoleHole[]>(() => createEmptyHoles());
  const { timeLeft, resetCountdown, hasExpired } = useCountdown(status === "playing", ROUND_SECONDS);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [goldenHits, setGoldenHits] = useState(0);
  const [bombHits, setBombHits] = useState(0);
  const [message, setMessage] = useLocalizedMessage("スタートを押して、30秒間のもぐらたたきを始めましょう。", "Press Challenge to start a 30-second round of Whack-a-Mole.");
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
    resetCountdown();
    setHits(0);
    setMisses(0);
    setCombo(0);
    setBestCombo(0);
    setGoldenHits(0);
    setBombHits(0);
    setMessage("もぐらを叩くと得点。金もぐらは高得点、爆弾は減点です。", "Hit moles to score. Golden moles give extra points; bombs cost points.");
  };

  const finishRound = () => {
    setStatus("finished");
    setHoles(createEmptyHoles());
    setMessage("終了です。金もぐらを逃さず、爆弾を避けてベスト更新を狙いましょう。", "Finished. Catch golden moles and avoid bombs to beat your best.");

    const result: WhackMoleResult = {
      score,
      hits,
      misses,
      bestCombo,
      recordedAt: new Date().toISOString()
    };

    if (!bestResult || result.score > bestResult.score) {
      setBestResult(result);
      safeStorage.setItem(BEST_KEY, JSON.stringify(result));
    }
  };

  const hitHole = (hole: MoleHole) => {
    if (hasExpired() || statusRef.current !== "playing") {
      return;
    }

    if (hole.kind === "empty") {
      setMisses((current) => current + 1);
      setCombo(0);
      setMessage("空振り。よく見てから叩きましょう。", "Miss! Look before you hit.");
      return;
    }

    if (hole.kind === "bomb") {
      setBombHits((current) => current + 1);
      setMisses((current) => current + 1);
      setCombo(0);
      setMessage("爆弾！減点です。次は避けましょう。", "Bomb! Points lost. Avoid the next one.");
    } else {
      const nextCombo = combo + 1;
      setHits((current) => current + 1);
      setCombo(nextCombo);
      setBestCombo((current) => Math.max(current, nextCombo));

      if (hole.kind === "golden") {
        setGoldenHits((current) => current + 1);
        setMessage(`金もぐら！ ${nextCombo}コンボです。`, `Golden mole! Combo: ${nextCombo}.`);
      } else {
        setMessage(nextCombo >= 5 ? `${nextCombo}コンボ！いいテンポです。` : "ヒット！", nextCombo >= 5 ? `${nextCombo} combo! Great rhythm.` : "Hit!");
      }
    }

    setHoles((current) => current.map((item) => (item.id === hole.id ? { ...item, kind: "empty" } : item)));
  };

  const resetBest = () => {
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  return (
    <section data-native-i18n className="puzzle-shell whack-shell" aria-labelledby="whack-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SCORE ATTACK / INTERNAL GAME</p>
          <h1 id="whack-title">{text("もぐらたたき", "Whack-a-Mole")}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel whack-stats" aria-label={text("もぐらたたきの状態", "Whack-a-Mole status")}>
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
        <div className="whack-board" aria-label={text("もぐらたたき盤面", "Whack-a-Mole board")}>
          {holes.map((hole) => (
            <button
              className={`whack-hole is-${hole.kind}`}
              key={hole.id}
              type="button"
              onClick={() => hitHole(hole)}
              disabled={status !== "playing"}
              aria-label={text(`${hole.id + 1}番: ${hole.kind === "empty" ? "空の穴" : hole.kind === "bomb" ? "爆弾" : hole.kind === "golden" ? "金もぐら" : "もぐら"}`, `Hole ${hole.id + 1}: ${hole.kind === "empty" ? "empty" : hole.kind === "bomb" ? "bomb" : hole.kind === "golden" ? "golden mole" : "mole"}`)}
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
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("30秒間、出てきたもぐらをクリックします。金もぐらは高得点、爆弾は減点。空振りするとコンボが途切れます。", "Hit the moles during a 30-second round. Golden moles give extra points; bombs cost points. Missing breaks your combo.")}
            </p>
          </div>

          <div className="whack-progress">
            <span>{text("ヒット", "Hits")}: {hits}</span>
            <span>{text("ミス", "Misses")}: {misses}</span>
            <span>{text("コンボ", "Combo")}: {combo}</span>
            <span>{text("最高コンボ", "Best combo")}: {bestCombo}</span>
            <span>{text("金もぐら", "Golden moles")}: {goldenHits}</span>
            <span>{text("爆弾", "Bombs")}: {bombHits}</span>
          </div>

          <div className="whack-best">
            <h2>{text("ベスト", "Best")}</h2>
            {bestResult ? (
              <p>
                {text(`${bestResult.score}点 / ${bestResult.hits}ヒット / 最高${bestResult.bestCombo}コンボ`, `${bestResult.score} pts / ${bestResult.hits} hits / Best combo ${bestResult.bestCombo}`)}
              </p>
            ) : (
              <p>{text("まだ記録がありません。", "No record yet.")}</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score, display: text(`${score}点`, `${score} pts`), meta: text(`${hits}ヒット / 最高${bestCombo}コンボ`, `${hits} hits / Best combo ${bestCombo}`) } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startRound}>
              <Hammer aria-hidden="true" />
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
