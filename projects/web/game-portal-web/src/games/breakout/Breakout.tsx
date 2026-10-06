import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { safeStorage } from "../../safeStorage";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { useLocalizedMessage } from "../useLocalizedMessage";
import { isPlainRecord, readSavedProgress } from "../savedProgress";
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
const PROGRESS_KEY = "game-shelf-progress-breakout-v1";

const initialBall: Ball = {
  x: BOARD_WIDTH / 2 - BALL_SIZE / 2,
  y: 324,
  vx: 4.2,
  vy: -4.8
};

function readBestResult(): BreakoutResult | null {
  const stored = safeStorage.getItem(BEST_KEY);
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

type BreakoutProgress = {
  version: 1;
  ball: Ball;
  paddleX: number;
  bricks: Brick[];
  lives: number;
};

function isBreakoutProgress(value: unknown): value is BreakoutProgress {
  if (!isPlainRecord(value) || value.version !== 1 || !isPlainRecord(value.ball) ||
      !Array.isArray(value.bricks) || value.bricks.length !== 40 ||
      !Number.isFinite(value.paddleX) || (value.paddleX as number) < 0 || (value.paddleX as number) > BOARD_WIDTH - PADDLE_WIDTH ||
      !Number.isInteger(value.lives) || (value.lives as number) < 1 || (value.lives as number) > INITIAL_LIVES) {
    return false;
  }
  const ball = value.ball;
  if (!Number.isFinite(ball.x) || !Number.isFinite(ball.y) || !Number.isFinite(ball.vx) || !Number.isFinite(ball.vy) ||
      (ball.x as number) < -BALL_SIZE || (ball.x as number) > BOARD_WIDTH ||
      (ball.y as number) < 0 || (ball.y as number) > BOARD_HEIGHT ||
      Math.abs(ball.vx as number) > 15 || Math.abs(ball.vy as number) > 15 || (ball.vy as number) === 0) {
    return false;
  }
  const layout = createBricks();
  return value.bricks.some((brick) => isPlainRecord(brick) && brick.alive === true) &&
    value.bricks.every((brick, index) => isPlainRecord(brick) &&
      brick.id === layout[index].id && brick.x === layout[index].x && brick.y === layout[index].y &&
      brick.width === layout[index].width && brick.height === layout[index].height && brick.color === layout[index].color &&
      (brick.alive === true || brick.alive === false));
}

export function Breakout({ onBack }: BreakoutProps) {
  const [savedGame] = useState(() => readSavedProgress(PROGRESS_KEY, isBreakoutProgress));
  const { language } = useI18n();
  const isEnglish = language === "en";
  const text = (ja: string, en: string) => isEnglish ? en : ja;
  const confirmRecordReset = useConfirmRecordReset();
  const [status, setStatus] = useState<BreakoutStatus>(savedGame ? "paused" : "idle");
  const [ball, setBall] = useState<Ball>(savedGame?.ball ?? initialBall);
  const [paddleX, setPaddleX] = useState(savedGame?.paddleX ?? (BOARD_WIDTH - PADDLE_WIDTH) / 2);
  const [bricks, setBricks] = useState<Brick[]>(() => savedGame?.bricks ?? createBricks());
  const [lives, setLives] = useState(savedGame?.lives ?? INITIAL_LIVES);
  const [message, setMessage] = useLocalizedMessage(savedGame ? "プレイを復元しました。再開ボタンで続けられます。" : "スタートを押して、パドルでボールを打ち返しましょう。", savedGame ? "Run restored. Press Resume to continue." : "Press Start and bounce the ball with your paddle.");
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
  const ranking = useRanking({ gameId: "breakout-score", metricLabel: "Score", mode: "higher" });

  const releasePaddleControls = () => {
    moveLeftRef.current = false;
    moveRightRef.current = false;
  };

  useEffect(() => {
    const save = () => safeStorage.setItem(PROGRESS_KEY, JSON.stringify({
      version: 1, ball: ballRef.current, paddleX: paddleXRef.current,
      bricks: bricksRef.current, lives: livesRef.current
    } satisfies BreakoutProgress));
    if (status === "playing") {
      const timerId = window.setInterval(save, 500);
      window.addEventListener("pagehide", save);
      return () => {
        save();
        window.clearInterval(timerId);
        window.removeEventListener("pagehide", save);
      };
    }
    if (status === "paused") save();
    if (status === "finished" || status === "cleared") safeStorage.removeItem(PROGRESS_KEY);
  }, [status]);

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
        safeStorage.setItem(BEST_KEY, JSON.stringify(result));
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
      setMessage("ゲームオーバー。角度をつけて打ち返すと崩しやすくなります。", "Game over. Angle your shots to reach more bricks.");
      saveBest("finished", bricksRef.current, 0);
      return;
    }

    releasePaddleControls();
    setStatus("paused");
    setMessage("ボールを落としました。再開ボタンで続きから遊べます。", "You lost a ball. Press Resume to continue.");
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
      setMessage("ブロック破壊！ボールを落とさずに続けましょう。", "Brick destroyed! Keep the ball in play.");

      if (nextBricks.every((brick) => !brick.alive)) {
        releasePaddleControls();
        setStatus("cleared");
        setMessage("全ブロック破壊！お見事です。", "All bricks cleared! Great work.");
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
      const target = event.target;
      if (event.isComposing || (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, button")))) return;
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
          setMessage("一時停止中。スペースキーまたは再開ボタンで続けられます。", "Paused. Press Space or Resume to continue.");
        } else if (statusRef.current === "paused") {
          setStatus("playing");
          setMessage("再開しました。ボールの角度をよく見ましょう。", "Resumed. Watch the ball's angle.");
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
    safeStorage.removeItem(PROGRESS_KEY);
    const nextBricks = createBricks();

    setStatus("playing");
    setBall(initialBall);
    setPaddleX((BOARD_WIDTH - PADDLE_WIDTH) / 2);
    setBricks(nextBricks);
    setLives(INITIAL_LIVES);
    setMessage("左右キーまたはA/Dでパドルを動かし、ボールを打ち返しましょう。", "Move the paddle with Left/Right or A/D and return the ball.");
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
      setMessage("一時停止中。再開ボタンで続けられます。", "Paused. Press Space or Resume to continue.");
      return;
    }

    if (status === "paused") {
      setStatus("playing");
      setMessage("再開しました。ボールの角度をよく見ましょう。", "Resumed. Watch the ball's angle.");
    }
  };

  const resetBest = () => {
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  return (
    <section className="puzzle-shell breakout-shell" aria-labelledby="breakout-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">ARCADE / INTERNAL GAME</p>
          <h1 id="breakout-title">{text("ブロック崩し", "Breakout")}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel breakout-stats" aria-label={text("ブロック崩しの状態", "Breakout status")}>
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
          <div className="breakout-board" aria-label={text("ブロック崩し盤面", "Breakout board")}>
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
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("左右キーまたはA/Dでパドルを動かし、ボールを落とさないように跳ね返します。すべてのブロックを壊すとクリアです。",
                "Move the paddle with Left/Right or A/D and keep the ball in play. Clear all bricks to win.")}
            </p>
          </div>

          <div className="breakout-progress">
            <span>{text("破壊", "Bricks")}: {clearedBricks}/{bricks.length}</span>
            <span>{text("残機", "Lives")}: {lives}</span>
            <span>{text("状態", "Status")}: {status === "playing" ? text("プレイ中", "Playing") : status === "paused" ? text("一時停止", "Paused") : status === "cleared" ? text("クリア", "Cleared") : status === "finished" ? text("終了", "Finished") : text("待機中", "Ready")}</span>
          </div>

          <div className="breakout-controls" aria-label={text("パドル操作", "Paddle controls")}>
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
              {text("左", "Left")}
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
              {text("右", "Right")}
              <ChevronRight aria-hidden="true" />
            </button>
          </div>

          <div className="breakout-best">
            <h2>{text("ベスト", "Best")}</h2>
            {bestResult ? (
              <p>
                {text(`${bestResult.score}点 / 破壊${bestResult.clearedBricks}個 / 残機${bestResult.lives}`, `${bestResult.score} pts / ${bestResult.clearedBricks} bricks / ${bestResult.lives} lives`)}
              </p>
            ) : (
              <p>{text("まだ記録がありません。", "No record yet.")}</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "cleared" || status === "finished" ? { score, display: text(`${score}点`, `${score} pts`), meta: text(`破壊${clearedBricks}個 / 残機${lives}`, `${clearedBricks} bricks / ${lives} lives`) } : null}
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
