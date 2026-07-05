import { CircleDot, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { PegBest, PegCell, PegPosition, PegStatus } from "./types";

type PegSolitaireProps = {
  onBack: () => void;
};

const BEST_KEY = "game-shelf-peg-solitaire-best";
const BOARD_SIZE = 7;
const directions = [
  { row: -1, column: 0 },
  { row: 1, column: 0 },
  { row: 0, column: -1 },
  { row: 0, column: 1 }
];

function isValidPosition(row: number, column: number) {
  const inTopBottomCorner = (row < 2 || row > 4) && (column < 2 || column > 4);
  return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE && !inTopBottomCorner;
}

function toIndex(row: number, column: number) {
  return row * BOARD_SIZE + column;
}

function createBoard(): PegCell[] {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
    const row = Math.floor(index / BOARD_SIZE);
    const column = index % BOARD_SIZE;

    if (!isValidPosition(row, column)) {
      return "invalid";
    }

    return row === 3 && column === 3 ? "empty" : "peg";
  });
}

function readBest(): PegBest | null {
  const stored = window.localStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as PegBest) : null;
}

function countPegs(board: PegCell[]) {
  return board.filter((cell) => cell === "peg").length;
}

function canMove(board: PegCell[], from: PegPosition, to: PegPosition) {
  if (!isValidPosition(from.row, from.column) || !isValidPosition(to.row, to.column)) {
    return false;
  }

  const rowDelta = to.row - from.row;
  const columnDelta = to.column - from.column;
  const isTwoStep = Math.abs(rowDelta) + Math.abs(columnDelta) === 2 && (rowDelta === 0 || columnDelta === 0);

  if (!isTwoStep) {
    return false;
  }

  const middle = {
    row: from.row + rowDelta / 2,
    column: from.column + columnDelta / 2
  };

  return (
    board[toIndex(from.row, from.column)] === "peg" &&
    board[toIndex(middle.row, middle.column)] === "peg" &&
    board[toIndex(to.row, to.column)] === "empty"
  );
}

function hasLegalMove(board: PegCell[]) {
  return board.some((cell, index) => {
    if (cell !== "peg") {
      return false;
    }

    const from = {
      row: Math.floor(index / BOARD_SIZE),
      column: index % BOARD_SIZE
    };

    return directions.some((direction) =>
      canMove(board, from, {
        row: from.row + direction.row * 2,
        column: from.column + direction.column * 2
      })
    );
  });
}

function getLegalTargets(board: PegCell[], from: PegPosition | null) {
  if (!from) {
    return new Set<number>();
  }

  return new Set(
    directions
      .map((direction) => ({
        row: from.row + direction.row * 2,
        column: from.column + direction.column * 2
      }))
      .filter((to) => canMove(board, from, to))
      .map((to) => toIndex(to.row, to.column))
  );
}

function isBetterBest(currentBest: PegBest | null, remaining: number, moves: number) {
  if (!currentBest) {
    return true;
  }

  if (remaining !== currentBest.remaining) {
    return remaining < currentBest.remaining;
  }

  return moves < currentBest.moves;
}

export function PegSolitaire({ onBack }: PegSolitaireProps) {
  const [board, setBoard] = useState<PegCell[]>(() => createBoard());
  const [status, setStatus] = useState<PegStatus>("idle");
  const [selected, setSelected] = useState<PegPosition | null>(null);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<PegBest | null>(() => readBest());
  const [message, setMessage] = useState("ペグを選び、隣のペグを飛び越えて空きマスへ移動します。飛び越えたペグは取り除かれます。");

  const remaining = countPegs(board);
  const ranking = useRanking({ gameId: "peg-solitaire-result", metricLabel: "Result", mode: "lower" });
  const legalTargets = useMemo(() => getLegalTargets(board, selected), [board, selected]);

  const saveBest = (nextRemaining: number, nextMoves: number) => {
    if (!isBetterBest(best, nextRemaining, nextMoves)) {
      return;
    }

    const nextBest = {
      remaining: nextRemaining,
      moves: nextMoves,
      recordedAt: new Date().toISOString()
    };
    setBest(nextBest);
    window.localStorage.setItem(BEST_KEY, JSON.stringify(nextBest));
  };

  const startGame = () => {
    setBoard(createBoard());
    setStatus("playing");
    setSelected(null);
    setMoves(0);
    setMessage("ペグをクリックして選択し、光った移動先をクリックしましょう。");
  };

  const finishIfNeeded = (nextBoard: PegCell[], nextMoves: number) => {
    const nextRemaining = countPegs(nextBoard);

    if (nextRemaining === 1) {
      setStatus("cleared");
      setMessage("クリア！最後の1本まで絞り切りました。これは気持ちいいやつです。");
      saveBest(nextRemaining, nextMoves);
      return;
    }

    if (!hasLegalMove(nextBoard)) {
      setStatus("stuck");
      setMessage(`手詰まりです。残り${nextRemaining}本でした。`);
      saveBest(nextRemaining, nextMoves);
    }
  };

  const selectCell = (row: number, column: number) => {
    if (status !== "playing") {
      return;
    }

    const index = toIndex(row, column);
    const cell = board[index];

    if (selected && canMove(board, selected, { row, column })) {
      const middle = {
        row: selected.row + (row - selected.row) / 2,
        column: selected.column + (column - selected.column) / 2
      };
      const nextBoard = [...board];
      nextBoard[toIndex(selected.row, selected.column)] = "empty";
      nextBoard[toIndex(middle.row, middle.column)] = "empty";
      nextBoard[index] = "peg";
      const nextMoves = moves + 1;

      setBoard(nextBoard);
      setMoves(nextMoves);
      setSelected(null);
      setMessage("ジャンプ成功。次の一手を探しましょう。");
      finishIfNeeded(nextBoard, nextMoves);
      return;
    }

    if (cell === "peg") {
      const nextSelected = { row, column };
      const targets = getLegalTargets(board, nextSelected);

      if (targets.size === 0) {
        setSelected(null);
        setMessage("そのペグから動ける場所はありません。別のペグを選びましょう。");
        return;
      }

      setSelected(nextSelected);
      setMessage("移動先の空きマスを選んでください。");
      return;
    }

    if (cell === "empty") {
      setSelected(null);
      setMessage("空きマスへ移動するには、先に動かすペグを選んでください。");
    }
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBest(null);
  };

  return (
    <section className="puzzle-shell peg-shell" aria-labelledby="peg-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="peg-title">ペグ・ソリティア</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel peg-score" aria-label="ペグ・ソリティアの状態">
          <div>
            <span>Pegs</span>
            <strong>{remaining}</strong>
          </div>
          <div>
            <span>Moves</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Best</span>
            <strong>{best ? best.remaining : "--"}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout peg-layout">
        <div className="peg-play-area">
          <div className="peg-board" aria-label="ペグ・ソリティア盤面">
            {board.map((cell, index) => {
              const row = Math.floor(index / BOARD_SIZE);
              const column = index % BOARD_SIZE;
              const isSelected = selected?.row === row && selected.column === column;
              const isTarget = legalTargets.has(index);

              return (
                <button
                  className={`peg-cell is-${cell}${isSelected ? " is-selected" : ""}${isTarget ? " is-target" : ""}`}
                  disabled={cell === "invalid" || status !== "playing"}
                  key={index}
                  type="button"
                  onClick={() => selectCell(row, column)}
                  aria-label={`${row + 1}行${column + 1}列 ${cell === "peg" ? "ペグ" : cell === "empty" ? "空き" : "盤外"}`}
                >
                  {cell === "peg" && <span />}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="puzzle-side peg-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              ペグは上下左右に2マス先の空きマスへジャンプできます。間にあるペグは取り除かれます。
              これを繰り返して、最後の1本を目指しましょう。
            </p>
          </div>

          <div className="peg-progress">
            <span>現在: {status === "playing" ? "プレイ中" : status === "cleared" ? "クリア" : status === "stuck" ? "手詰まり" : "待機中"}</span>
            <span>ベスト: {best ? `残り${best.remaining}本 / ${best.moves}手` : "まだ記録なし"}</span>
            <span>目標: 最後の1本</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "cleared" || status === "stuck" ? { score: remaining * 1000 + moves, display: `残り${remaining}本 / ${moves}手`, meta: status === "cleared" ? "クリア" : "手詰まり" } : null}
          />

          <div className="peg-hint">
            <CircleDot aria-hidden="true" />
            端から適当に消すと詰まりやすいです。中央へ戻す道を残すと、ちょっと見通しが良くなります。
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startGame}>
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
