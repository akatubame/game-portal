import { RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { CSSProperties } from "react";
import type { HanoiBest, HanoiPeg, HanoiStatus } from "./types";

type HanoiProps = {
  onBack: () => void;
};

const BEST_KEY = "game-shelf-hanoi-best";
const BEST_TIME_KEY = "game-shelf-hanoi-best-times";
const DISK_OPTIONS = [3, 4, 5, 6];

function createPegs(disks: number): HanoiPeg[] {
  return [Array.from({ length: disks }, (_, index) => disks - index), [], []];
}

function minimumMoves(disks: number) {
  return 2 ** disks - 1;
}

function readBest(): Record<string, HanoiBest> {
  const stored = window.localStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as Record<string, HanoiBest>) : {};
}

function readBestTimes(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BEST_TIME_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function canMove(from: HanoiPeg, to: HanoiPeg) {
  if (from.length === 0) {
    return false;
  }

  const moving = from[from.length - 1];
  const target = to[to.length - 1];
  return target === undefined || moving < target;
}

export function Hanoi({ onBack }: HanoiProps) {
  const [diskCount, setDiskCount] = useState(4);
  const [pegs, setPegs] = useState<HanoiPeg[]>(() => createPegs(4));
  const [status, setStatus] = useState<HanoiStatus>("idle");
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("円盤を1枚ずつ動かして、すべて右端の柱へ移しましょう。");
  const [bestByDisk, setBestByDisk] = useState<Record<string, HanoiBest>>(() => readBest());
  const [bestTimes, setBestTimes] = useState<Record<string, number>>(() => readBestTimes());

  const minMoves = minimumMoves(diskCount);
  const currentBest = bestByDisk[String(diskCount)];
  const currentBestTime = bestTimes[String(diskCount)] ?? null;
  const isSolved = useMemo(() => pegs[2].length === diskCount, [diskCount, pegs]);
  const ranking = useRanking({ gameId: `hanoi-${diskCount}`, metricLabel: "Moves", mode: "lower" });

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const timerId = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [status]);

  const startGame = (nextDiskCount = diskCount) => {
    setDiskCount(nextDiskCount);
    setPegs(createPegs(nextDiskCount));
    setStatus("playing");
    setSelectedPeg(null);
    setMoves(0);
    setSeconds(0);
    setMessage("動かしたい円盤がある柱を選び、次に移動先の柱を選びます。");
  };

  const finishIfSolved = (nextPegs: HanoiPeg[], nextMoves: number) => {
    if (nextPegs[2].length !== diskCount) {
      return;
    }

    const result: HanoiBest = {
      disks: diskCount,
      moves: nextMoves,
      recordedAt: new Date().toISOString()
    };
    const key = String(diskCount);
    const clearSeconds = Math.max(1, seconds);

    if (!bestByDisk[key] || nextMoves < bestByDisk[key].moves) {
      const nextBest = { ...bestByDisk, [key]: result };
      setBestByDisk(nextBest);
      window.localStorage.setItem(BEST_KEY, JSON.stringify(nextBest));
      setMessage(`完成！${nextMoves}手でベスト更新です。`);
    } else {
      setMessage(`完成！${nextMoves}手でした。最短は${minMoves}手です。`);
    }

    setBestTimes((current) => {
      const currentBestSeconds = current[key];
      if (currentBestSeconds !== undefined && currentBestSeconds <= clearSeconds) {
        return current;
      }

      const next = { ...current, [key]: clearSeconds };
      window.localStorage.setItem(BEST_TIME_KEY, JSON.stringify(next));
      return next;
    });

    setStatus("solved");
    setSelectedPeg(null);
  };

  const selectPeg = (pegIndex: number) => {
    if (status !== "playing") {
      return;
    }

    if (selectedPeg === null) {
      if (pegs[pegIndex].length === 0) {
        setMessage("空の柱からは動かせません。円盤のある柱を選びましょう。");
        return;
      }

      setSelectedPeg(pegIndex);
      setMessage(`${pegIndex + 1}番の柱を選択中。移動先の柱を選んでください。`);
      return;
    }

    if (selectedPeg === pegIndex) {
      setSelectedPeg(null);
      setMessage("選択を解除しました。");
      return;
    }

    if (!canMove(pegs[selectedPeg], pegs[pegIndex])) {
      setMessage("大きい円盤を小さい円盤の上には置けません。");
      return;
    }

    const nextPegs = pegs.map((peg) => [...peg]);
    const movingDisk = nextPegs[selectedPeg].pop();

    if (movingDisk === undefined) {
      return;
    }

    nextPegs[pegIndex].push(movingDisk);
    const nextMoves = moves + 1;
    setPegs(nextPegs);
    setMoves(nextMoves);
    setSelectedPeg(null);
    setMessage(`${movingDisk}番の円盤を移動しました。`);
    finishIfSolved(nextPegs, nextMoves);
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    window.localStorage.removeItem(BEST_TIME_KEY);
    setBestByDisk({});
    setBestTimes({});
  };

  return (
    <section className="puzzle-shell hanoi-shell" aria-labelledby="hanoi-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="hanoi-title">タワー・オブ・ハノイ</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel hanoi-score" aria-label="ハノイの塔の状態">
          <div>
            <span>Moves</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Minimum</span>
            <strong>{minMoves}</strong>
          </div>
          <div>
            <span>Disks</span>
            <strong>{diskCount}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{formatTime(seconds)}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout hanoi-layout">
        <div className="hanoi-board" aria-label="ハノイの塔 盤面">
          {pegs.map((peg, pegIndex) => {
            const selectable = selectedPeg !== null && selectedPeg !== pegIndex && canMove(pegs[selectedPeg], peg);

            return (
              <button
                className={`hanoi-peg${selectedPeg === pegIndex ? " is-selected" : ""}${selectable ? " is-target" : ""}`}
                key={pegIndex}
                type="button"
                onClick={() => selectPeg(pegIndex)}
                aria-label={`${pegIndex + 1}番の柱 ${peg.length}枚`}
              >
                <span className="hanoi-post" />
                <span className="hanoi-base" />
                <span className="hanoi-disks">
                  {Array.from({ length: diskCount }, (_, level) => {
                    const disk = peg[level];
                    return disk ? (
                      <span
                        className="hanoi-disk"
                        key={`${pegIndex}-${level}-${disk}`}
                        style={{ "--disk-size": `${42 + disk * 9}%`, "--disk-hue": `${185 + disk * 24}` } as CSSProperties}
                      >
                        {disk}
                      </span>
                    ) : (
                      <span className="hanoi-disk-space" key={`${pegIndex}-${level}-empty`} />
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>

        <aside className="puzzle-side hanoi-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              一度に動かせる円盤は一番上の1枚だけです。大きい円盤を小さい円盤の上に置くことはできません。
              すべての円盤を右端の柱へ移せばクリアです。
            </p>
          </div>

          <div className="hanoi-options" aria-label="円盤数">
            {DISK_OPTIONS.map((count) => (
              <button
                className={diskCount === count ? "is-selected" : ""}
                key={count}
                type="button"
                onClick={() => startGame(count)}
              >
                {count}枚
              </button>
            ))}
          </div>

          <div className="hanoi-progress">
            <span>現在: {status === "playing" ? "挑戦中" : status === "solved" ? "完成" : "待機中"}</span>
            <span>最短手数: {minMoves}</span>
            <span>ベスト: {currentBest ? `${currentBest.moves}手` : "まだ記録なし"}</span>
            <span>ベストタイム: {currentBestTime === null ? "未記録" : formatTime(currentBestTime)}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "solved" ? { score: moves, display: `${moves}手`, meta: `${diskCount}枚 / ${formatTime(seconds)}` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startGame()}>
              <Sparkles aria-hidden="true" />
              新しく始める
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
