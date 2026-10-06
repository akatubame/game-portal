import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { safeStorage } from "../../safeStorage";
import { useI18n } from "../../i18n";
import { Brain, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import { isPlainRecord, readSavedProgress } from "../savedProgress";
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
const PROGRESS_KEY = "game-shelf-progress-tic-tac-toe-v1";
type SavedTicTacToe = { version: 1; board: TicTacToeCell[]; turn: TicTacToePlayer; difficulty: TicTacToeDifficulty };
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
  const stored = safeStorage.getItem(RECORD_KEY);

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

function isSavedTicTacToe(value: unknown): value is SavedTicTacToe {
  if (!isPlainRecord(value) || value.version !== 1 || !Array.isArray(value.board) || value.board.length !== 9 ||
      !value.board.every((cell) => cell === null || cell === "X" || cell === "O") ||
      (value.turn !== "X" && value.turn !== "O") || typeof value.difficulty !== "string" ||
      !Object.prototype.hasOwnProperty.call(difficultyLabels, value.difficulty)) return false;
  const board = value.board as TicTacToeCell[];
  const x = board.filter((cell) => cell === "X").length;
  const o = board.filter((cell) => cell === "O").length;
  return x <= o + 1 && x >= o && (value.turn === "X" ? x === o : x === o + 1) &&
    getOutcome(findLine(board), board) === null;
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
  const confirmRecordReset = useConfirmRecordReset();
  const { language } = useI18n();
  const en = language === "en";
  const text = (ja: string, english: string) => en ? english : ja;
  const labels = en ? { easy: "Easy", normal: "Normal", hard: "Hard" } : difficultyLabels;
  const descriptions = en ? {
    easy: "The CPU often plays randomly. A good place to start.",
    normal: "The CPU looks for wins and blocks, but sometimes makes mistakes.",
    hard: "The CPU plays optimally and can always secure at least a draw."
  } : difficultyDescriptions;
  const [saved] = useState(() => readSavedProgress(PROGRESS_KEY, isSavedTicTacToe));
  const [board, setBoard] = useState<TicTacToeCell[]>(() => saved?.board.slice() ?? [...EMPTY_BOARD]);
  const [status, setStatus] = useState<TicTacToeStatus>(saved ? "playing" : "idle");
  const [turn, setTurn] = useState<TicTacToePlayer>(saved?.turn ?? "X");
  const [difficulty, setDifficulty] = useState<TicTacToeDifficulty>(saved?.difficulty ?? "normal");
  const [record, setRecord] = useState<TicTacToeRecord>(() => readRecord());
  const [completedRecord, setCompletedRecord] = useState<Readonly<TicTacToeRecord> | null>(null);


  const line = useMemo(() => findLine(board), [board]);
  const winningLine = line?.line ?? [];
  const outcome = getOutcome(line, board);
  const message = status === "idle"
    ? text("難易度を選んで、3つ並べる勝負を始めましょう。", "Choose a difficulty and get three marks in a row.")
    : outcome === "win"
      ? text("勝利！読み勝ちです。もう一局いきましょう。", "You win! Ready for another round?")
      : outcome === "lose"
        ? text("COMの勝ちです。次は中央と角を意識すると戦いやすいです。", "The CPU wins. Try using the center and corners next time.")
        : outcome === "draw"
          ? text("引き分け。かなり良い勝負でした。", "A draw! That was a close game.")
          : turn === "O"
            ? text("COMが考えています……", "CPU is thinking...")
            : text("あなたの番です。Xを3つ並べましょう。", "Your turn. Get three Xs in a row.");
  const ranking = useRanking({ gameId: `tic-tac-toe-${difficulty}`, metricLabel: "Wins", mode: "higher" });

  useEffect(() => {
    if (status === "playing" && !outcome) {
      safeStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, board, turn, difficulty } satisfies SavedTicTacToe));
    } else if (status === "finished") {
      safeStorage.removeItem(PROGRESS_KEY);
    }
  }, [board, difficulty, outcome, status, turn]);

  useEffect(() => {
    if (status !== "playing" || !outcome) {
      return;
    }

    const nextRecord = updateRecord(record, outcome);
    setRecord(nextRecord);
    setCompletedRecord({ ...nextRecord });
    safeStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus("finished");


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

    }, 420);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [board, difficulty, outcome, status, turn]);

  const startGame = () => {
    safeStorage.removeItem(PROGRESS_KEY);
    setCompletedRecord(null);
    setBoard(EMPTY_BOARD);
    setStatus("playing");
    setTurn("X");

  };

  const playCell = (index: number) => {
    if (status !== "playing" || turn !== "X" || board[index] || outcome) {
      return;
    }

    setBoard((current) => place(current, index, "X"));
    setTurn("O");

  };

  const resetRecord = () => {
    if (!confirmRecordReset()) return;
    const emptyRecord = { wins: 0, losses: 0, draws: 0, streak: 0 };
    setRecord(emptyRecord);
    safeStorage.setItem(RECORD_KEY, JSON.stringify(emptyRecord));
  };

  return (
    <section data-native-i18n className="puzzle-shell tic-shell" aria-labelledby="tic-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">BOARD GAME / INTERNAL GAME</p>
          <h1 id="tic-title">{text("三目並べ", "Tic-Tac-Toe")}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel tic-score" aria-label={text("三目並べの戦績", "Tic-Tac-Toe records")}>
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
        <div className="tic-board" aria-label={text("三目並べ盤面", "Tic-Tac-Toe board")}>
          {board.map((cell, index) => (
            <button
              className={`tic-cell${cell ? ` is-${cell.toLowerCase()}` : ""}${
                winningLine.includes(index) ? " is-winning" : ""
              }`}
              disabled={status !== "playing" || turn !== "X" || Boolean(cell)}
              key={index}
              type="button"
              onClick={() => playCell(index)}
              aria-label={text(cell ? `${index + 1}番のマス ${cell}` : `${index + 1}番の空きマス`, `Cell ${index + 1}: ${cell ?? "empty"}`)}
            >
              {cell}
            </button>
          ))}
        </div>

        <aside className="puzzle-side tic-side">
          <div className="rule-card">
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("あなたはX、COMはOです。縦・横・斜めのどれかに先に3つ並べると勝ちです。「本気」はかなり堅いので、まずは「ふつう」がおすすめです。", "You play X and the CPU plays O. Get three marks in a row, column, or diagonal to win. Try Normal before challenging Hard.")}
            </p>
          </div>

          <div className="tic-difficulty" aria-label={text("難易度", "Difficulty")}>
            {(Object.keys(difficultyLabels) as TicTacToeDifficulty[]).map((level) => (
              <button
                className={difficulty === level ? "is-selected" : ""}
                disabled={status === "playing"}
                key={level}
                type="button"
                onClick={() => {
                  if (level === difficulty) return;
                  const nextRecord = { ...record, streak: 0 };
                  setRecord(nextRecord);
                  safeStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
                  setDifficulty(level);
                  startGame();
                }}
              >
                <span>{labels[level]}</span>
                <small>{descriptions[level]}</small>
              </button>
            ))}
          </div>

          <div className="tic-record">
            <span>{text("連勝", "Win streak")}: {record.streak}</span>
            <span>{text("現在", "Status")}: {status === "finished" ? text("対局終了", "Finished") : status === "playing" ? (turn === "X" ? text("あなたの番", "Your turn") : text("COMの番", "CPU turn")) : text("待機中", "Idle")}</span>
            <span>{text("難易度", "Difficulty")}: {labels[difficulty]}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" && outcome === "win" && completedRecord ? { score: completedRecord.streak, display: text(`${completedRecord.streak}連勝`, `${completedRecord.streak}-win streak`), meta: labels[difficulty] } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startGame}>
              <Sparkles aria-hidden="true" />
              {text("新しく始める", "New game")}
            </button>
            <button className="ghost-button" type="button" onClick={resetRecord}>
              <RotateCcw aria-hidden="true" />
              {text("戦績リセット", "Reset records")}
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            {text("棚へ戻る", "Back to shelf")}
          </button>

          <div className="tic-hint">
            <Brain aria-hidden="true" />
            {text("中央を取る、相手のリーチを止める、角を活かす。この3つでぐっと勝ちやすくなります。", "Take the center, block immediate threats, and use the corners to improve your chances.")}
          </div>
        </aside>
      </div>
    </section>
  );
}
