import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { safeStorage } from "../../safeStorage";
import { Apple, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { useLocalizedMessage } from "../useLocalizedMessage";
import type { Direction, Point, SnakeResult, SnakeStatus } from "./types";

type SnakeGameProps = {
  onBack: () => void;
};

const BOARD_SIZE = 18;
const TICK_MS = 135;
const BEST_KEY = "game-shelf-snake-best";

const INITIAL_SNAKE: Point[] = [
  { x: 8, y: 9 },
  { x: 7, y: 9 },
  { x: 6, y: 9 }
];

const INITIAL_FOOD: Point = { x: 13, y: 9 };

const directionVectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const oppositeDirections: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

function readBestResult(): SnakeResult | null {
  const stored = safeStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as SnakeResult) : null;
}

function isSamePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function createFood(snake: Point[]): Point {
  const emptyCells: Point[] = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const point = { x, y };

      if (!snake.some((segment) => isSamePoint(segment, point))) {
        emptyCells.push(point);
      }
    }
  }

  return emptyCells[Math.floor(Math.random() * emptyCells.length)] ?? INITIAL_FOOD;
}

function calculateScore(apples: number, length: number) {
  return apples * 120 + Math.max(0, length - INITIAL_SNAKE.length) * 30;
}

export function SnakeGame({ onBack }: SnakeGameProps) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const text = (ja: string, en: string) => isEnglish ? en : ja;
  const confirmRecordReset = useConfirmRecordReset();
  const [status, setStatus] = useState<SnakeStatus>("idle");
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>(INITIAL_FOOD);
  const [direction, setDirection] = useState<Direction>("right");
  const [apples, setApples] = useState(0);
  const [message, setMessage] = useLocalizedMessage("スタートを押して、ヘビを操作しましょう。矢印キーまたはWASDで移動できます。", "Press Start, then steer the snake with the arrow keys or WASD.");
  const [bestResult, setBestResult] = useState<SnakeResult | null>(() => readBestResult());

  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const directionRef = useRef(direction);
  const pendingDirectionRef = useRef<Direction | null>(null);
  const statusRef = useRef(status);
  const applesRef = useRef(apples);

  const score = useMemo(() => calculateScore(apples, snake.length), [apples, snake.length]);
  const ranking = useRanking({ gameId: "snake-score", metricLabel: "Score", mode: "higher" });

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    applesRef.current = apples;
  }, [apples]);

  const finishGame = (finalSnake: Point[], finalApples: number) => {
    const result: SnakeResult = {
      score: calculateScore(finalApples, finalSnake.length),
      apples: finalApples,
      length: finalSnake.length,
      recordedAt: new Date().toISOString()
    };

    setStatus("finished");
    setMessage("ゲームオーバー。壁や自分にぶつからないルートを探して、もう一度挑戦しましょう。", "Game over. Avoid the walls and your own body on the next run.");

    if (!bestResult || result.score > bestResult.score) {
      setBestResult(result);
      safeStorage.setItem(BEST_KEY, JSON.stringify(result));
    }
  };

  const moveSnake = () => {
    if (statusRef.current !== "playing") {
      return;
    }

    const currentSnake = snakeRef.current;
    const currentFood = foodRef.current;
    if (pendingDirectionRef.current !== null) {
      directionRef.current = pendingDirectionRef.current;
      pendingDirectionRef.current = null;
      setDirection(directionRef.current);
    }
    const vector = directionVectors[directionRef.current];
    const head = currentSnake[0];
    const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
    const ateFood = isSamePoint(nextHead, currentFood);
    const nextSnake = ateFood ? [nextHead, ...currentSnake] : [nextHead, ...currentSnake.slice(0, -1)];
    const hitWall = nextHead.x < 0 || nextHead.x >= BOARD_SIZE || nextHead.y < 0 || nextHead.y >= BOARD_SIZE;
    const hitSelf = currentSnake.some((segment, index) => {
      if (!ateFood && index === currentSnake.length - 1) {
        return false;
      }

      return isSamePoint(segment, nextHead);
    });

    if (hitWall || hitSelf) {
      finishGame(currentSnake, applesRef.current);
      return;
    }

    setSnake(nextSnake);

    if (ateFood) {
      const nextApples = applesRef.current + 1;
      const nextFood = createFood(nextSnake);
      setApples(nextApples);
      setFood(nextFood);
      setMessage(nextApples >= 8 ? `${nextApples}個目のリンゴ！かなり伸びてきました。` : "リンゴを獲得。さらに伸ばしましょう。", nextApples >= 8 ? `Apple ${nextApples}! Your snake is getting long.` : "Apple collected. Keep growing!");
    }
  };

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const timerId = window.setInterval(moveSnake, TICK_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [status]);

  const changeDirection = (nextDirection: Direction) => {
    if (statusRef.current !== "playing" || pendingDirectionRef.current !== null ||
        nextDirection === directionRef.current || oppositeDirections[directionRef.current] === nextDirection) {
      return;
    }

    pendingDirectionRef.current = nextDirection;
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.isComposing || (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, button")))) return;
      const keyMap: Record<string, Direction | undefined> = {
        ArrowUp: "up",
        w: "up",
        W: "up",
        ArrowDown: "down",
        s: "down",
        S: "down",
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right"
      };
      const nextDirection = keyMap[event.key];

      if (!nextDirection) {
        if (event.key === " " && statusRef.current === "playing") {
          event.preventDefault();
          setStatus("paused");
          setMessage("一時停止中。再開ボタンで続きから遊べます。", "Paused. Press Space or Resume to continue.");
        } else if (event.key === " " && statusRef.current === "paused") {
          event.preventDefault();
          setStatus("playing");
          setMessage("再開しました。次のリンゴを狙いましょう。", "Resumed. Go for the next apple.");
        }

        return;
      }

      event.preventDefault();
      changeDirection(nextDirection);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const startGame = () => {
    const nextSnake = INITIAL_SNAKE.map((segment) => ({ ...segment }));
    const nextFood = INITIAL_FOOD;

    setStatus("playing");
    setSnake(nextSnake);
    setFood(nextFood);
    setDirection("right");
    setApples(0);
    setMessage("リンゴを集めてヘビを伸ばしましょう。壁と自分の体には注意。", "Collect apples to grow. Avoid walls and your own body.");
    snakeRef.current = nextSnake;
    foodRef.current = nextFood;
    directionRef.current = "right";
    pendingDirectionRef.current = null;
    statusRef.current = "playing";
    applesRef.current = 0;
  };

  const togglePause = () => {
    if (status === "playing") {
      setStatus("paused");
      setMessage("一時停止中。再開ボタンで続きから遊べます。", "Paused. Press Space or Resume to continue.");
      return;
    }

    if (status === "paused") {
      setStatus("playing");
      setMessage("再開しました。次のリンゴを狙いましょう。", "Resumed. Go for the next apple.");
    }
  };

  const resetBest = () => {
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  const cells = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
    const point = { x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) };
    const snakeIndex = snake.findIndex((segment) => isSamePoint(segment, point));
    const isFood = isSamePoint(food, point);
    const className = [
      "snake-cell",
      snakeIndex === 0 ? "is-head" : "",
      snakeIndex > 0 ? "is-body" : "",
      isFood ? "is-food" : ""
    ]
      .filter(Boolean)
      .join(" ");

    return <span className={className} key={`${point.x}-${point.y}`} />;
  });

  return (
    <section className="puzzle-shell snake-shell" aria-labelledby="snake-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">ARCADE / INTERNAL GAME</p>
          <h1 id="snake-title">{text("スネーク", "Snake")}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel snake-stats" aria-label={text("スネークの状態", "Snake status")}>
          <div>
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>Length</span>
            <strong>{snake.length}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout snake-layout">
        <div className={`snake-board-wrap is-${status}`}>
          <div className="snake-board" aria-label={text("スネーク盤面", "Snake board")}>
            {cells}
          </div>
          {status !== "playing" && (
            <div className="snake-overlay">
              <Apple aria-hidden="true" />
              <p>{status === "paused" ? "PAUSED" : status === "finished" ? "GAME OVER" : "READY"}</p>
            </div>
          )}
        </div>

        <aside className="puzzle-side snake-side">
          <div className="rule-card">
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("矢印キーまたはWASDでヘビを操作します。リンゴを取ると体が伸びてスコアアップ。壁や自分の体にぶつかるとゲームオーバーです。",
                "Steer with the arrow keys or WASD. Apples grow the snake and increase your score. Hitting a wall or your body ends the game.")}
            </p>
          </div>

          <div className="snake-progress">
            <span>{text("リンゴ", "Apples")}: {apples}</span>
            <span>{text("長さ", "Length")}: {snake.length}</span>
            <span>{text("方向", "Direction")}: {direction.toUpperCase()}</span>
            <span>{text("状態", "Status")}: {status === "playing" ? text("プレイ中", "Playing") : status === "paused" ? text("一時停止", "Paused") : status === "finished" ? text("終了", "Finished") : text("待機中", "Ready")}</span>
          </div>

          <div className="snake-controls" aria-label={text("方向操作", "Direction controls")}>
            <button type="button" aria-label={text("上", "Up")} onClick={() => changeDirection("up")}>↑</button>
            <button type="button" aria-label={text("左", "Left")} onClick={() => changeDirection("left")}>←</button>
            <button type="button" aria-label={text("下", "Down")} onClick={() => changeDirection("down")}>↓</button>
            <button type="button" aria-label={text("右", "Right")} onClick={() => changeDirection("right")}>→</button>
          </div>

          <div className="snake-best">
            <h2>{text("ベスト", "Best")}</h2>
            {bestResult ? (
              <p>
                {text(`${bestResult.score}点 / リンゴ${bestResult.apples}個 / 長さ${bestResult.length}`, `${bestResult.score} pts / ${bestResult.apples} apples / length ${bestResult.length}`)}
              </p>
            ) : (
              <p>{text("まだ記録がありません。", "No record yet.")}</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score, display: text(`${score}点`, `${score} pts`), meta: text(`リンゴ${apples}個 / 長さ${snake.length}`, `${apples} apples / length ${snake.length}`) } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startGame}>
              <Play aria-hidden="true" />
              {text("挑戦", "Start")}
            </button>
            <button className="ghost-button" type="button" onClick={togglePause} disabled={status !== "playing" && status !== "paused"}>
              <Pause aria-hidden="true" />
              {status === "paused" ? text("再開", "Resume") : text("停止", "Pause")}
            </button>
            <button className="ghost-button" type="button" onClick={resetBest}>
              <RotateCcw aria-hidden="true" />
              {text("ベスト削除", "Clear best")}
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
