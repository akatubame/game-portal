import { RotateCcw, Sparkles, Timer, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { OneToFiftyCell, OneToFiftyRecord, OneToFiftyStatus } from "./types";

type OneToFiftyProps = {
  onBack: () => void;
};

const RECORD_KEY = "game-shelf-one-to-fifty-record";
const BOARD_SIZE = 25;
const FINAL_NUMBER = 50;
const HINT_DELAY_MS = 2800;

function shuffle<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function createBoard(): OneToFiftyCell[] {
  return shuffle(Array.from({ length: BOARD_SIZE }, (_, index) => index + 1)).map((value, id) => ({
    id,
    value
  }));
}

function readRecord(): OneToFiftyRecord {
  const stored = window.localStorage.getItem(RECORD_KEY);
  return stored ? (JSON.parse(stored) as OneToFiftyRecord) : { bestTimeMs: null, plays: 0 };
}

function formatTime(ms: number | null) {
  if (ms === null) {
    return "--.--";
  }

  return (ms / 1000).toFixed(2);
}

export function OneToFifty({ onBack }: OneToFiftyProps) {
  const [board, setBoard] = useState<OneToFiftyCell[]>(() => createBoard());
  const [status, setStatus] = useState<OneToFiftyStatus>("idle");
  const [nextNumber, setNextNumber] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [targetChangedAt, setTargetChangedAt] = useState<number | null>(null);
  const [record, setRecord] = useState<OneToFiftyRecord>(() => readRecord());
  const [message, setMessage] = useState("1から50まで、数字を順番にタッチしましょう。まずは「開始」を押してください。");
  const ranking = useRanking({ gameId: "one-to-fifty-time", metricLabel: "Time", mode: "lower" });

  useEffect(() => {
    if (status !== "playing" || startedAt === null) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 50);

    return () => {
      window.clearInterval(timerId);
    };
  }, [startedAt, status]);

  const progress = useMemo(() => Math.min(nextNumber - 1, FINAL_NUMBER), [nextNumber]);
  const showHint = status === "playing" && targetChangedAt !== null && Date.now() - targetChangedAt >= HINT_DELAY_MS;

  const startGame = () => {
    setBoard(createBoard());
    setStatus("playing");
    setNextNumber(1);
    setMistakes(0);
    setElapsedMs(0);
    const now = Date.now();
    setStartedAt(now);
    setTargetChangedAt(now);
    setMessage("1から順番にタッチ。25以下を押すと、同じマスに次の数字が出ます。");
  };

  const finishGame = (finishedMs: number) => {
    const nextRecord = {
      plays: record.plays + 1,
      bestTimeMs: record.bestTimeMs === null ? finishedMs : Math.min(record.bestTimeMs, finishedMs)
    };

    setRecord(nextRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus("cleared");
    setStartedAt(null);
    setTargetChangedAt(null);
    setElapsedMs(finishedMs);
    setMessage(`クリア！ タイムは ${formatTime(finishedMs)} 秒、ミスは ${mistakes} 回でした。`);
  };

  const handleCellClick = (cellId: number) => {
    if (status !== "playing") {
      return;
    }

    const cell = board.find((item) => item.id === cellId);

    if (!cell || cell.value !== nextNumber) {
      setMistakes((current) => current + 1);
      setMessage(`${nextNumber} を探してください。違う数字を押すとミスになります。`);
      return;
    }

    const followingNumber = nextNumber + BOARD_SIZE;
    const nextBoard = board.map((item) =>
      item.id === cellId
        ? {
            ...item,
            value: followingNumber <= FINAL_NUMBER ? followingNumber : null
          }
        : item
    );
    const nextTarget = nextNumber + 1;

    setBoard(nextBoard);
    setNextNumber(nextTarget);
    setTargetChangedAt(Date.now());

    if (nextNumber === FINAL_NUMBER) {
      finishGame(startedAt === null ? elapsedMs : Date.now() - startedAt);
      return;
    }

    setMessage(`${nextTarget} を探しましょう。`);
  };

  const resetRecord = () => {
    const emptyRecord = { bestTimeMs: null, plays: 0 };
    setRecord(emptyRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(emptyRecord));
  };

  return (
    <section className="puzzle-shell one50-shell" aria-labelledby="one50-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SPEED PUZZLE / INTERNAL GAME</p>
          <h1 id="one50-title">1to50</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel one50-score" aria-label="1to50のスコア">
          <div>
            <span>Next</span>
            <strong>{status === "cleared" ? "Done" : nextNumber}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{formatTime(elapsedMs)}</strong>
          </div>
          <div>
            <span>Miss</span>
            <strong>{mistakes}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout one50-layout">
        <div className="one50-play-area">
          <div className="one50-board" aria-label="1から50の数字パネル">
            {board.map((cell) => (
              <button
                className={`one50-cell${showHint && cell.value === nextNumber ? " is-target" : ""}${cell.value === null ? " is-empty" : ""}`}
                disabled={status !== "playing" || cell.value === null}
                key={cell.id}
                type="button"
                onClick={() => handleCellClick(cell.id)}
              >
                {cell.value}
              </button>
            ))}
          </div>
          <div className="one50-progress" aria-label="進行状況">
            <span style={{ width: `${(progress / FINAL_NUMBER) * 100}%` }} />
          </div>
        </div>

        <aside className="puzzle-side one50-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              1から50まで順番に数字を押します。1〜25を押すと、そのマスには26〜50の数字が順番に補充されます。
              次の数字が見つからない時は、少し時間が経つと枠ヒントが表示されます。
            </p>
          </div>

          <div className="one50-record">
            <div>
              <Trophy aria-hidden="true" />
              <span>Best</span>
              <strong>{formatTime(record.bestTimeMs)} 秒</strong>
            </div>
            <div>
              <Timer aria-hidden="true" />
              <span>Play</span>
              <strong>{record.plays} 回</strong>
            </div>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "cleared" ? { score: elapsedMs, display: `${formatTime(elapsedMs)} 秒`, meta: `ミス ${mistakes} 回` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startGame}>
              <Sparkles aria-hidden="true" />
              開始 / やり直し
            </button>
            <button className="ghost-button" type="button" onClick={resetRecord}>
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
