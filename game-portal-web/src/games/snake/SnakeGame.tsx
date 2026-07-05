import { Apple, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const stored = window.localStorage.getItem(BEST_KEY);
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
  const [status, setStatus] = useState<SnakeStatus>("idle");
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>(INITIAL_FOOD);
  const [direction, setDirection] = useState<Direction>("right");
  const [apples, setApples] = useState(0);
  const [message, setMessage] = useState("スタートを押して、ヘビを操作しましょう。矢印キーまたはWASDで移動できます。");
  const [bestResult, setBestResult] = useState<SnakeResult | null>(() => readBestResult());

  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const directionRef = useRef(direction);
  const statusRef = useRef(status);
  const applesRef = useRef(apples);

  const score = useMemo(() => calculateScore(apples, snake.length), [apples, snake.length]);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

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
    setMessage("ゲームオーバー。壁や自分にぶつからないルートを探して、もう一度挑戦しましょう。");

    if (!bestResult || result.score > bestResult.score) {
      setBestResult(result);
      window.localStorage.setItem(BEST_KEY, JSON.stringify(result));
    }
  };

  const moveSnake = () => {
    if (statusRef.current !== "playing") {
      return;
    }

    const currentSnake = snakeRef.current;
    const currentFood = foodRef.current;
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
      setMessage(nextApples >= 8 ? `${nextApples}個目のリンゴ！かなり伸びてきました。` : "リンゴを獲得。さらに伸ばしましょう。");
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
    if (oppositeDirections[directionRef.current] === nextDirection) {
      return;
    }

    directionRef.current = nextDirection;
    setDirection(nextDirection);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
          setMessage("一時停止中。再開ボタンで続きから遊べます。");
        } else if (event.key === " " && statusRef.current === "paused") {
          event.preventDefault();
          setStatus("playing");
          setMessage("再開しました。次のリンゴを狙いましょう。");
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
    setMessage("リンゴを集めてヘビを伸ばしましょう。壁と自分の体には注意。");
    snakeRef.current = nextSnake;
    foodRef.current = nextFood;
    directionRef.current = "right";
    applesRef.current = 0;
  };

  const togglePause = () => {
    if (status === "playing") {
      setStatus("paused");
      setMessage("一時停止中。再開ボタンで続きから遊べます。");
      return;
    }

    if (status === "paused") {
      setStatus("playing");
      setMessage("再開しました。次のリンゴを狙いましょう。");
    }
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
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
    <section className="puzzle-shell snake-shell" aria-labelledby="snake-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">ARCADE / INTERNAL GAME</p>
          <h1 id="snake-title">スネーク</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel snake-stats" aria-label="スネークの状態">
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
          <div className="snake-board" aria-label="スネーク盤面">
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
            <h2>遊び方</h2>
            <p>
              矢印キーまたはWASDでヘビを操作します。リンゴを取ると体が伸びてスコアアップ。壁や自分の体にぶつかるとゲームオーバーです。
            </p>
          </div>

          <div className="snake-progress">
            <span>リンゴ: {apples}</span>
            <span>長さ: {snake.length}</span>
            <span>方向: {direction.toUpperCase()}</span>
            <span>状態: {status === "playing" ? "プレイ中" : status === "paused" ? "一時停止" : status === "finished" ? "終了" : "待機中"}</span>
          </div>

          <div className="snake-controls" aria-label="方向操作">
            <button type="button" onClick={() => changeDirection("up")}>↑</button>
            <button type="button" onClick={() => changeDirection("left")}>←</button>
            <button type="button" onClick={() => changeDirection("down")}>↓</button>
            <button type="button" onClick={() => changeDirection("right")}>→</button>
          </div>

          <div className="snake-best">
            <h2>ベスト</h2>
            {bestResult ? (
              <p>
                {bestResult.score}点 / リンゴ{bestResult.apples}個 / 長さ{bestResult.length}
              </p>
            ) : (
              <p>まだ記録がありません。</p>
            )}
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={startGame}>
              <Play aria-hidden="true" />
              挑戦
            </button>
            <button className="ghost-button" type="button" onClick={togglePause} disabled={status !== "playing" && status !== "paused"}>
              <Pause aria-hidden="true" />
              {status === "paused" ? "再開" : "停止"}
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
