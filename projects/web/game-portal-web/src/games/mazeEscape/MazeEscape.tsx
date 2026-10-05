import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { useStopwatch } from "../useStopwatch";
import { safeStorage } from "../../safeStorage";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import type { CSSProperties } from "react";
import type { MazeBest, MazeCell, MazeDifficulty, MazeStatus } from "./types";

type MazeEscapeProps = {
  onBack: () => void;
};

type Direction = "top" | "right" | "bottom" | "left";

const BEST_KEY = "game-shelf-maze-escape-best";
const TIME_KEY = "game-shelf-maze-escape-time-best";

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

function readBest(key = BEST_KEY): Record<string, MazeBest> {
  const stored = safeStorage.getItem(key);
  return stored ? (JSON.parse(stored) as Record<string, MazeBest>) : {};
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function MazeEscape({ onBack }: MazeEscapeProps) {
  const confirmRecordReset = useConfirmRecordReset();
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [difficulty, setDifficulty] = useState<MazeDifficulty>("normal");
  const [maze, setMaze] = useState<MazeCell[]>(() => generateMaze(difficultySettings.normal.size));
  const [playerIndex, setPlayerIndex] = useState(0);
  const [status, setStatus] = useState<MazeStatus>("idle");
  const [moves, setMoves] = useState(0);
  const { seconds, resetTimer, stopTimer } = useStopwatch();
  const [message, setMessage] = useState<"idle" | "start" | "wall" | "moving" | "clear">("idle");
  const [result, setResult] = useState<(MazeBest & { improved: boolean }) | null>(null);
  const [timeBySize, setTimeBySize] = useState<Record<string, MazeBest>>(() => readBest(TIME_KEY));
  const [bestBySize, setBestBySize] = useState<Record<string, MazeBest>>(() => readBest());

  const size = difficultySettings[difficulty].size;
  const ranking = useRanking({ gameId: `maze-escape-${size}`, metricLabel: "Time", mode: "lower" });
  const goalIndex = size * size - 1;
  const currentBest = bestBySize[String(size)];
  const currentTime = timeBySize[String(size)];
  const text = (ja: string, en: string) => isEnglish ? en : ja;
  const messages = {
    idle: text("ランダム迷路を進んで、右下のゴールを目指しましょう。", "Find your way through a random maze to the bottom-right goal."),
    start: text("矢印キー、または画面ボタンで移動できます。", "Move with the arrow keys or on-screen buttons."),
    wall: text("そちらには壁があります。別の道を探しましょう。", "A wall blocks that direction. Try another way."),
    moving: text("いい感じです。ゴールまで進みましょう。", "Keep going toward the goal."),
    clear: result ? text(`脱出成功！${result.moves}手 / ${formatTime(result.seconds)} でした。`, `Escaped! ${result.moves} moves / ${formatTime(result.seconds)}.`) + (result.improved ? text(" ベスト更新！", " New best!") : "") : ""
  };
  const visitedPath = useMemo(() => {
    const visited = new Set<number>();
    visited.add(0);
    return visited;
  }, [maze]);


  const startGame = (nextDifficulty = difficulty) => {
    const nextSize = difficultySettings[nextDifficulty].size;
    setDifficulty(nextDifficulty);
    setMaze(generateMaze(nextSize));
    setPlayerIndex(0);
    setStatus("playing");
    setMoves(0);
    setResult(null);
    resetTimer(true);
    setMessage("start");
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
    const currentTime = timeBySize[key];
    const improvedMoves = !current || nextMoves < current.moves || (nextMoves === current.moves && nextSeconds < current.seconds);
    const improvedTime = !currentTime || nextSeconds < currentTime.seconds || (nextSeconds === currentTime.seconds && nextMoves < currentTime.moves);

    if (improvedMoves) {
      const nextBest = { ...bestBySize, [key]: result };
      setBestBySize(nextBest);
      safeStorage.setItem(BEST_KEY, JSON.stringify(nextBest));
    }

    if (improvedTime) {
      const nextTimes = { ...timeBySize, [key]: result };
      setTimeBySize(nextTimes);
      safeStorage.setItem(TIME_KEY, JSON.stringify(nextTimes));
    }
    setResult({ ...result, improved: improvedMoves || improvedTime });
    setMessage("clear");
    setStatus("cleared");
  };

  const movePlayer = (direction: Direction) => {
    if (status !== "playing") {
      return;
    }

    const currentCell = maze[playerIndex];
    if (currentCell.walls[direction]) {
      setMessage("wall");
      return;
    }

    const row = Math.floor(playerIndex / size);
    const column = playerIndex % size;
    const delta = directionDelta[direction];
    const nextIndex = toIndex(row + delta.row, column + delta.column, size);
    const nextMoves = moves + 1;
    const nextSeconds = nextIndex === goalIndex ? stopTimer() : seconds;

    setPlayerIndex(nextIndex);
    setMoves(nextMoves);
    setMessage("moving");

    if (nextIndex === goalIndex) {
      clearMaze(nextMoves, nextSeconds);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(event.key)) {
        return;
      }

      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]")) return;
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
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestBySize({});
    safeStorage.removeItem(TIME_KEY);
    setTimeBySize({});
  };

  return (
    <section data-native-i18n className="puzzle-shell maze-shell" aria-labelledby="maze-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="maze-title">{text("迷路脱出", "Maze Escape")}</h1>
          <p className="lead">{messages[message]}</p>
        </div>
        <div className="score-panel maze-score" aria-label={text("迷路脱出の状態", "Maze status")}>
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
          <div className="maze-board" style={{ "--maze-size": size } as CSSProperties} aria-label={text("迷路盤面", "Maze board")}>
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

          <div className="maze-controls" aria-label={text("移動ボタン", "Movement controls")}>
            <button type="button" onClick={() => movePlayer("top")} disabled={status !== "playing"} aria-label={text("上へ", "Move up")}>
              <ArrowUp aria-hidden="true" />
            </button>
            <button type="button" onClick={() => movePlayer("left")} disabled={status !== "playing"} aria-label={text("左へ", "Move left")}>
              <ArrowLeft aria-hidden="true" />
            </button>
            <button type="button" onClick={() => movePlayer("bottom")} disabled={status !== "playing"} aria-label={text("下へ", "Move down")}>
              <ArrowDown aria-hidden="true" />
            </button>
            <button type="button" onClick={() => movePlayer("right")} disabled={status !== "playing"} aria-label={text("右へ", "Move right")}>
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>

        <aside className="puzzle-side maze-side">
          <div className="rule-card">
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("左上からスタートし、右下のゴールを目指します。壁のない方向へだけ進めます。矢印キーでも画面ボタンでも操作できます。", "Start at the top left and reach the bottom-right goal. Move through openings using the arrow keys or on-screen buttons.")}
            </p>
          </div>

          <div className="maze-options" aria-label={text("迷路サイズ", "Maze size")}>
            {(Object.keys(difficultySettings) as MazeDifficulty[]).map((level) => (
              <button className={difficulty === level ? "is-selected" : ""} key={level} type="button" onClick={() => startGame(level)}>
                <span>{isEnglish ? ({ small: "Small", normal: "Normal", large: "Large" }[level]) : difficultySettings[level].label}</span>
                <small>{isEnglish ? `${difficultySettings[level].size}×${difficultySettings[level].size} random maze` : difficultySettings[level].description}</small>
              </button>
            ))}
          </div>

          <div className="maze-progress">
            <span>{isEnglish ? "Current" : "現在"}: {status === "playing" ? (isEnglish ? "Exploring" : "探索中") : status === "cleared" ? (isEnglish ? "Escaped" : "脱出成功") : (isEnglish ? "Idle" : "待機中")}</span>
            <span data-maze-best="moves">{text("最短手数", "Fewest moves")}: {currentBest ? text(`${currentBest.moves}手`, `${currentBest.moves} moves`) : text("まだ記録なし", "No record yet")}</span>
            <span data-maze-best="time">{text("最短時間", "Fastest time")}: {currentTime ? formatTime(currentTime.seconds) : text("まだ記録なし", "No record yet")}</span>
            <small>{text("最短時間はこの更新以降のプレイから記録します。迷路は毎回ランダムです。", "Time records start with this update. A new random maze is generated for each game.")}</small>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={result ? { score: result.seconds, display: formatTime(result.seconds), meta: text(`${result.size}×${result.size} / ${result.moves}手`, `${result.size}×${result.size} / ${result.moves} moves`) } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startGame()}>
              <Sparkles aria-hidden="true" />
              {text("新しく始める", "New game")}
            </button>
            <button className="ghost-button" type="button" onClick={resetBest}>
              <RotateCcw aria-hidden="true" />
              {text("ベスト削除", "Reset best records")}
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
