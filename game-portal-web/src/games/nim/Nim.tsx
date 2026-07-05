import { Hand, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { NimDifficulty, NimRecord, NimSetup, NimStatus, NimTurn } from "./types";

type NimProps = {
  onBack: () => void;
};

type NimMove = {
  pileIndex: number;
  count: number;
};

const RECORD_KEY = "game-shelf-nim-record";

const setupPiles: Record<NimSetup, number[]> = {
  classic: [3, 4, 5],
  long: [1, 3, 5, 7]
};

const setupLabels: Record<NimSetup, string> = {
  classic: "クラシック",
  long: "ロング"
};

const setupDescriptions: Record<NimSetup, string> = {
  classic: "3つの山でテンポよく遊べる基本形。",
  long: "4つの山で読み合いが少し深くなる形。"
};

const difficultyLabels: Record<NimDifficulty, string> = {
  easy: "やさしい",
  normal: "ふつう",
  hard: "本気"
};

const difficultyDescriptions: Record<NimDifficulty, string> = {
  easy: "COMはかなり気まぐれに石を取ります。",
  normal: "COMは時々、勝ち筋を読んできます。",
  hard: "COMはNim和を見て、かなり正確に打ちます。"
};

function readRecord(): NimRecord {
  const stored = window.localStorage.getItem(RECORD_KEY);
  return stored ? (JSON.parse(stored) as NimRecord) : { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
}

function getNimSum(piles: number[]) {
  return piles.reduce((total, pile) => total ^ pile, 0);
}

function getLegalMoves(piles: number[]): NimMove[] {
  return piles.flatMap((pile, pileIndex) =>
    Array.from({ length: pile }, (_, index) => ({
      pileIndex,
      count: index + 1
    }))
  );
}

function pickRandomMove(piles: number[]): NimMove {
  const legalMoves = getLegalMoves(piles);
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

function pickOptimalMove(piles: number[]): NimMove {
  const nimSum = getNimSum(piles);

  if (nimSum === 0) {
    return pickRandomMove(piles);
  }

  const pileIndex = piles.findIndex((pile) => (pile ^ nimSum) < pile);
  const target = piles[pileIndex] ^ nimSum;
  return {
    pileIndex,
    count: piles[pileIndex] - target
  };
}

function pickCpuMove(piles: number[], difficulty: NimDifficulty): NimMove {
  if (difficulty === "easy") {
    return Math.random() < 0.25 ? pickOptimalMove(piles) : pickRandomMove(piles);
  }

  if (difficulty === "normal") {
    return Math.random() < 0.62 ? pickOptimalMove(piles) : pickRandomMove(piles);
  }

  return pickOptimalMove(piles);
}

function removeStones(piles: number[], move: NimMove) {
  return piles.map((pile, index) => (index === move.pileIndex ? pile - move.count : pile));
}

function isEmpty(piles: number[]) {
  return piles.every((pile) => pile === 0);
}

function updateRecord(record: NimRecord, status: "won" | "lost"): NimRecord {
  if (status === "won") {
    const streak = record.streak + 1;
    return {
      wins: record.wins + 1,
      losses: record.losses,
      streak,
      bestStreak: Math.max(record.bestStreak, streak)
    };
  }

  return {
    wins: record.wins,
    losses: record.losses + 1,
    streak: 0,
    bestStreak: record.bestStreak
  };
}

export function Nim({ onBack }: NimProps) {
  const [setup, setSetup] = useState<NimSetup>("classic");
  const [difficulty, setDifficulty] = useState<NimDifficulty>("normal");
  const [piles, setPiles] = useState<number[]>(() => setupPiles.classic);
  const [status, setStatus] = useState<NimStatus>("idle");
  const [turn, setTurn] = useState<NimTurn>("player");
  const [record, setRecord] = useState<NimRecord>(() => readRecord());
  const [message, setMessage] = useState("一つの山を選び、1個以上の石を取ります。最後の石を取った方が勝ちです。");

  const remaining = useMemo(() => piles.reduce((total, pile) => total + pile, 0), [piles]);
  const nimSum = useMemo(() => getNimSum(piles), [piles]);
  const ranking = useRanking({ gameId: `nim-${setup}-${difficulty}`, metricLabel: "Streak", mode: "higher" });
  const canPlay = status === "playing" && turn === "player";

  const finishGame = (nextStatus: "won" | "lost") => {
    const nextRecord = updateRecord(record, nextStatus);
    setRecord(nextRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus(nextStatus);
    setTurn("player");
    setMessage(nextStatus === "won" ? "勝利！最後の石を取り切りました。" : "COMが最後の石を取りました。次は山の残り方を少し意識してみましょう。");
  };

  useEffect(() => {
    if (status !== "playing" || turn !== "cpu") {
      return;
    }

    const timerId = window.setTimeout(() => {
      const move = pickCpuMove(piles, difficulty);
      const nextPiles = removeStones(piles, move);
      setPiles(nextPiles);

      if (isEmpty(nextPiles)) {
        finishGame("lost");
        return;
      }

      setTurn("player");
      setMessage(`COMは${move.pileIndex + 1}番目の山から${move.count}個取りました。あなたの番です。`);
    }, 520);

    return () => window.clearTimeout(timerId);
  }, [difficulty, piles, status, turn]);

  const startGame = (nextSetup = setup) => {
    setSetup(nextSetup);
    setPiles([...setupPiles[nextSetup]]);
    setStatus("playing");
    setTurn("player");
    setMessage("あなたの番です。一つの山から好きな数だけ石を取ってください。");
  };

  const takeStones = (pileIndex: number, count: number) => {
    if (!canPlay || piles[pileIndex] < count) {
      return;
    }

    const nextPiles = removeStones(piles, { pileIndex, count });
    setPiles(nextPiles);

    if (isEmpty(nextPiles)) {
      finishGame("won");
      return;
    }

    setTurn("cpu");
    setMessage(`${pileIndex + 1}番目の山から${count}個取りました。COMが考えています……`);
  };

  const resetRecord = () => {
    const emptyRecord = { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
    setRecord(emptyRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(emptyRecord));
  };

  return (
    <section className="puzzle-shell nim-shell" aria-labelledby="nim-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">STRATEGY / INTERNAL GAME</p>
          <h1 id="nim-title">Nim</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel nim-score" aria-label="Nimの戦績">
          <div>
            <span>Win</span>
            <strong>{record.wins}</strong>
          </div>
          <div>
            <span>Lose</span>
            <strong>{record.losses}</strong>
          </div>
          <div>
            <span>Streak</span>
            <strong>{record.streak}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout nim-layout">
        <div className="nim-play-area">
          <div className="nim-board" aria-label="Nimの石の山">
            {piles.map((pile, pileIndex) => (
              <div className="nim-pile" key={pileIndex}>
                <div className="nim-pile-header">
                  <span>{pileIndex + 1}番目の山</span>
                  <strong>{pile}個</strong>
                </div>
                <div className="nim-stones" aria-hidden="true">
                  {Array.from({ length: pile }, (_, stoneIndex) => (
                    <span className="nim-stone" key={stoneIndex} />
                  ))}
                </div>
                <div className="nim-take-row" aria-label={`${pileIndex + 1}番目の山から取る数`}>
                  {Array.from({ length: Math.max(pile, 1) }, (_, index) => {
                    const count = index + 1;
                    return (
                      <button
                        disabled={!canPlay || count > pile}
                        key={count}
                        type="button"
                        onClick={() => takeStones(pileIndex, count)}
                        aria-label={`${pileIndex + 1}番目の山から${count}個取る`}
                      >
                        {count}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="puzzle-side nim-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              自分の番では、一つの山から1個以上の石を取ります。複数の山から同時には取れません。
              最後の石を取ったプレイヤーが勝ちです。
            </p>
          </div>

          <div className="nim-options" aria-label="山の構成">
            {(Object.keys(setupLabels) as NimSetup[]).map((level) => (
              <button
                className={setup === level ? "is-selected" : ""}
                disabled={status === "playing"}
                key={level}
                type="button"
                onClick={() => startGame(level)}
              >
                <span>{setupLabels[level]}</span>
                <small>{setupDescriptions[level]}</small>
              </button>
            ))}
          </div>

          <div className="nim-difficulty" aria-label="難易度">
            {(Object.keys(difficultyLabels) as NimDifficulty[]).map((level) => (
              <button
                className={difficulty === level ? "is-selected" : ""}
                disabled={status === "playing"}
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
              >
                <span>{difficultyLabels[level]}</span>
                <small>{difficultyDescriptions[level]}</small>
              </button>
            ))}
          </div>

          <div className="nim-progress">
            <span>現在: {status === "playing" ? (turn === "player" ? "あなたの番" : "COMの番") : status === "won" ? "勝利" : status === "lost" ? "敗北" : "待機中"}</span>
            <span>残り石: {remaining}</span>
            <span>Nim和: {nimSum}</span>
            <span>最高連勝: {record.bestStreak}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "won" ? { score: record.streak, display: `${record.streak}連勝`, meta: `${setupLabels[setup]} / ${difficultyLabels[difficulty]}` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startGame()}>
              <Sparkles aria-hidden="true" />
              新しく始める
            </button>
            <button className="ghost-button" type="button" onClick={resetRecord}>
              <RotateCcw aria-hidden="true" />
              戦績リセット
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            棚へ戻る
          </button>

          <div className="nim-hint">
            <Hand aria-hidden="true" />
            山の数を見比べて、相手に取りづらい形を残せるとぐっと勝ちやすくなります。
          </div>
        </aside>
      </div>
    </section>
  );
}
