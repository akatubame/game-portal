import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { MazeBest, MazeCell, MazeDifficulty, MazeStatus } from "./types";

type MazeEscapeProps = {
  onBack: () => void;
};

type Direction = "top" | "right" | "bottom" | "left";

const BEST_KEY = "game-shelf-maze-escape-best";

const difficultySettings: Record<MazeDifficulty, { label: string; size: number; description: string }> = {
  small: { label: "小さめ", size: 9, description: "まずは軽く遊べる9×9迷路。" },
  normal: { label: "ふつう", size: 13, description: "ほどよく迷える13×13迷路。" },
  large: { label: "大きめ", size: 17, description: "じっくり探索する17×17迷路。" }
};

const directionDelta: Record<Direction, { row: number; column: number; opposite: Direction }> = {
  top: { row: -1, column: 0, opposite: "bottom" },
  right: { row: 0, column: 1, opposite: "left" },
  bottom: { row: 1, column: 0, opposite: "top" },
  left: { row: 0, column: -1, opposite: "right" }
};

function createEmptyMaze(size: number): MazeCell[] {
  return Array.from({ length: size * size }, () => ({
    walls: { top: true, right: true, bottom: true, left: true },
    visited: false
  }));
}

function toIndex(row: number, column: number, size: number) {
  return row * size + column;
}

function shuffle<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function generateMaze(size: number) {
  const maze = createEmptyMaze(size);
  const stack = [0];
  maze[0].visited = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const row = Math.floor(current / size);
    const column = current % size;
    const candidates = shuffle(Object.keys(directionDelta) as Direction[]).filter((direction) => {
      const delta = directionDelta[direction];
      const nextRow = row + delta.row;
      const nextColumn = column + delta.column;

      return nextRow >= 0 && nextRow < size && nextColumn >= 0 && nextColumn < size && !maze[toIndex(nextRow, nextColumn, size)].visited;
    });

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const direction = candidates[0];
    const delta = directionDelta[direction];
    const nextIndex = toIndex(row + delta.row, column + delta.column, size);
    maze[current].walls[direction] = false;
    maze[nextIndex].walls[delta.opposite] = false;
    maze[nextIndex].visited = true;
    stack.push(nextIndex);
  }

  return maze.map((cell) => ({ ...cell, visited: false }));
}

function readBest(): Record<string, MazeBest> {
  const stored = window.localStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as Record<string, MazeBest>) : {};
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function MazeEscape({ onBack }: MazeEscapeProps) {
  const [difficulty, setDifficulty] = useState<MazeDifficulty>("normal");
  const [maze, setMaze] = useState<MazeCell[]>(() => generateMaze(difficultySettings.normal.size));
  const [playerIndex, setPlayerIndex] = useState(0);
  const [status, setStatus] = useState<MazeStatus>("idle");
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("ランダム迷路を進んで、右下のゴールを目指しましょう。");
  const [bestBySize, setBestBySize] = useState<Record<string, MazeBest>>(() => readBest());

  const size = difficultySettings[difficulty].size;
  const goalIndex = size * size - 1;
  const currentBest = bestBySize[String(size)];
  const visitedPath = useMemo(() => {
    const visited = new Set<number>();
    visited.add(0);
    return visited;
  }, [maze]);

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const timerId = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [status]);

  const startGame = (nextDifficulty = difficulty) => {
    const nextSize = difficultySettings[nextDifficulty].size;
    setDifficulty(nextDifficulty);
    setMaze(generateMaze(nextSize));
    setPlayerIndex(0);
    setStatus("playing");
    setMoves(0);
    setSeconds(0);
    setMessage("矢印キー、または画面ボタンで移動できます。");
  };

  const clearMaze = (nextMoves: number, nextSeconds: number) => {
    const key = String(size);
    const result: MazeBest = {
      size,
      moves: nextMoves,
      seconds: nextSeconds,
      recordedAt: new Date().toISOString()
    };
    const current = bestBySize[key];

    if (!current || nextMoves < current.moves || (nextMoves === current.moves && nextSeconds < current.seconds)) {
      const nextBest = { ...bestBySize, [key]: result };
      setBestBySize(nextBest);
      window.localStorage.setItem(BEST_KEY, JSON.stringify(nextBest));
      setMessage(`脱出成功！${nextMoves}手 / ${formatTime(nextSeconds)} でベスト更新です。`);
    } else {
      setMessage(`脱出成功！${nextMoves}手 / ${formatTime(nextSeconds)} でした。`);
    }

    setStatus("cleared");
  };

  const movePlayer = (direction: Direction) => {
    if (status !== "playing") {
      return;
    }

    const currentCell = maze[playerIndex];
    if (currentCell.walls[direction]) {
      setMessage("そちらには壁があります。別の道を探しましょう。");
      return;
    }

    const row = Math.floor(playerIndex / size);
    const column = playerIndex % size;
    const delta = directionDelta[direction];
    const nextIndex = toIndex(row + delta.row, column + delta.column, size);
    const nextMoves = moves + 1;
    const nextSeconds = seconds;

    setPlayerIndex(nextIndex);
    setMoves(nextMoves);
    setMessage("いい感じです。ゴールまで進みましょう。");

    if (nextIndex === goalIndex) {
      clearMaze(nextMoves, nextSeconds);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      if (event.key === "ArrowUp") movePlayer("top");
      if (event.key === "ArrowRight") movePlayer("right");
      if (event.key === "ArrowDown") movePlayer("bottom");
      if (event.key === "ArrowLeft") movePlayer("left");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBestBySize({});
  };

  return (
    <section className="puzzle-shell maze-shell" aria-labelledby="maze-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="maze-title">迷路脱出</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel maze-score" aria-label="迷路脱出の状態">
          <div>
            <span>Moves</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{formatTime(seconds)}</strong>
          </div>
          <div>
            <span>Size</span>
            <strong>{size}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout maze-layout">
        <div className="maze-play-area">
          <div className="maze-board" style={{ "--maze-size": size } as CSSProperties} aria-label="迷路盤面">
            {maze.map((cell, index) => (
              <span
                className={`maze-cell${index === playerIndex ? " is-player" : ""}${index === goalIndex ? " is-goal" : ""}${
                  visitedPath.has(index) ? " is-visited" : ""
                }`}
                key={index}
                style={{
                  borderTopWidth: cell.walls.top ? 2 : 0,
                  borderRightWidth: cell.walls.right ? 2 : 0,
                  borderBottomWidth: cell.walls.bottom ? 2 : 0,
                  borderLeftWidth: cell.walls.left ? 2 : 0
                }}
              />
            ))}
          </div>

          <div className="maze-controls" aria-label="移動ボタン">
            <button type="button" onClick={() => movePlayer("top")} disabled={status !== "playing"} aria-label="上へ">
              <ArrowUp aria-hidden="true" />
            </button>
            <button type="button" onClick={() => movePlayer("left")} disabled={status !== "playing"} aria-label="左へ">
              <ArrowLeft aria-hidden="true" />
            </button>
            <button type="button" onClick={() => movePlayer("bottom")} disabled={status !== "playing"} aria-label="下へ">
              <ArrowDown aria-hidden="true" />
            </button>
            <button type="button" onClick={() => movePlayer("right")} disabled={status !== "playing"} aria-label="右へ">
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>

        <aside className="puzzle-side maze-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              左上からスタートし、右下のゴールを目指します。壁のない方向へだけ進めます。
              矢印キーでも画面ボタンでも操作できます。
            </p>
          </div>

          <div className="maze-options" aria-label="迷路サイズ">
            {(Object.keys(difficultySettings) as MazeDifficulty[]).map((level) => (
              <button className={difficulty === level ? "is-selected" : ""} key={level} type="button" onClick={() => startGame(level)}>
                <span>{difficultySettings[level].label}</span>
                <small>{difficultySettings[level].description}</small>
              </button>
            ))}
          </div>

          <div className="maze-progress">
            <span>現在: {status === "playing" ? "探索中" : status === "cleared" ? "脱出成功" : "待機中"}</span>
            <span>ベスト: {currentBest ? `${currentBest.moves}手 / ${formatTime(currentBest.seconds)}` : "まだ記録なし"}</span>
          </div>

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
