import { Brain, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type {
  TicTacToeCell,
  TicTacToeDifficulty,
  TicTacToeOutcome,
  TicTacToePlayer,
  TicTacToeRecord,
  TicTacToeStatus
} from "./types";

type TicTacToeProps = {
  onBack: () => void;
};

type LineResult = {
  winner: TicTacToePlayer;
  line: number[];
};

const EMPTY_BOARD: TicTacToeCell[] = Array.from({ length: 9 }, () => null);
const RECORD_KEY = "game-shelf-tic-tac-toe-record";
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const difficultyLabels: Record<TicTacToeDifficulty, string> = {
  easy: "やさしい",
  normal: "ふつう",
  hard: "本気"
};

const difficultyDescriptions: Record<TicTacToeDifficulty, string> = {
  easy: "COMはかなり気まぐれに打ちます。まず勝ちたい時に。",
  normal: "COMは勝ち筋と止め筋を見ますが、たまに甘い手を打ちます。",
  hard: "COMが最善手を選びます。理論上は引き分け以上を狙います。"
};

function readRecord(): TicTacToeRecord {
  const stored = window.localStorage.getItem(RECORD_KEY);

  if (!stored) {
    return { wins: 0, losses: 0, draws: 0, streak: 0 };
  }

  return JSON.parse(stored) as TicTacToeRecord;
}

function findLine(board: TicTacToeCell[]): LineResult | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;

    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }

  return null;
}

function isFull(board: TicTacToeCell[]) {
  return board.every(Boolean);
}

function getOpenCells(board: TicTacToeCell[]) {
  return board.map((cell, index) => (cell ? null : index)).filter((index): index is number => index !== null);
}

function place(board: TicTacToeCell[], index: number, mark: TicTacToePlayer) {
  const next = [...board];
  next[index] = mark;
  return next;
}

function findImmediateMove(board: TicTacToeCell[], mark: TicTacToePlayer) {
  return getOpenCells(board).find((index) => findLine(place(board, index, mark))?.winner === mark) ?? null;
}

function pickRandom(openCells: number[]) {
  return openCells[Math.floor(Math.random() * openCells.length)];
}

function minimax(board: TicTacToeCell[], isCpuTurn: boolean): number {
  const line = findLine(board);

  if (line?.winner === "O") {
    return 10;
  }

  if (line?.winner === "X") {
    return -10;
  }

  if (isFull(board)) {
    return 0;
  }

  const scores = getOpenCells(board).map((index) => minimax(place(board, index, isCpuTurn ? "O" : "X"), !isCpuTurn));

  return isCpuTurn ? Math.max(...scores) : Math.min(...scores);
}

function pickBestMove(board: TicTacToeCell[]) {
  const openCells = getOpenCells(board);
  let bestMove = openCells[0];
  let bestScore = -Infinity;

  for (const index of openCells) {
    const score = minimax(place(board, index, "O"), false);

    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }

  return bestMove;
}

function pickCpuMove(board: TicTacToeCell[], difficulty: TicTacToeDifficulty) {
  const openCells = getOpenCells(board);

  if (openCells.length === 0) {
    return null;
  }

  if (difficulty === "hard") {
    return pickBestMove(board);
  }

  const winningMove = findImmediateMove(board, "O");
  const blockingMove = findImmediateMove(board, "X");

  if (difficulty === "normal") {
    if (winningMove !== null) return winningMove;
    if (blockingMove !== null && Math.random() < 0.86) return blockingMove;
    if (!board[4] && Math.random() < 0.68) return 4;

    const corners = [0, 2, 6, 8].filter((index) => !board[index]);
    if (corners.length > 0 && Math.random() < 0.58) return pickRandom(corners);

    return pickRandom(openCells);
  }

  if (winningMove !== null && Math.random() < 0.55) return winningMove;
  if (blockingMove !== null && Math.random() < 0.35) return blockingMove;

  return pickRandom(openCells);
}

function getOutcome(line: LineResult | null, board: TicTacToeCell[]): TicTacToeOutcome {
  if (line?.winner === "X") return "win";
  if (line?.winner === "O") return "lose";
  if (isFull(board)) return "draw";
  return null;
}

function updateRecord(record: TicTacToeRecord, outcome: TicTacToeOutcome): TicTacToeRecord {
  if (outcome === "win") {
    return { ...record, wins: record.wins + 1, streak: record.streak + 1 };
  }

  if (outcome === "lose") {
    return { ...record, losses: record.losses + 1, streak: 0 };
  }

  if (outcome === "draw") {
    return { ...record, draws: record.draws + 1, streak: 0 };
  }

  return record;
}

export function TicTacToe({ onBack }: TicTacToeProps) {
  const [board, setBoard] = useState<TicTacToeCell[]>(EMPTY_BOARD);
  const [status, setStatus] = useState<TicTacToeStatus>("idle");
  const [turn, setTurn] = useState<TicTacToePlayer>("X");
  const [difficulty, setDifficulty] = useState<TicTacToeDifficulty>("normal");
  const [record, setRecord] = useState<TicTacToeRecord>(() => readRecord());
  const [message, setMessage] = useState("難易度を選んで、3つ並べる勝負を始めましょう。");

  const line = useMemo(() => findLine(board), [board]);
  const winningLine = line?.line ?? [];
  const outcome = getOutcome(line, board);
  const ranking = useRanking({ gameId: `tic-tac-toe-${difficulty}`, metricLabel: "Wins", mode: "higher" });

  useEffect(() => {
    if (status !== "playing" || !outcome) {
      return;
    }

    const nextRecord = updateRecord(record, outcome);
    setRecord(nextRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus("finished");

    if (outcome === "win") {
      setMessage("勝利！読み勝ちです。もう一局いきましょう。");
    } else if (outcome === "lose") {
      setMessage("COMの勝ちです。次は中央と角を意識すると戦いやすいです。");
    } else {
      setMessage("引き分け。かなり良い勝負でした。");
    }
  }, [outcome, record, status]);

  useEffect(() => {
    if (status !== "playing" || turn !== "O" || outcome) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const move = pickCpuMove(board, difficulty);

      if (move === null) {
        return;
      }

      setBoard((current) => place(current, move, "O"));
      setTurn("X");
      setMessage("あなたの番です。Xを3つ並べましょう。");
    }, 420);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [board, difficulty, outcome, status, turn]);

  const startGame = () => {
    setBoard(EMPTY_BOARD);
    setStatus("playing");
    setTurn("X");
    setMessage("あなたの番です。先手はXです。");
  };

  const playCell = (index: number) => {
    if (status !== "playing" || turn !== "X" || board[index] || outcome) {
      return;
    }

    setBoard((current) => place(current, index, "X"));
    setTurn("O");
    setMessage("COMが考えています……");
  };

  const resetRecord = () => {
    const emptyRecord = { wins: 0, losses: 0, draws: 0, streak: 0 };
    setRecord(emptyRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(emptyRecord));
  };

  return (
    <section className="puzzle-shell tic-shell" aria-labelledby="tic-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">BOARD GAME / INTERNAL GAME</p>
          <h1 id="tic-title">三目並べ</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel tic-score" aria-label="三目並べの戦績">
          <div>
            <span>Win</span>
            <strong>{record.wins}</strong>
          </div>
          <div>
            <span>Draw</span>
            <strong>{record.draws}</strong>
          </div>
          <div>
            <span>Lose</span>
            <strong>{record.losses}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout tic-layout">
        <div className="tic-board" aria-label="三目並べ盤面">
          {board.map((cell, index) => (
            <button
              className={`tic-cell${cell ? ` is-${cell.toLowerCase()}` : ""}${
                winningLine.includes(index) ? " is-winning" : ""
              }`}
              disabled={status !== "playing" || turn !== "X" || Boolean(cell)}
              key={index}
              type="button"
              onClick={() => playCell(index)}
              aria-label={cell ? `${cell} のマス` : `${index + 1}番の空きマス`}
            >
              {cell}
            </button>
          ))}
        </div>

        <aside className="puzzle-side tic-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              あなたはX、COMはOです。縦・横・斜めのどれかに先に3つ並べると勝ちです。
              「本気」はかなり堅いので、まずは「ふつう」がおすすめです。
            </p>
          </div>

          <div className="tic-difficulty" aria-label="難易度">
            {(Object.keys(difficultyLabels) as TicTacToeDifficulty[]).map((level) => (
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

          <div className="tic-record">
            <span>連勝: {record.streak}</span>
            <span>現在: {status === "playing" ? (turn === "X" ? "あなたの番" : "COMの番") : "待機中"}</span>
            <span>難易度: {difficultyLabels[difficulty]}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" && outcome === "win" ? { score: record.streak, display: `${record.streak}連勝`, meta: difficultyLabels[difficulty] } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startGame}>
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

          <div className="tic-hint">
            <Brain aria-hidden="true" />
            中央を取る、相手のリーチを止める、角を活かす。この3つでぐっと勝ちやすくなります。
          </div>
        </aside>
      </div>
    </section>
  );
}
