import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Ball, Brick, BreakoutResult, BreakoutStatus } from "./types";

type BreakoutProps = {
  onBack: () => void;
};

const BOARD_WIDTH = 640;
const BOARD_HEIGHT = 420;
const PADDLE_WIDTH = 96;
const PADDLE_HEIGHT = 14;
const PADDLE_Y = 380;
const BALL_SIZE = 14;
const PADDLE_SPEED = 18;
const INITIAL_LIVES = 3;
const BEST_KEY = "game-shelf-breakout-best";

const initialBall: Ball = {
  x: BOARD_WIDTH / 2 - BALL_SIZE / 2,
  y: 324,
  vx: 4.2,
  vy: -4.8
};

function readBestResult(): BreakoutResult | null {
  const stored = window.localStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as BreakoutResult) : null;
}

function createBricks(): Brick[] {
  const colors = ["#ff7d7d", "#ffcf6d", "#72efff", "#9df08a", "#c99cff"];
  const rows = 5;
  const cols = 8;
  const gap = 8;
  const width = 64;
  const height = 22;
  const offsetX = (BOARD_WIDTH - cols * width - (cols - 1) * gap) / 2;
  const offsetY = 44;

  return Array.from({ length: rows * cols }, (_, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
      id: `${row}-${col}`,
      x: offsetX + col * (width + gap),
      y: offsetY + row * (height + gap),
      width,
      height,
      alive: true,
      color: colors[row % colors.length]
    };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function overlaps(ball: Ball, brick: Brick) {
  return (
    ball.x < brick.x + brick.width &&
    ball.x + BALL_SIZE > brick.x &&
    ball.y < brick.y + brick.height &&
    ball.y + BALL_SIZE > brick.y
  );
}

export function Breakout({ onBack }: BreakoutProps) {
  const [status, setStatus] = useState<BreakoutStatus>("idle");
  const [ball, setBall] = useState<Ball>(initialBall);
  const [paddleX, setPaddleX] = useState((BOARD_WIDTH - PADDLE_WIDTH) / 2);
  const [bricks, setBricks] = useState<Brick[]>(() => createBricks());
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [message, setMessage] = useState("スタートを押して、パドルでボールを打ち返しましょう。");
  const [bestResult, setBestResult] = useState<BreakoutResult | null>(() => readBestResult());

  const statusRef = useRef(status);
  const ballRef = useRef(ball);
  const paddleXRef = useRef(paddleX);
  const bricksRef = useRef(bricks);
  const livesRef = useRef(lives);
  const moveLeftRef = useRef(false);
  const moveRightRef = useRef(false);

  const clearedBricks = useMemo(() => bricks.filter((brick) => !brick.alive).length, [bricks]);
  const score = clearedBricks * 100 + lives * 50;

  const releasePaddleControls = () => {
    moveLeftRef.current = false;
    moveRightRef.current = false;
  };

  useEffect(() => {
    statusRef.current = status;

    if (status !== "playing") {
      releasePaddleControls();
    }
  }, [status]);

  useEffect(() => {
    ballRef.current = ball;
  }, [ball]);

  useEffect(() => {
    paddleXRef.current = paddleX;
  }, [paddleX]);

  useEffect(() => {
    bricksRef.current = bricks;
  }, [bricks]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  const saveBest = (nextStatus: BreakoutStatus, finalBricks: Brick[], finalLives: number) => {
    const result: BreakoutResult = {
      score: finalBricks.filter((brick) => !brick.alive).length * 100 + finalLives * 50,
      clearedBricks: finalBricks.filter((brick) => !brick.alive).length,
      lives: finalLives,
      recordedAt: new Date().toISOString()
    };

    if (nextStatus === "cleared" || nextStatus === "finished") {
      if (!bestResult || result.score > bestResult.score) {
        setBestResult(result);
        window.localStorage.setItem(BEST_KEY, JSON.stringify(result));
      }
    }
  };

  const resetBall = (nextLives: number) => {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const nextBall = { ...initialBall, vx: 4.2 * direction };

    setBall(nextBall);
    ballRef.current = nextBall;
    setPaddleX((BOARD_WIDTH - PADDLE_WIDTH) / 2);
    paddleXRef.current = (BOARD_WIDTH - PADDLE_WIDTH) / 2;

    if (nextLives <= 0) {
      releasePaddleControls();
      setStatus("finished");
      setMessage("ゲームオーバー。角度をつけて打ち返すと崩しやすくなります。");
      saveBest("finished", bricksRef.current, 0);
      return;
    }

    releasePaddleControls();
    setStatus("paused");
    setMessage("ボールを落としました。再開ボタンで続きから遊べます。");
  };

  const movePaddleBy = (delta: number) => {
    const nextPaddleX = clamp(paddleXRef.current + delta, 0, BOARD_WIDTH - PADDLE_WIDTH);
    paddleXRef.current = nextPaddleX;
    setPaddleX(nextPaddleX);
  };

  const tick = () => {
    if (statusRef.current !== "playing") {
      return;
    }

    let nextPaddleX = paddleXRef.current;

    if (moveLeftRef.current) {
      nextPaddleX -= PADDLE_SPEED;
    }

    if (moveRightRef.current) {
      nextPaddleX += PADDLE_SPEED;
    }

    nextPaddleX = clamp(nextPaddleX, 0, BOARD_WIDTH - PADDLE_WIDTH);
    paddleXRef.current = nextPaddleX;
    setPaddleX(nextPaddleX);

    const currentBall = ballRef.current;
    let nextBall: Ball = {
      ...currentBall,
      x: currentBall.x + currentBall.vx,
      y: currentBall.y + currentBall.vy
    };

    if (nextBall.x <= 0 || nextBall.x + BALL_SIZE >= BOARD_WIDTH) {
      nextBall.vx *= -1;
      nextBall.x = clamp(nextBall.x, 0, BOARD_WIDTH - BALL_SIZE);
    }

    if (nextBall.y <= 0) {
      nextBall.vy = Math.abs(nextBall.vy);
      nextBall.y = 0;
    }

    const hitsPaddle =
      nextBall.y + BALL_SIZE >= PADDLE_Y &&
      nextBall.y <= PADDLE_Y + PADDLE_HEIGHT &&
      nextBall.x + BALL_SIZE >= nextPaddleX &&
      nextBall.x <= nextPaddleX + PADDLE_WIDTH &&
      nextBall.vy > 0;

    if (hitsPaddle) {
      const ballCenter = nextBall.x + BALL_SIZE / 2;
      const paddleCenter = nextPaddleX + PADDLE_WIDTH / 2;
      const offset = (ballCenter - paddleCenter) / (PADDLE_WIDTH / 2);
      nextBall.vx = clamp(offset * 5.8, -6.2, 6.2);
      nextBall.vy = -Math.abs(nextBall.vy) - 0.04;
      nextBall.y = PADDLE_Y - BALL_SIZE;
    }

    const hitBrick = bricksRef.current.find((brick) => brick.alive && overlaps(nextBall, brick));

    if (hitBrick) {
      const nextBricks = bricksRef.current.map((brick) =>
        brick.id === hitBrick.id ? { ...brick, alive: false } : brick
      );
      nextBall.vy *= -1;
      bricksRef.current = nextBricks;
      setBricks(nextBricks);
      setMessage("ブロック破壊！ボールを落とさずに続けましょう。");

      if (nextBricks.every((brick) => !brick.alive)) {
        releasePaddleControls();
        setStatus("cleared");
        setMessage("全ブロック破壊！お見事です。");
        saveBest("cleared", nextBricks, livesRef.current);
      }
    }

    if (nextBall.y > BOARD_HEIGHT) {
      const nextLives = livesRef.current - 1;
      livesRef.current = nextLives;
      setLives(nextLives);
      resetBall(nextLives);
      return;
    }

    ballRef.current = nextBall;
    setBall(nextBall);
  };

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const timerId = window.setInterval(tick, 16);

    return () => {
      window.clearInterval(timerId);
    };
  }, [status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        event.preventDefault();
        moveLeftRef.current = true;
        movePaddleBy(-PADDLE_SPEED);
      }

      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        event.preventDefault();
        moveRightRef.current = true;
        movePaddleBy(PADDLE_SPEED);
      }

      if (event.key === " ") {
        event.preventDefault();

        if (statusRef.current === "playing") {
          releasePaddleControls();
          setStatus("paused");
          setMessage("一時停止中。スペースキーまたは再開ボタンで続けられます。");
        } else if (statusRef.current === "paused") {
          setStatus("playing");
          setMessage("再開しました。ボールの角度をよく見ましょう。");
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        moveLeftRef.current = false;
      }

      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        moveRightRef.current = false;
      }
    };

    const handleRelease = () => {
      releasePaddleControls();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        releasePaddleControls();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleRelease);
    window.addEventListener("mouseup", handleRelease);
    window.addEventListener("pointerup", handleRelease);
    window.addEventListener("touchend", handleRelease);
    window.addEventListener("touchcancel", handleRelease);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleRelease);
      window.removeEventListener("mouseup", handleRelease);
      window.removeEventListener("pointerup", handleRelease);
      window.removeEventListener("touchend", handleRelease);
      window.removeEventListener("touchcancel", handleRelease);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const startGame = () => {
    const nextBricks = createBricks();

    setStatus("playing");
    setBall(initialBall);
    setPaddleX((BOARD_WIDTH - PADDLE_WIDTH) / 2);
    setBricks(nextBricks);
    setLives(INITIAL_LIVES);
    setMessage("左右キーまたはA/Dでパドルを動かし、ボールを打ち返しましょう。");
    releasePaddleControls();
    ballRef.current = initialBall;
    paddleXRef.current = (BOARD_WIDTH - PADDLE_WIDTH) / 2;
    bricksRef.current = nextBricks;
    livesRef.current = INITIAL_LIVES;
  };

  const togglePause = () => {
    if (status === "playing") {
      releasePaddleControls();
      setStatus("paused");
      setMessage("一時停止中。再開ボタンで続けられます。");
      return;
    }

    if (status === "paused") {
      setStatus("playing");
      setMessage("再開しました。ボールの角度をよく見ましょう。");
    }
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  return (
    <section className="puzzle-shell breakout-shell" aria-labelledby="breakout-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">ARCADE / INTERNAL GAME</p>
          <h1 id="breakout-title">ブロック崩し</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel breakout-stats" aria-label="ブロック崩しの状態">
          <div>
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>Lives</span>
            <strong>{lives}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout breakout-layout">
        <div className={`breakout-board-wrap is-${status}`}>
          <div className="breakout-board" aria-label="ブロック崩し盤面">
            {bricks.map((brick) => (
              <span
                className={`breakout-brick${brick.alive ? "" : " is-broken"}`}
                key={brick.id}
                style={{
                  left: `${(brick.x / BOARD_WIDTH) * 100}%`,
                  top: `${(brick.y / BOARD_HEIGHT) * 100}%`,
                  width: `${(brick.width / BOARD_WIDTH) * 100}%`,
                  height: `${(brick.height / BOARD_HEIGHT) * 100}%`,
                  background: brick.color
                }}
              />
            ))}
            <span
              className="breakout-ball"
              style={{
                left: `${(ball.x / BOARD_WIDTH) * 100}%`,
                top: `${(ball.y / BOARD_HEIGHT) * 100}%`
              }}
            />
            <span
              className="breakout-paddle"
              style={{
                left: `${(paddleX / BOARD_WIDTH) * 100}%`,
                top: `${(PADDLE_Y / BOARD_HEIGHT) * 100}%`,
                width: `${(PADDLE_WIDTH / BOARD_WIDTH) * 100}%`
              }}
            />
          </div>
          {status !== "playing" && (
            <div className="breakout-overlay">
              <Play aria-hidden="true" />
              <p>{status === "cleared" ? "CLEAR" : status === "finished" ? "GAME OVER" : status === "paused" ? "PAUSED" : "READY"}</p>
            </div>
          )}
        </div>

        <aside className="puzzle-side breakout-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              左右キーまたはA/Dでパドルを動かし、ボールを落とさないように跳ね返します。すべてのブロックを壊すとクリアです。
            </p>
          </div>

          <div className="breakout-progress">
            <span>破壊: {clearedBricks}/{bricks.length}</span>
            <span>残機: {lives}</span>
            <span>状態: {status === "playing" ? "プレイ中" : status === "paused" ? "一時停止" : status === "cleared" ? "クリア" : status === "finished" ? "終了" : "待機中"}</span>
          </div>

          <div className="breakout-controls" aria-label="パドル操作">
            <button
              type="button"
              onMouseDown={() => {
                moveLeftRef.current = true;
                movePaddleBy(-PADDLE_SPEED);
              }}
              onClick={() => movePaddleBy(-PADDLE_SPEED)}
              onMouseUp={() => {
                releasePaddleControls();
              }}
              onMouseLeave={() => {
                moveLeftRef.current = false;
              }}
              onTouchStart={() => {
                moveLeftRef.current = true;
                movePaddleBy(-PADDLE_SPEED);
              }}
              onTouchEnd={() => {
                releasePaddleControls();
              }}
            >
              <ChevronLeft aria-hidden="true" />
              左
            </button>
            <button
              type="button"
              onMouseDown={() => {
                moveRightRef.current = true;
                movePaddleBy(PADDLE_SPEED);
              }}
              onClick={() => movePaddleBy(PADDLE_SPEED)}
              onMouseUp={() => {
                releasePaddleControls();
              }}
              onMouseLeave={() => {
                moveRightRef.current = false;
              }}
              onTouchStart={() => {
                moveRightRef.current = true;
                movePaddleBy(PADDLE_SPEED);
              }}
              onTouchEnd={() => {
                releasePaddleControls();
              }}
            >
              右
              <ChevronRight aria-hidden="true" />
            </button>
          </div>

          <div className="breakout-best">
            <h2>ベスト</h2>
            {bestResult ? (
              <p>
                {bestResult.score}点 / 破壊{bestResult.clearedBricks}個 / 残機{bestResult.lives}
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
