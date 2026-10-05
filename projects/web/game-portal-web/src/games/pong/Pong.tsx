import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { safeStorage } from "../../safeStorage";
import { ChevronDown, ChevronUp, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { useLocalizedMessage } from "../useLocalizedMessage";
import type { PongBall, PongDifficulty, PongResult, PongStatus } from "./types";

type PongProps = {
  onBack: () => void;
};

const BOARD_WIDTH = 640;
const BOARD_HEIGHT = 420;
const PADDLE_WIDTH = 14;
const PADDLE_HEIGHT = 86;
const PLAYER_X = 34;
const CPU_X = BOARD_WIDTH - PLAYER_X - PADDLE_WIDTH;
const BALL_SIZE = 14;
const PADDLE_SPEED = 7.8;
const WIN_SCORE = 5;
const BEST_KEY = "game-shelf-pong-best";

const difficultySettings: Record<
  PongDifficulty,
  {
    label: string;
    cpuSpeed: number;
    reaction: number;
    error: number;
  }
> = {
  easy: {
    label: "やさしい",
    cpuSpeed: 3.2,
    reaction: 0.72,
    error: 34
  },
  normal: {
    label: "ふつう",
    cpuSpeed: 4.2,
    reaction: 0.86,
    error: 18
  },
  hard: {
    label: "むずかしい",
    cpuSpeed: 5.3,
    reaction: 1,
    error: 5
  }
};

const initialBall: PongBall = {
  x: BOARD_WIDTH / 2 - BALL_SIZE / 2,
  y: BOARD_HEIGHT / 2 - BALL_SIZE / 2,
  vx: 5.2,
  vy: 3.1
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readBestResult(): PongResult | null {
  const stored = safeStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as PongResult) : null;
}

function createServe(direction: 1 | -1): PongBall {
  const vertical = Math.random() > 0.5 ? 1 : -1;

  return {
    x: BOARD_WIDTH / 2 - BALL_SIZE / 2,
    y: BOARD_HEIGHT / 2 - BALL_SIZE / 2,
    vx: 5.2 * direction,
    vy: (2.7 + Math.random() * 1.6) * vertical
  };
}

export function Pong({ onBack }: PongProps) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const text = (ja: string, en: string) => isEnglish ? en : ja;
  const difficultyLabel = (level: PongDifficulty) => text(difficultySettings[level].label, { easy: "Easy", normal: "Normal", hard: "Hard" }[level]);
  const confirmRecordReset = useConfirmRecordReset();
  const [status, setStatus] = useState<PongStatus>("idle");
  const [ball, setBall] = useState<PongBall>(initialBall);
  const [playerY, setPlayerY] = useState((BOARD_HEIGHT - PADDLE_HEIGHT) / 2);
  const [cpuY, setCpuY] = useState((BOARD_HEIGHT - PADDLE_HEIGHT) / 2);
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [difficulty, setDifficulty] = useState<PongDifficulty>("normal");
  const [message, setMessage] = useLocalizedMessage("スタートを押して、CPUとのポン対戦を始めましょう。", "Press Start to play Pong against the CPU.");
  const [bestResult, setBestResult] = useState<PongResult | null>(() => readBestResult());
  const ranking = useRanking({ gameId: `pong-${difficulty}`, metricLabel: "Margin", mode: "higher" });

  const statusRef = useRef(status);
  const ballRef = useRef(ball);
  const playerYRef = useRef(playerY);
  const cpuYRef = useRef(cpuY);
  const playerScoreRef = useRef(playerScore);
  const cpuScoreRef = useRef(cpuScore);
  const difficultyRef = useRef(difficulty);
  const moveUpRef = useRef(false);
  const moveDownRef = useRef(false);

  const releaseControls = () => {
    moveUpRef.current = false;
    moveDownRef.current = false;
  };

  useEffect(() => {
    statusRef.current = status;

    if (status !== "playing") {
      releaseControls();
    }
  }, [status]);

  useEffect(() => {
    ballRef.current = ball;
  }, [ball]);

  useEffect(() => {
    playerYRef.current = playerY;
  }, [playerY]);

  useEffect(() => {
    cpuYRef.current = cpuY;
  }, [cpuY]);

  useEffect(() => {
    playerScoreRef.current = playerScore;
  }, [playerScore]);

  useEffect(() => {
    cpuScoreRef.current = cpuScore;
  }, [cpuScore]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  const saveResult = (winner: "player" | "cpu", finalPlayerScore: number, finalCpuScore: number) => {
    const result: PongResult = {
      playerScore: finalPlayerScore,
      cpuScore: finalCpuScore,
      winner,
      difficulty: difficultyRef.current,
      recordedAt: new Date().toISOString()
    };

    if (winner === "player" && (!bestResult || finalCpuScore < bestResult.cpuScore || bestResult.winner === "cpu")) {
      setBestResult(result);
      safeStorage.setItem(BEST_KEY, JSON.stringify(result));
    }
  };

  const scorePoint = (side: "player" | "cpu") => {
    releaseControls();

    if (side === "player") {
      const nextPlayerScore = playerScoreRef.current + 1;
      setPlayerScore(nextPlayerScore);
      playerScoreRef.current = nextPlayerScore;

      if (nextPlayerScore >= WIN_SCORE) {
        setStatus("finished");
        setMessage("勝利！ラリーを制しました。もう一度遊べます。", "You win! Ready for another match?");
        saveResult("player", nextPlayerScore, cpuScoreRef.current);
        return;
      }

      setBall(createServe(-1));
      setMessage("得点！CPU側から再開します。", "Point scored! The next serve starts toward the CPU.");
      return;
    }

    const nextCpuScore = cpuScoreRef.current + 1;
    setCpuScore(nextCpuScore);
    cpuScoreRef.current = nextCpuScore;

    if (nextCpuScore >= WIN_SCORE) {
      setStatus("finished");
      setMessage("CPUの勝利。次は早めに中央へ戻ると守りやすいです。", "CPU wins. Return toward the center sooner to defend.");
      saveResult("cpu", playerScoreRef.current, nextCpuScore);
      return;
    }

    setBall(createServe(1));
    setMessage("失点。落ち着いて次のサーブを返しましょう。", "Point lost. Get ready for the next serve.");
  };

  const movePaddleBy = (delta: number) => {
    const nextPlayerY = clamp(playerYRef.current + delta, 0, BOARD_HEIGHT - PADDLE_HEIGHT);
    playerYRef.current = nextPlayerY;
    setPlayerY(nextPlayerY);
  };

  const tick = () => {
    if (statusRef.current !== "playing") {
      return;
    }

    if (moveUpRef.current) {
      movePaddleBy(-PADDLE_SPEED);
    }

    if (moveDownRef.current) {
      movePaddleBy(PADDLE_SPEED);
    }

    const currentDifficulty = difficultySettings[difficultyRef.current];
    const ballCenterY = ballRef.current.y + BALL_SIZE / 2;
    const cpuCenterY = cpuYRef.current + PADDLE_HEIGHT / 2;
    const trackingError = Math.sin(ballRef.current.x / 42) * currentDifficulty.error;
    const targetY = ballCenterY + trackingError;
    const cpuDelta = clamp(
      (targetY - cpuCenterY) * currentDifficulty.reaction,
      -currentDifficulty.cpuSpeed,
      currentDifficulty.cpuSpeed
    );
    const nextCpuY = clamp(cpuYRef.current + cpuDelta, 0, BOARD_HEIGHT - PADDLE_HEIGHT);
    cpuYRef.current = nextCpuY;
    setCpuY(nextCpuY);

    let nextBall: PongBall = {
      ...ballRef.current,
      x: ballRef.current.x + ballRef.current.vx,
      y: ballRef.current.y + ballRef.current.vy
    };

    if (nextBall.y <= 0 || nextBall.y + BALL_SIZE >= BOARD_HEIGHT) {
      nextBall.vy *= -1;
      nextBall.y = clamp(nextBall.y, 0, BOARD_HEIGHT - BALL_SIZE);
    }

    const hitsPlayer =
      nextBall.vx < 0 &&
      nextBall.x <= PLAYER_X + PADDLE_WIDTH &&
      nextBall.x + BALL_SIZE >= PLAYER_X &&
      nextBall.y + BALL_SIZE >= playerYRef.current &&
      nextBall.y <= playerYRef.current + PADDLE_HEIGHT;

    if (hitsPlayer) {
      const offset = (nextBall.y + BALL_SIZE / 2 - (playerYRef.current + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
      nextBall.vx = Math.abs(nextBall.vx) + 0.12;
      nextBall.vy = clamp(offset * 5.8, -6, 6);
      nextBall.x = PLAYER_X + PADDLE_WIDTH;
    }

    const hitsCpu =
      nextBall.vx > 0 &&
      nextBall.x + BALL_SIZE >= CPU_X &&
      nextBall.x <= CPU_X + PADDLE_WIDTH &&
      nextBall.y + BALL_SIZE >= nextCpuY &&
      nextBall.y <= nextCpuY + PADDLE_HEIGHT;

    if (hitsCpu) {
      const offset = (nextBall.y + BALL_SIZE / 2 - (nextCpuY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
      nextBall.vx = -Math.abs(nextBall.vx) - 0.08;
      nextBall.vy = clamp(offset * 5.5, -6, 6);
      nextBall.x = CPU_X - BALL_SIZE;
    }

    if (nextBall.x + BALL_SIZE < 0) {
      scorePoint("cpu");
      return;
    }

    if (nextBall.x > BOARD_WIDTH) {
      scorePoint("player");
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
      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        event.preventDefault();
        moveUpRef.current = true;
        movePaddleBy(-PADDLE_SPEED);
      }

      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        event.preventDefault();
        moveDownRef.current = true;
        movePaddleBy(PADDLE_SPEED);
      }

      if (event.key === " ") {
        event.preventDefault();

        if (statusRef.current === "playing") {
          releaseControls();
          setStatus("paused");
          setMessage("一時停止中。スペースキーまたは再開ボタンで続けられます。", "Paused. Press Space or Resume to continue.");
        } else if (statusRef.current === "paused") {
          setStatus("playing");
          setMessage("再開しました。パドルの中央で返すと角度を抑えられます。", "Resumed. Hit with the paddle center for a straighter return.");
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        moveUpRef.current = false;
      }

      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        moveDownRef.current = false;
      }
    };

    const handleRelease = () => releaseControls();
    const handleVisibilityChange = () => {
      if (document.hidden) {
        releaseControls();
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
    releaseControls();
    setStatus("playing");
    setBall(createServe(Math.random() > 0.5 ? 1 : -1));
    setPlayerY((BOARD_HEIGHT - PADDLE_HEIGHT) / 2);
    setCpuY((BOARD_HEIGHT - PADDLE_HEIGHT) / 2);
    setPlayerScore(0);
    setCpuScore(0);
    setMessage("上下キーまたはW/Sでパドルを操作。先に5点を取ると勝利です。", "Move with Up/Down or W/S. First to five points wins.");
    playerYRef.current = (BOARD_HEIGHT - PADDLE_HEIGHT) / 2;
    cpuYRef.current = (BOARD_HEIGHT - PADDLE_HEIGHT) / 2;
    playerScoreRef.current = 0;
    cpuScoreRef.current = 0;
  };

  const changeDifficulty = (nextDifficulty: PongDifficulty) => {
    if (nextDifficulty === difficulty) return;
    releaseControls();
    setStatus("idle");
    statusRef.current = "idle";
    setPlayerScore(0);
    setCpuScore(0);
    setDifficulty(nextDifficulty);
    difficultyRef.current = nextDifficulty;

    setMessage(`${difficultySettings[nextDifficulty].label}でプレイします。スタートを押して開始してください。`, `Playing on ${{ easy: "Easy", normal: "Normal", hard: "Hard" }[nextDifficulty]}. Press Start when ready.`);
  };

  const togglePause = () => {
    if (status === "playing") {
      releaseControls();
      setStatus("paused");
      setMessage("一時停止中。再開ボタンで続けられます。", "Paused. Press Space or Resume to continue.");
      return;
    }

    if (status === "paused") {
      setStatus("playing");
      setMessage("再開しました。パドルの中央で返すと角度を抑えられます。", "Resumed. Hit with the paddle center for a straighter return.");
    }
  };

  const resetBest = () => {
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestResult(null);
  };

  return (
    <section className="puzzle-shell pong-shell" aria-labelledby="pong-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">ARCADE / INTERNAL GAME</p>
          <h1 id="pong-title">{text("ポン", "Pong")}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel pong-stats" aria-label={text("ポンの状態", "Pong status")}>
          <div>
            <span>You</span>
            <strong>{playerScore}</strong>
          </div>
          <div>
            <span>CPU</span>
            <strong>{cpuScore}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout pong-layout">
        <div className={`pong-board-wrap is-${status}`}>
          <div className="pong-board" aria-label={text("ポン盤面", "Pong board")}>
            <span className="pong-center-line" />
            <span className="pong-paddle is-player" style={{ top: `${(playerY / BOARD_HEIGHT) * 100}%` }} />
            <span className="pong-paddle is-cpu" style={{ top: `${(cpuY / BOARD_HEIGHT) * 100}%` }} />
            <span
              className="pong-ball"
              style={{
                left: `${(ball.x / BOARD_WIDTH) * 100}%`,
                top: `${(ball.y / BOARD_HEIGHT) * 100}%`
              }}
            />
          </div>
          {status !== "playing" && (
            <div className="pong-overlay">
              <Play aria-hidden="true" />
              <p>{status === "finished" ? "MATCH END" : status === "paused" ? "PAUSED" : "READY"}</p>
            </div>
          )}
        </div>

        <aside className="puzzle-side pong-side">
          <div className="rule-card">
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("上下キーまたはW/Sで左のパドルを動かし、CPUとラリーします。先に5点を取った側の勝利です。",
                "Move the left paddle with Up/Down or W/S and rally against the CPU. First to five points wins.")}
            </p>
          </div>

          <div className="pong-progress">
            <span>{text("あなた", "You")}: {playerScore}</span>
            <span>CPU: {cpuScore}</span>
            <span>{text("勝利条件", "First to")}: {WIN_SCORE}{isEnglish ? " points" : "点"}</span>
            <span>{text("難易度", "Difficulty")}: {difficultyLabel(difficulty)}</span>
            <span>{text("状態", "Status")}: {status === "playing" ? text("プレイ中", "Playing") : status === "paused" ? text("一時停止", "Paused") : status === "finished" ? text("終了", "Finished") : text("待機中", "Ready")}</span>
          </div>

          <div className="pong-difficulty" aria-label={text("難易度選択", "Choose difficulty")}>
            {(Object.keys(difficultySettings) as PongDifficulty[]).map((level) => (
              <button
                className={difficulty === level ? "is-selected" : ""}
                disabled={status === "playing"}
                key={level}
                type="button"
                onClick={() => changeDifficulty(level)}
              >
                {difficultyLabel(level)}
              </button>
            ))}
          </div>

          <div className="pong-controls" aria-label={text("パドル操作", "Paddle controls")}>
            <button
              type="button"
              onMouseDown={() => {
                moveUpRef.current = true;
                movePaddleBy(-PADDLE_SPEED);
              }}
              onClick={() => movePaddleBy(-PADDLE_SPEED)}
              onMouseUp={releaseControls}
              onMouseLeave={() => {
                moveUpRef.current = false;
              }}
              onTouchStart={() => {
                moveUpRef.current = true;
                movePaddleBy(-PADDLE_SPEED);
              }}
              onTouchEnd={releaseControls}
            >
              <ChevronUp aria-hidden="true" />
              {text("上", "Up")}
            </button>
            <button
              type="button"
              onMouseDown={() => {
                moveDownRef.current = true;
                movePaddleBy(PADDLE_SPEED);
              }}
              onClick={() => movePaddleBy(PADDLE_SPEED)}
              onMouseUp={releaseControls}
              onMouseLeave={() => {
                moveDownRef.current = false;
              }}
              onTouchStart={() => {
                moveDownRef.current = true;
                movePaddleBy(PADDLE_SPEED);
              }}
              onTouchEnd={releaseControls}
            >
              <ChevronDown aria-hidden="true" />
              {text("下", "Down")}
            </button>
          </div>

          <div className="pong-best">
            <h2>{text("ベスト", "Best")}</h2>
            {bestResult ? (
              <p>
                {text("勝利", "Win")} {bestResult.playerScore}-{bestResult.cpuScore}
              </p>
            ) : (
              <p>{text("まだ勝利記録がありません。", "No wins recorded yet.")}</p>
            )}
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" && playerScore > cpuScore ? { score: playerScore - cpuScore, display: `${playerScore}-${cpuScore}`, meta: `${difficultyLabel(difficulty)} / ${text("勝利", "Win")}` } : null}
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
