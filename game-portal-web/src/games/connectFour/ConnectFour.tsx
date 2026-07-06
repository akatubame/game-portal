import { CircleDot, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import type {
  ConnectFourCell,
  ConnectFourDifficulty,
  ConnectFourOutcome,
  ConnectFourPlayer,
  ConnectFourRecord,
  ConnectFourResult,
  ConnectFourStatus
} from "./types";

type ConnectFourProps = {
  onBack: () => void;
};

const ROWS = 6;
const COLUMNS = 7;
const RECORD_KEY = "game-shelf-connect-four-record";

const difficultyLabels: Record<ConnectFourDifficulty, string> = {
  easy: "やさしい",
  normal: "ふつう",
  hard: "本気"
};

const difficultyDescriptions: Record<ConnectFourDifficulty, string> = {
  easy: "COMはかなり気まぐれに列を選びます。",
  normal: "勝ち筋と止め筋を見つつ、中央を少し好みます。",
  hard: "2手先の形も少し見て、中央と連結を重視します。"
};

const difficultyLabelsEn: Record<ConnectFourDifficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard"
};

const difficultyDescriptionsEn: Record<ConnectFourDifficulty, string> = {
  easy: "The CPU chooses columns very casually.",
  normal: "The CPU looks for winning and blocking moves, and slightly prefers the center.",
  hard: "The CPU looks a little ahead and values center control and connected lines."
};

function createBoard(): ConnectFourCell[] {
  return Array.from({ length: ROWS * COLUMNS }, () => null);
}

function readRecord(): ConnectFourRecord {
  const stored = window.localStorage.getItem(RECORD_KEY);
  return stored ? (JSON.parse(stored) as ConnectFourRecord) : { wins: 0, losses: 0, draws: 0, streak: 0 };
}

function toIndex(row: number, column: number) {
  return row * COLUMNS + column;
}

function getOpenRow(board: ConnectFourCell[], column: number) {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (!board[toIndex(row, column)]) {
      return row;
    }
  }

  return null;
}

function getLegalColumns(board: ConnectFourCell[]) {
  return Array.from({ length: COLUMNS }, (_, column) => column).filter((column) => getOpenRow(board, column) !== null);
}

function dropDisc(board: ConnectFourCell[], column: number, player: ConnectFourPlayer) {
  const row = getOpenRow(board, column);

  if (row === null) {
    return null;
  }

  const next = [...board];
  next[toIndex(row, column)] = player;
  return next;
}

function findResult(board: ConnectFourCell[]): ConnectFourResult {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const player = board[toIndex(row, column)];

      if (!player) {
        continue;
      }

      for (const [rowStep, columnStep] of directions) {
        const line = [toIndex(row, column)];

        for (let offset = 1; offset < 4; offset += 1) {
          const nextRow = row + rowStep * offset;
          const nextColumn = column + columnStep * offset;

          if (nextRow < 0 || nextRow >= ROWS || nextColumn < 0 || nextColumn >= COLUMNS) {
            break;
          }

          const nextIndex = toIndex(nextRow, nextColumn);
          if (board[nextIndex] !== player) {
            break;
          }

          line.push(nextIndex);
        }

        if (line.length === 4) {
          return { winner: player, line };
        }
      }
    }
  }

  return null;
}

function isFull(board: ConnectFourCell[]) {
  return board.every(Boolean);
}

function countPotential(board: ConnectFourCell[], player: ConnectFourPlayer) {
  const windows: number[][] = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column <= COLUMNS - 4; column += 1) {
      windows.push([0, 1, 2, 3].map((offset) => toIndex(row, column + offset)));
    }
  }

  for (let column = 0; column < COLUMNS; column += 1) {
    for (let row = 0; row <= ROWS - 4; row += 1) {
      windows.push([0, 1, 2, 3].map((offset) => toIndex(row + offset, column)));
    }
  }

  for (let row = 0; row <= ROWS - 4; row += 1) {
    for (let column = 0; column <= COLUMNS - 4; column += 1) {
      windows.push([0, 1, 2, 3].map((offset) => toIndex(row + offset, column + offset)));
    }
  }

  for (let row = 0; row <= ROWS - 4; row += 1) {
    for (let column = 3; column < COLUMNS; column += 1) {
      windows.push([0, 1, 2, 3].map((offset) => toIndex(row + offset, column - offset)));
    }
  }

  return windows.reduce((score, window) => {
    const cells = window.map((index) => board[index]);
    const own = cells.filter((cell) => cell === player).length;
    const empty = cells.filter((cell) => !cell).length;
    const rival = cells.filter((cell) => cell && cell !== player).length;

    if (rival > 0) {
      return score;
    }

    if (own === 3 && empty === 1) return score + 18;
    if (own === 2 && empty === 2) return score + 5;
    if (own === 1 && empty === 3) return score + 1;
    return score;
  }, 0);
}

function findImmediateColumn(board: ConnectFourCell[], player: ConnectFourPlayer) {
  return getLegalColumns(board).find((column) => {
    const next = dropDisc(board, column, player);
    return next ? findResult(next)?.winner === player : false;
  });
}

function scoreColumn(board: ConnectFourCell[], column: number, difficulty: ConnectFourDifficulty) {
  const next = dropDisc(board, column, "yellow");

  if (!next) {
    return -Infinity;
  }

  const centerBonus = 8 - Math.abs(3 - column) * 2;
  const attack = countPotential(next, "yellow");
  const defense = countPotential(next, "red");
  const playerImmediate = findImmediateColumn(next, "red") !== undefined ? 22 : 0;

  if (difficulty === "easy") {
    return Math.random() * 20 + centerBonus;
  }

  if (difficulty === "normal") {
    return centerBonus + attack * 1.3 - playerImmediate + Math.random() * 5;
  }

  return centerBonus + attack * 1.8 - defense * 0.35 - playerImmediate * 1.5 + Math.random();
}

function pickCpuColumn(board: ConnectFourCell[], difficulty: ConnectFourDifficulty) {
  const legalColumns = getLegalColumns(board);

  if (legalColumns.length === 0) {
    return null;
  }

  const winningColumn = findImmediateColumn(board, "yellow");
  if (winningColumn !== undefined) {
    return winningColumn;
  }

  const blockingColumn = findImmediateColumn(board, "red");
  if (blockingColumn !== undefined && (difficulty !== "easy" || Math.random() < 0.55)) {
    return blockingColumn;
  }

  return [...legalColumns].sort((a, b) => scoreColumn(board, b, difficulty) - scoreColumn(board, a, difficulty))[0];
}

function getOutcome(result: ConnectFourResult, board: ConnectFourCell[]): ConnectFourOutcome {
  if (result?.winner === "red") return "win";
  if (result?.winner === "yellow") return "lose";
  if (isFull(board)) return "draw";
  return null;
}

function updateRecord(record: ConnectFourRecord, outcome: ConnectFourOutcome): ConnectFourRecord {
  if (outcome === "win") return { ...record, wins: record.wins + 1, streak: record.streak + 1 };
  if (outcome === "lose") return { ...record, losses: record.losses + 1, streak: 0 };
  if (outcome === "draw") return { ...record, draws: record.draws + 1, streak: 0 };
  return record;
}

export function ConnectFour({ onBack }: ConnectFourProps) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [board, setBoard] = useState<ConnectFourCell[]>(() => createBoard());
  const [status, setStatus] = useState<ConnectFourStatus>("idle");
  const [turn, setTurn] = useState<ConnectFourPlayer>("red");
  const [difficulty, setDifficulty] = useState<ConnectFourDifficulty>("normal");
  const [record, setRecord] = useState<ConnectFourRecord>(() => readRecord());
  const [message, setMessage] = useState("赤があなた、黄がCOMです。先に4つ並べましょう。");

  const result = useMemo(() => findResult(board), [board]);
  const outcome = getOutcome(result, board);
  const ranking = useRanking({ gameId: `connect-four-${difficulty}`, metricLabel: "Wins", mode: "higher" });
  const legalColumns = getLegalColumns(board);
  const visibleDifficultyLabel = isEnglish ? difficultyLabelsEn[difficulty] : difficultyLabels[difficulty];

  useEffect(() => {
    if (status !== "playing" || !outcome) {
      return;
    }

    const nextRecord = updateRecord(record, outcome);
    setRecord(nextRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus("finished");

    if (outcome === "win") setMessage("勝利！赤が4つ並びました。");
    if (outcome === "lose") setMessage("COMの勝ちです。次はリーチを早めに止めましょう。");
    if (outcome === "draw") setMessage("引き分けです。盤面ぎっしりの接戦でした。");
  }, [outcome, record, status]);

  useEffect(() => {
    if (status !== "playing" || turn !== "yellow" || outcome) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const column = pickCpuColumn(board, difficulty);

      if (column === null) {
        return;
      }

      const nextBoard = dropDisc(board, column, "yellow");
      if (!nextBoard) {
        return;
      }

      setBoard(nextBoard);
      setTurn("red");
      setMessage(`${column + 1}列目にCOMが置きました。あなたの番です。`);
    }, 420);

    return () => window.clearTimeout(timerId);
  }, [board, difficulty, outcome, status, turn]);

  const startGame = () => {
    setBoard(createBoard());
    setStatus("playing");
    setTurn("red");
    setMessage("列を選ぶと、下から赤いチップが入ります。");
  };

  const playColumn = (column: number) => {
    if (status !== "playing" || turn !== "red" || outcome) {
      return;
    }

    const nextBoard = dropDisc(board, column, "red");
    if (!nextBoard) {
      setMessage("その列はもういっぱいです。別の列を選びましょう。");
      return;
    }

    setBoard(nextBoard);
    setTurn("yellow");
    setMessage("COMが考えています……");
  };

  const resetRecord = () => {
    const emptyRecord = { wins: 0, losses: 0, draws: 0, streak: 0 };
    setRecord(emptyRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(emptyRecord));
  };

  return (
    <section className="puzzle-shell connect-shell" aria-labelledby="connect-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">BOARD GAME / INTERNAL GAME</p>
          <h1 id="connect-title">{isEnglish ? "Connect Four" : "コネクトフォー"}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel connect-score" aria-label={isEnglish ? "Connect Four record" : "コネクトフォーの戦績"}>
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

      <div className="puzzle-layout connect-layout">
        <div className="connect-play-area">
          <div className="connect-drop-row" aria-label={isEnglish ? "column select" : "列選択"}>
            {Array.from({ length: COLUMNS }, (_, column) => (
              <button
                disabled={status !== "playing" || turn !== "red" || !legalColumns.includes(column)}
                key={column}
                type="button"
                onClick={() => playColumn(column)}
                aria-label={isEnglish ? `Drop in column ${column + 1}` : `${column + 1}列目に置く`}
              >
                ↓
              </button>
            ))}
          </div>

          <div className="connect-board" aria-label={isEnglish ? "Connect Four board" : "コネクトフォー盤面"}>
            {board.map((cell, index) => (
              <span
                className={`connect-cell${cell ? ` is-${cell}` : ""}${result?.line.includes(index) ? " is-winning" : ""}`}
                key={index}
                aria-label={cell ? (cell === "red" ? (isEnglish ? "red" : "赤") : (isEnglish ? "yellow" : "黄")) : (isEnglish ? "empty" : "空き")}
              />
            ))}
          </div>
        </div>

        <aside className="puzzle-side connect-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to play" : "遊び方"}</h2>
            <p>
              {isEnglish
                ? "Choose a column to drop your disc from the bottom. Connect four of your color vertically, horizontally, or diagonally to win."
                : "列を選ぶとチップが下から積み上がります。縦・横・斜めのどれかに自分の色を4つ並べると勝ちです。"}
            </p>
          </div>

          <div className="connect-difficulty" aria-label={isEnglish ? "difficulty" : "難易度"}>
            {(Object.keys(difficultyLabels) as ConnectFourDifficulty[]).map((level) => (
              <button
                className={difficulty === level ? "is-selected" : ""}
                disabled={status === "playing"}
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
              >
                <span>{isEnglish ? difficultyLabelsEn[level] : difficultyLabels[level]}</span>
                <small>{isEnglish ? difficultyDescriptionsEn[level] : difficultyDescriptions[level]}</small>
              </button>
            ))}
          </div>

          <div className="connect-record">
            <span>{isEnglish ? "Streak" : "連勝"}: {record.streak}</span>
            <span>{isEnglish ? "Current" : "現在"}: {status === "playing" ? (turn === "red" ? (isEnglish ? "Your turn" : "あなたの番") : (isEnglish ? "CPU turn" : "COMの番")) : (isEnglish ? "Idle" : "待機中")}</span>
            <span>{isEnglish ? "Difficulty" : "難易度"}: {visibleDifficultyLabel}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" && outcome === "win" ? { score: record.streak, display: isEnglish ? `${record.streak}-win streak` : `${record.streak}連勝`, meta: visibleDifficultyLabel } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startGame}>
              <Sparkles aria-hidden="true" />
              {isEnglish ? "New game" : "新しく始める"}
            </button>
            <button className="ghost-button" type="button" onClick={resetRecord}>
              <RotateCcw aria-hidden="true" />
              {isEnglish ? "Reset record" : "戦績リセット"}
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            {isEnglish ? "Back to shelf" : "棚へ戻る"}
          </button>

          <div className="connect-hint">
            <CircleDot aria-hidden="true" />
            {isEnglish ? "Center columns are useful for both attack and defense." : "中央の列は攻めにも守りにも使いやすい、ちょっとおいしい場所です。"}
          </div>
        </aside>
      </div>
    </section>
  );
}
