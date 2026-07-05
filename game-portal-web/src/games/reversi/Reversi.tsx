import { RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReversiDifficulty, ReversiDisc, ReversiMove, ReversiOutcome, ReversiPlayer, ReversiRecord, ReversiStatus } from "./types";

type ReversiProps = {
  onBack: () => void;
};

const SIZE = 8;
const RECORD_KEY = "game-shelf-reversi-record";
const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

const difficultyLabels: Record<ReversiDifficulty, string> = {
  easy: "やさしい",
  normal: "ふつう",
  hard: "本気"
};

const difficultyDescriptions: Record<ReversiDifficulty, string> = {
  easy: "COMは取れる数をあまり気にせず打ちます。",
  normal: "角を少し意識しつつ、ほどよく手を選びます。",
  hard: "角・端・返せる枚数を見て堅めに打ちます。"
};

function opponent(player: ReversiPlayer): ReversiPlayer {
  return player === "black" ? "white" : "black";
}

function toIndex(row: number, col: number) {
  return row * SIZE + col;
}

function inBounds(row: number, col: number) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function createInitialBoard(): ReversiDisc[] {
  const board = Array.from({ length: SIZE * SIZE }, () => null as ReversiDisc);
  board[toIndex(3, 3)] = "white";
  board[toIndex(3, 4)] = "black";
  board[toIndex(4, 3)] = "black";
  board[toIndex(4, 4)] = "white";
  return board;
}

function readRecord(): ReversiRecord {
  const stored = window.localStorage.getItem(RECORD_KEY);
  return stored ? (JSON.parse(stored) as ReversiRecord) : { wins: 0, losses: 0, draws: 0 };
}

function getMove(board: ReversiDisc[], index: number, player: ReversiPlayer): ReversiMove | null {
  if (board[index]) {
    return null;
  }

  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const rival = opponent(player);
  const flips: number[] = [];

  for (const [rowStep, colStep] of DIRECTIONS) {
    const line: number[] = [];
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (inBounds(nextRow, nextCol)) {
      const nextIndex = toIndex(nextRow, nextCol);
      const disc = board[nextIndex];

      if (disc === rival) {
        line.push(nextIndex);
      } else if (disc === player) {
        if (line.length > 0) {
          flips.push(...line);
        }
        break;
      } else {
        break;
      }

      nextRow += rowStep;
      nextCol += colStep;
    }
  }

  return flips.length > 0 ? { index, flips } : null;
}

function getLegalMoves(board: ReversiDisc[], player: ReversiPlayer): ReversiMove[] {
  return board
    .map((_, index) => getMove(board, index, player))
    .filter((move): move is ReversiMove => Boolean(move));
}

function applyMove(board: ReversiDisc[], move: ReversiMove, player: ReversiPlayer): ReversiDisc[] {
  const next = [...board];
  next[move.index] = player;
  move.flips.forEach((index) => {
    next[index] = player;
  });
  return next;
}

function countDiscs(board: ReversiDisc[]) {
  return board.reduce(
    (score, disc) => {
      if (disc === "black") score.black += 1;
      if (disc === "white") score.white += 1;
      return score;
    },
    { black: 0, white: 0 }
  );
}

function scoreMove(board: ReversiDisc[], move: ReversiMove, difficulty: ReversiDifficulty) {
  const row = Math.floor(move.index / SIZE);
  const col = move.index % SIZE;
  const isCorner = (row === 0 || row === SIZE - 1) && (col === 0 || col === SIZE - 1);
  const isEdge = row === 0 || row === SIZE - 1 || col === 0 || col === SIZE - 1;
  const next = applyMove(board, move, "white");
  const playerReplies = getLegalMoves(next, "black").length;

  if (difficulty === "easy") {
    return Math.random() * 8 + move.flips.length;
  }

  if (difficulty === "normal") {
    return move.flips.length * 2 + (isCorner ? 28 : 0) + (isEdge ? 5 : 0) - playerReplies * 0.8 + Math.random() * 5;
  }

  return move.flips.length * 3 + (isCorner ? 80 : 0) + (isEdge ? 12 : 0) - playerReplies * 2 + Math.random();
}

function pickCpuMove(board: ReversiDisc[], moves: ReversiMove[], difficulty: ReversiDifficulty) {
  return [...moves].sort((a, b) => scoreMove(board, b, difficulty) - scoreMove(board, a, difficulty))[0];
}

function getOutcome(board: ReversiDisc[]): ReversiOutcome {
  const score = countDiscs(board);
  if (score.black > score.white) return "win";
  if (score.black < score.white) return "lose";
  return "draw";
}

function updateRecord(record: ReversiRecord, outcome: ReversiOutcome): ReversiRecord {
  if (outcome === "win") return { ...record, wins: record.wins + 1 };
  if (outcome === "lose") return { ...record, losses: record.losses + 1 };
  if (outcome === "draw") return { ...record, draws: record.draws + 1 };
  return record;
}

export function Reversi({ onBack }: ReversiProps) {
  const [board, setBoard] = useState<ReversiDisc[]>(() => createInitialBoard());
  const [status, setStatus] = useState<ReversiStatus>("idle");
  const [turn, setTurn] = useState<ReversiPlayer>("black");
  const [difficulty, setDifficulty] = useState<ReversiDifficulty>("normal");
  const [record, setRecord] = useState<ReversiRecord>(() => readRecord());
  const [message, setMessage] = useState("黒があなた、白がCOMです。難易度を選んで始めましょう。");
  const [lastMove, setLastMove] = useState<number | null>(null);

  const score = useMemo(() => countDiscs(board), [board]);
  const playerMoves = useMemo(() => getLegalMoves(board, "black"), [board]);
  const cpuMoves = useMemo(() => getLegalMoves(board, "white"), [board]);
  const legalMoveIndexes = new Set(playerMoves.map((move) => move.index));

  const finishGame = (finalBoard: ReversiDisc[]) => {
    const outcome = getOutcome(finalBoard);
    const nextRecord = updateRecord(record, outcome);
    const finalScore = countDiscs(finalBoard);

    setRecord(nextRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus("finished");
    setTurn("black");

    if (outcome === "win") {
      setMessage(`勝利！ ${finalScore.black} 対 ${finalScore.white} で黒の勝ちです。`);
    } else if (outcome === "lose") {
      setMessage(`COMの勝ちです。 ${finalScore.black} 対 ${finalScore.white}。角を取らせないのが大事です。`);
    } else {
      setMessage(`引き分けです。 ${finalScore.black} 対 ${finalScore.white} の接戦でした。`);
    }
  };

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    if (playerMoves.length === 0 && cpuMoves.length === 0) {
      finishGame(board);
      return;
    }

    if (turn === "black" && playerMoves.length === 0) {
      setTurn("white");
      setMessage("あなたは置ける場所がないためパスです。COMの番です。");
      return;
    }

    if (turn === "white" && cpuMoves.length === 0) {
      setTurn("black");
      setMessage("COMは置ける場所がないためパスです。あなたの番です。");
    }
  }, [board, cpuMoves.length, playerMoves.length, status, turn]);

  useEffect(() => {
    if (status !== "playing" || turn !== "white" || cpuMoves.length === 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const move = pickCpuMove(board, cpuMoves, difficulty);
      const nextBoard = applyMove(board, move, "white");
      setBoard(nextBoard);
      setLastMove(move.index);
      setTurn("black");
      setMessage(`${move.flips.length}枚返されました。あなたの番です。`);
    }, 520);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [board, cpuMoves, difficulty, status, turn]);

  const startGame = () => {
    setBoard(createInitialBoard());
    setStatus("playing");
    setTurn("black");
    setLastMove(null);
    setMessage("あなたの番です。薄く光るマスに黒石を置けます。");
  };

  const playMove = (index: number) => {
    if (status !== "playing" || turn !== "black") {
      return;
    }

    const move = getMove(board, index, "black");
    if (!move) {
      setMessage("そこには置けません。光っているマスを選びましょう。");
      return;
    }

    const nextBoard = applyMove(board, move, "black");
    setBoard(nextBoard);
    setLastMove(index);
    setTurn("white");
    setMessage(`${move.flips.length}枚返しました。COMが考えています……`);
  };

  const resetRecord = () => {
    const emptyRecord = { wins: 0, losses: 0, draws: 0 };
    setRecord(emptyRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(emptyRecord));
  };

  return (
    <section className="puzzle-shell reversi-shell" aria-labelledby="reversi-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">BOARD GAME / INTERNAL GAME</p>
          <h1 id="reversi-title">オセロ / リバーシ</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel reversi-score" aria-label="オセロの石数">
          <div>
            <span>Black</span>
            <strong>{score.black}</strong>
          </div>
          <div>
            <span>White</span>
            <strong>{score.white}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout reversi-layout">
        <div className="reversi-board" aria-label="オセロ盤面">
          {board.map((disc, index) => (
            <button
              className={`reversi-cell${legalMoveIndexes.has(index) && status === "playing" && turn === "black" ? " is-legal" : ""}${
                lastMove === index ? " is-last" : ""
              }`}
              key={index}
              type="button"
              onClick={() => playMove(index)}
              aria-label={`${Math.floor(index / SIZE) + 1}行${(index % SIZE) + 1}列${
                disc
                  ? disc === "black"
                    ? " 黒石"
                    : " 白石"
                  : status === "playing" && turn === "black" && legalMoveIndexes.has(index)
                    ? " 置けるマス"
                    : " 空きマス"
              }`}
            >
              {disc && <span className={`reversi-disc is-${disc}`} />}
            </button>
          ))}
        </div>

        <aside className="puzzle-side reversi-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              あなたは黒石、COMは白石です。相手の石をはさめる場所に置くと、その間の石を自分の色にできます。
              置ける場所は盤面上で薄く光ります。
            </p>
          </div>

          <div className="reversi-difficulty" aria-label="難易度">
            {(Object.keys(difficultyLabels) as ReversiDifficulty[]).map((level) => (
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

          <div className="reversi-record">
            <span>勝ち: {record.wins}</span>
            <span>引き分け: {record.draws}</span>
            <span>負け: {record.losses}</span>
            <span>現在: {status === "playing" ? (turn === "black" ? "あなたの番" : "COMの番") : "待機中"}</span>
          </div>

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
        </aside>
      </div>
    </section>
  );
}
