import {
  ArrowLeft,
  Clock3,
  Grid3X3,
  Languages,
  Lightbulb,
  Play,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Trophy
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { useI18n } from "../../i18n";
import type { Board, BlockToken } from "./tokens";
import { classifyRotationGesture, moveRotationPoint } from "./rotationInteraction";
import {
  ROTATION_COLUMNS,
  ROTATION_ROWS,
  calculateRotationClearScore,
  createPlayableRotationBoard,
  enumerateProductiveRotations,
  findRotationMatches,
  resolveRotationChain,
  rotateSquare,
  shuffleToPlayableRotationBoard,
  type RotationDirection,
  type RotationMove,
  type RotationPoint
} from "./rotationLogic";

type ColorChainRotationTestProps = {
  onBack: () => void;
};

type RotationPhase =
  | "idle"
  | "ready"
  | "selecting"
  | "rotating"
  | "validating"
  | "reverting"
  | "clearing"
  | "falling"
  | "refilling"
  | "shuffling"
  | "clear"
  | "timeout";

type RotationOverlay = {
  board: Board;
  direction: RotationDirection;
  point: RotationPoint;
};

type PointerStart = {
  id: number;
  point: RotationPoint;
  startTime: number;
  startX: number;
  startY: number;
  scale: number;
};

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;
const GAME_SECONDS = 90;
const CLEAR_TARGET = 60;
const ROTATION_DURATION = 160;
const INVALID_PAUSE = 90;
const CLEAR_DURATION = 250;
const FALL_DURATION = 170;
const REFILL_DURATION = 190;
const rotationSettings = { colorCount: 4, maxChainSteps: 30 } as const;
const clockPhases = new Set<RotationPhase>([
  "ready",
  "selecting",
  "rotating",
  "validating",
  "reverting"
]);

const blockSymbols: Partial<Record<BlockToken, string>> = {
  coral: "●",
  gold: "◆",
  mint: "▲",
  sky: "■",
  violet: "★",
  rose: "♥",
  bomb: "✦",
  "vertical-laser": "↕",
  "horizontal-laser": "↔",
  "color-breaker": "◎"
};

const copy = {
  ja: {
    eyebrow: "ROTATION PROTOTYPE / PHASE R2",
    title: "クロマのマジカルチェイン 回転式試作",
    subtitle: "2×2を回し、縦・横・斜めに同じ色を4個つなげよう",
    boardLabel: "8×8の回転式マジカルチェイン盤面",
    back: "ゲーム一覧",
    language: "English",
    time: "残り時間",
    score: "スコア",
    cleared: "消去数",
    maxChain: "最大CHAIN",
    validMoves: "成立手",
    sealGauge: "封印ゲージ",
    target: `目標 ${CLEAR_TARGET}個消去`,
    selectedPoint: "選択中の交点",
    pointValue: (point: RotationPoint) => `${point.row + 1}行・${point.column + 1}列`,
    clockwise: "時計回り",
    counterclockwise: "反時計回り",
    hint: "ヒント",
    start: "試作ゲームを開始",
    retry: "もう一度遊ぶ",
    startDescription: "90秒以内に60個消して封印ゲージを満タンにしてください。",
    ready: "交点をタップ、または右・左へスワイプして2×2を回転します。",
    cancelled: "縦方向の操作はキャンセルされました。",
    invalid: "チェイン不成立。元の配置へ戻します。",
    chain: (chain: number, points: number) => `${chain} CHAIN!  +${points}`,
    shuffled: "成立手がなくなったため、盤面を再構成しました。",
    hintMessage: (direction: RotationDirection) =>
      `光っている交点を${direction === "clockwise" ? "時計回り" : "反時計回り"}に回してみましょう。`,
    clearTitle: "封印成功！",
    clearDescription: "消去目標を達成しました。",
    timeoutTitle: "時間切れ",
    timeoutDescription: "盤面を見直して、もう一度挑戦しましょう。",
    rotateNotice: "横向きにすると固定画面を大きく表示できます。",
    keyboardHelp: "矢印キーで交点移動、Enterで時計回り、Shift+EnterまたはZで反時計回り",
    ariaPoint: (point: RotationPoint) =>
      `上から${point.row + 1}、左から${point.column + 1}の交点。Enterで時計回り、Shift EnterまたはZで反時計回り`
  },
  en: {
    eyebrow: "ROTATION PROTOTYPE / PHASE R2",
    title: "Chroma's Magical Chain: Rotation Prototype",
    subtitle: "Rotate 2×2 groups and connect four matching colors vertically, horizontally, or diagonally",
    boardLabel: "8×8 Magical Chain rotation board",
    back: "Game Shelf",
    language: "日本語",
    time: "Time",
    score: "Score",
    cleared: "Cleared",
    maxChain: "Max Chain",
    validMoves: "Valid Moves",
    sealGauge: "Seal Gauge",
    target: `Clear ${CLEAR_TARGET} blocks`,
    selectedPoint: "Selected Point",
    pointValue: (point: RotationPoint) => `Row ${point.row + 1}, Column ${point.column + 1}`,
    clockwise: "Clockwise",
    counterclockwise: "Counterclockwise",
    hint: "Hint",
    start: "Start Prototype",
    retry: "Play Again",
    startDescription: "Clear 60 blocks within 90 seconds to fill the Seal Gauge.",
    ready: "Tap an intersection, or swipe right or left, to rotate its 2×2 group.",
    cancelled: "Vertical input was cancelled.",
    invalid: "No chain formed. Restoring the previous layout.",
    chain: (chain: number, points: number) => `${chain} CHAIN!  +${points}`,
    shuffled: "No valid moves remained, so the board was reshuffled.",
    hintMessage: (direction: RotationDirection) =>
      `Try rotating the glowing point ${direction === "clockwise" ? "clockwise" : "counterclockwise"}.`,
    clearTitle: "Seal Complete!",
    clearDescription: "You reached the clearing target.",
    timeoutTitle: "Time Up",
    timeoutDescription: "Study the board and try again.",
    rotateNotice: "Rotate your device to landscape for a larger fixed game screen.",
    keyboardHelp: "Arrow keys: move point / Enter: clockwise / Shift+Enter or Z: counterclockwise",
    ariaPoint: (point: RotationPoint) =>
      `Intersection row ${point.row + 1}, column ${point.column + 1}. Enter rotates clockwise. Shift Enter or Z rotates counterclockwise.`
  }
} as const;

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function oppositeDirection(direction: RotationDirection): RotationDirection {
  return direction === "clockwise" ? "counterclockwise" : "clockwise";
}

function cellKey(row: number, column: number) {
  return `${row}:${column}`;
}

function isPointCell(row: number, column: number, point: RotationPoint | null) {
  return point !== null
    && row >= point.row
    && row <= point.row + 1
    && column >= point.column
    && column <= point.column + 1;
}

function useFixedStage() {
  const [layout, setLayout] = useState({ scale: 1, portrait: false });

  useLayoutEffect(() => {
    const update = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const scale = Math.max(
        0.1,
        Math.min((width - 12) / STAGE_WIDTH, (height - 12) / STAGE_HEIGHT)
      );
      setLayout({ scale, portrait: height > width });
    };

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  return layout;
}

export function ColorChainRotationTest({ onBack }: ColorChainRotationTestProps) {
  const { language, setLanguage } = useI18n();
  const t = copy[language];
  const { scale, portrait } = useFixedStage();
  const initialBoard = useMemo(() => createPlayableRotationBoard(rotationSettings), []);
  const [board, setBoard] = useState<Board>(initialBoard);
  const [phase, setPhase] = useState<RotationPhase>("idle");
  const [selectedPoint, setSelectedPoint] = useState<RotationPoint>({ row: 3, column: 3 });
  const [focusedPoint, setFocusedPoint] = useState<RotationPoint>({ row: 3, column: 3 });
  const [rotationOverlay, setRotationOverlay] = useState<RotationOverlay | null>(null);
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [invalidPoint, setInvalidPoint] = useState<RotationPoint | null>(null);
  const [hintMove, setHintMove] = useState<RotationMove | null>(null);
  const [chainNotice, setChainNotice] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>(t.ready);
  const [score, setScore] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [maxChain, setMaxChain] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [documentHidden, setDocumentHidden] = useState(document.hidden);
  const boardRef = useRef(board);
  const phaseRef = useRef(phase);
  const timeLeftRef = useRef(timeLeft);
  const clearedRef = useRef(cleared);
  const runIdRef = useRef(0);
  const pointerRef = useRef<PointerStart | null>(null);
  const stageScaleRef = useRef(scale);
  const pointButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  const availableMoves = useMemo(() => enumerateProductiveRotations(board), [board]);
  const sealPercent = Math.min(100, Math.round((cleared / CLEAR_TARGET) * 100));
  const inputEnabled = phase === "ready" || phase === "selecting";
  const isResolving = [
    "rotating",
    "validating",
    "reverting",
    "clearing",
    "falling",
    "refilling",
    "shuffling"
  ].includes(phase);

  const stageFrameStyle: CSSProperties = {
    width: `${STAGE_WIDTH * scale}px`,
    height: `${STAGE_HEIGHT * scale}px`
  };
  const stageStyle: CSSProperties = {
    width: `${STAGE_WIDTH}px`,
    height: `${STAGE_HEIGHT}px`,
    transform: `scale(${scale})`
  };

  const commitBoard = (nextBoard: Board) => {
    boardRef.current = nextBoard;
    setBoard(nextBoard);
  };

  const commitPhase = (nextPhase: RotationPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  const finishGame = (result: "clear" | "timeout") => {
    pointerRef.current = null;
    setRotationOverlay(null);
    setClearingCells(new Set());
    setInvalidPoint(null);
    setHintMove(null);
    setChainNotice("");
    commitPhase(result);
  };

  const finishTurn = () => {
    if (clearedRef.current >= CLEAR_TARGET) {
      finishGame("clear");
    } else if (timeLeftRef.current <= 0) {
      finishGame("timeout");
    } else {
      commitPhase("ready");
    }
  };

  const performMove = async (point: RotationPoint, direction: RotationDirection) => {
    if (!inputEnabled || !["ready", "selecting"].includes(phaseRef.current)) return;

    const currentRun = ++runIdRef.current;
    const sourceBoard = boardRef.current.map((row) => [...row]);
    setSelectedPoint(point);
    setFocusedPoint(point);
    setHintMove(null);
    setInvalidPoint(null);
    setChainNotice("");
    setRotationOverlay({ board: sourceBoard, point, direction });
    commitPhase("rotating");

    await delay(ROTATION_DURATION);
    if (runIdRef.current !== currentRun) return;

    const rotatedBoard = rotateSquare(sourceBoard, point.row, point.column, direction);
    commitBoard(rotatedBoard);
    setRotationOverlay(null);
    commitPhase("validating");
    const firstMatches = findRotationMatches(rotatedBoard);

    if (firstMatches.cells.size === 0) {
      setInvalidPoint(point);
      setStatusMessage(t.invalid);
      await delay(INVALID_PAUSE);
      if (runIdRef.current !== currentRun) return;

      setRotationOverlay({
        board: rotatedBoard,
        point,
        direction: oppositeDirection(direction)
      });
      commitPhase("reverting");
      await delay(ROTATION_DURATION);
      if (runIdRef.current !== currentRun) return;

      commitBoard(sourceBoard);
      setRotationOverlay(null);
      setInvalidPoint(null);
      finishTurn();
      return;
    }

    const resolution = resolveRotationChain(rotatedBoard, Math.random, rotationSettings);
    for (const step of resolution.steps) {
      if (runIdRef.current !== currentRun) return;
      commitBoard(step.boardBeforeClear);
      setClearingCells(new Set(step.matches.cells));
      commitPhase("clearing");
      const points = calculateRotationClearScore(step.matches, step.chain);
      const nextCleared = clearedRef.current + step.matches.cells.size;
      clearedRef.current = nextCleared;
      setCleared(nextCleared);
      setScore((current) => current + points);
      setMaxChain((current) => Math.max(current, step.chain));
      setChainNotice(t.chain(step.chain, points));
      setStatusMessage(t.chain(step.chain, points));

      await delay(CLEAR_DURATION);
      if (runIdRef.current !== currentRun) return;
      setClearingCells(new Set());
      commitBoard(step.boardAfterClear);

      commitPhase("falling");
      await delay(70);
      if (runIdRef.current !== currentRun) return;
      commitBoard(step.boardAfterCollapse);
      await delay(FALL_DURATION);
      if (runIdRef.current !== currentRun) return;

      commitPhase("refilling");
      commitBoard(step.boardAfterRefill);
      await delay(REFILL_DURATION);
    }

    if (runIdRef.current !== currentRun) return;
    setChainNotice("");
    let stableBoard = resolution.board;
    if (resolution.capped || enumerateProductiveRotations(stableBoard).length === 0) {
      commitPhase("shuffling");
      setStatusMessage(t.shuffled);
      await delay(220);
      if (runIdRef.current !== currentRun) return;
      stableBoard = shuffleToPlayableRotationBoard(stableBoard, Math.random, rotationSettings);
      commitBoard(stableBoard);
      await delay(220);
    }

    if (runIdRef.current !== currentRun) return;
    setStatusMessage(t.ready);
    finishTurn();
  };

  const startGame = () => {
    runIdRef.current += 1;
    commitBoard(createPlayableRotationBoard(rotationSettings));
    timeLeftRef.current = GAME_SECONDS;
    clearedRef.current = 0;
    setTimeLeft(GAME_SECONDS);
    setScore(0);
    setCleared(0);
    setMaxChain(0);
    setSelectedPoint({ row: 3, column: 3 });
    setFocusedPoint({ row: 3, column: 3 });
    setRotationOverlay(null);
    setClearingCells(new Set());
    setInvalidPoint(null);
    setHintMove(null);
    setChainNotice("");
    setStatusMessage(t.ready);
    commitPhase("ready");
  };

  const showHint = () => {
    if (!inputEnabled || availableMoves.length === 0) return;
    const move = availableMoves[0];
    setHintMove(move);
    setSelectedPoint(move);
    setFocusedPoint(move);
    setStatusMessage(t.hintMessage(move.direction));
    window.setTimeout(() => {
      setHintMove((current) => (
        current?.row === move.row
        && current.column === move.column
        && current.direction === move.direction
          ? null
          : current
      ));
    }, 3500);
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    point: RotationPoint
  ) => {
    if (!inputEnabled || phaseRef.current !== "ready" || !event.isPrimary || event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = {
      id: event.pointerId,
      point,
      startTime: performance.now(),
      startX: event.clientX,
      startY: event.clientY,
      scale: stageScaleRef.current
    };
    setSelectedPoint(point);
    setFocusedPoint(point);
    commitPhase("selecting");
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId || phaseRef.current !== "selecting") return;
    event.preventDefault();
    pointerRef.current = null;
    const logicalScale = Math.max(0.1, pointer.scale);
    const direction = classifyRotationGesture({
      deltaX: (event.clientX - pointer.startX) / logicalScale,
      deltaY: (event.clientY - pointer.startY) / logicalScale,
      durationMs: performance.now() - pointer.startTime
    });

    if (!direction) {
      setStatusMessage(t.cancelled);
      commitPhase(timeLeftRef.current <= 0 ? "timeout" : "ready");
      return;
    }
    void performMove(pointer.point, direction);
  };

  const cancelPointer = (event?: ReactPointerEvent<HTMLButtonElement>) => {
    if (event && pointerRef.current?.id !== event.pointerId) return;
    pointerRef.current = null;
    if (phaseRef.current === "selecting") {
      commitPhase(timeLeftRef.current <= 0 ? "timeout" : "ready");
    }
  };

  const focusPointButton = (point: RotationPoint) => {
    window.requestAnimationFrame(() => {
      pointButtonRefs.current.get(cellKey(point.row, point.column))?.focus();
    });
  };

  const handlePointKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    point: RotationPoint
  ) => {
    if (!inputEnabled) return;
    if (
      event.key === "ArrowUp"
      || event.key === "ArrowDown"
      || event.key === "ArrowLeft"
      || event.key === "ArrowRight"
    ) {
      event.preventDefault();
      const nextPoint = moveRotationPoint(point, event.key);
      setFocusedPoint(nextPoint);
      setSelectedPoint(nextPoint);
      focusPointButton(nextPoint);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void performMove(point, event.shiftKey ? "counterclockwise" : "clockwise");
      return;
    }
    if (event.key.toLowerCase() === "z") {
      event.preventDefault();
      void performMove(point, "counterclockwise");
    }
  };

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    stageScaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    setStatusMessage((current) => (
      current === copy.ja.ready || current === copy.en.ready ? t.ready : current
    ));
  }, [t.ready]);

  useEffect(() => {
    const root = document.documentElement;
    document.body.classList.add("color-chain-rotation-mode");
    root.classList.add("color-chain-rotation-mode");
    return () => {
      runIdRef.current += 1;
      document.body.classList.remove("color-chain-rotation-mode");
      root.classList.remove("color-chain-rotation-mode");
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      const hidden = document.hidden;
      setDocumentHidden(hidden);
      if (hidden) {
        pointerRef.current = null;
        if (phaseRef.current === "selecting") commitPhase("ready");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (!clockPhases.has(phase) || documentHidden) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - previous) / 1000;
      previous = now;
      const next = Math.max(0, timeLeftRef.current - elapsed);
      timeLeftRef.current = next;
      setTimeLeft(next);
      if (
        next <= 0
        && (phaseRef.current === "ready" || phaseRef.current === "selecting")
      ) {
        runIdRef.current += 1;
        finishGame("timeout");
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [documentHidden, phase]);

  const renderToken = (token: BlockToken | null, key: string, extraClass = "") => (
    <span
      aria-hidden="true"
      className={`color-chain-cell${token ? ` is-${token}` : ""}${extraClass}`}
      data-symbol={token ? blockSymbols[token] ?? "" : ""}
      key={key}
    />
  );

  return (
    <div className="color-chain-rotation-page">
      {portrait && (
        <div className="color-chain-rotation-orientation" role="status">
          <RotateCw aria-hidden="true" />
          {t.rotateNotice}
        </div>
      )}

      <div className="color-chain-rotation-stage-frame" style={stageFrameStyle}>
        <section className={`color-chain-rotation-stage is-${phase}`} style={stageStyle}>
          <header className="color-chain-rotation-stage-header">
            <div className="color-chain-rotation-title">
              <p>{t.eyebrow}</p>
              <h1>{t.title}</h1>
              <span>{t.subtitle}</span>
            </div>
            <div className="color-chain-rotation-top-actions">
              <button onClick={() => setLanguage(language === "ja" ? "en" : "ja")} type="button">
                <Languages aria-hidden="true" />
                {t.language}
              </button>
              <button onClick={onBack} type="button">
                <ArrowLeft aria-hidden="true" />
                {t.back}
              </button>
            </div>
          </header>

          <div className="color-chain-rotation-game-grid">
            <aside className="color-chain-rotation-side-panel is-goal">
              <div className="color-chain-rotation-emblem" aria-hidden="true"><Sparkles /></div>
              <p className="color-chain-rotation-panel-kicker">MAGICAL CHAIN</p>
              <h2>{t.target}</h2>
              <div className="color-chain-rotation-gauge-copy">
                <span>{t.sealGauge}</span>
                <strong>{sealPercent}%</strong>
              </div>
              <div
                aria-label={`${t.sealGauge} ${sealPercent}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={sealPercent}
                className="color-chain-rotation-gauge"
                role="progressbar"
              >
                <i style={{ width: `${sealPercent}%` }} />
              </div>
              <div className="color-chain-rotation-point-readout">
                <span>{t.selectedPoint}</span>
                <strong>{t.pointValue(selectedPoint)}</strong>
              </div>
              <p className="color-chain-rotation-keyboard-help">{t.keyboardHelp}</p>
            </aside>

            <section className="color-chain-rotation-board-panel">
              <div
                aria-label={t.boardLabel}
                className={`color-chain-rotation-play-board is-${phase}`}
                role="group"
              >
                <div className="color-chain-rotation-cell-grid">
                  {board.flatMap((row, rowIndex) =>
                    row.map((token, columnIndex) => {
                      const key = cellKey(rowIndex, columnIndex);
                      const classes = [
                        clearingCells.has(key) ? " is-clearing" : "",
                        isPointCell(rowIndex, columnIndex, selectedPoint) ? " is-selected-area" : "",
                        rotationOverlay && isPointCell(rowIndex, columnIndex, rotationOverlay.point)
                          ? " is-under-overlay"
                          : "",
                        phase === "falling" ? " is-rotation-falling" : "",
                        phase === "refilling" ? " is-rotation-refilling" : ""
                      ].join("");
                      return renderToken(token, key, classes);
                    })
                  )}
                </div>

                <div className="color-chain-rotation-point-grid" aria-label={t.boardLabel}>
                  {Array.from({ length: ROTATION_ROWS - 1 }, (_, row) =>
                    Array.from({ length: ROTATION_COLUMNS - 1 }, (_, column) => {
                      const point = { row, column };
                      const key = cellKey(row, column);
                      const isSelected = selectedPoint.row === row && selectedPoint.column === column;
                      const isHint = hintMove?.row === row && hintMove.column === column;
                      const isInvalid = invalidPoint?.row === row && invalidPoint.column === column;
                      return (
                        <button
                          aria-label={t.ariaPoint(point)}
                          aria-pressed={isSelected}
                          className={[
                            "color-chain-rotation-point",
                            isSelected ? "is-selected" : "",
                            isHint ? `is-hint is-${hintMove.direction}` : "",
                            isInvalid ? "is-invalid" : ""
                          ].filter(Boolean).join(" ")}
                          key={key}
                          style={{
                            left: `${(column + 0.5) * 12.5}%`,
                            top: `${(row + 0.5) * 12.5}%`
                          }}
                          onFocus={() => {
                            setFocusedPoint(point);
                            setSelectedPoint(point);
                          }}
                          onKeyDown={(event) => handlePointKeyDown(event, point)}
                          onLostPointerCapture={(event) => cancelPointer(event)}
                          onPointerCancel={(event) => cancelPointer(event)}
                          onPointerDown={(event) => handlePointerDown(event, point)}
                          onPointerUp={handlePointerUp}
                          ref={(element) => {
                            if (element) pointButtonRefs.current.set(key, element);
                            else pointButtonRefs.current.delete(key);
                          }}
                          tabIndex={focusedPoint.row === row && focusedPoint.column === column ? 0 : -1}
                          type="button"
                        >
                          <i aria-hidden="true" />
                        </button>
                      );
                    })
                  )}
                </div>

                {rotationOverlay && (
                  <div
                    aria-hidden="true"
                    className={`color-chain-rotation-overlay is-${rotationOverlay.direction}`}
                    style={{
                      left: `${rotationOverlay.point.column * 12.5}%`,
                      top: `${rotationOverlay.point.row * 12.5}%`
                    }}
                  >
                    {[
                      rotationOverlay.board[rotationOverlay.point.row][rotationOverlay.point.column],
                      rotationOverlay.board[rotationOverlay.point.row][rotationOverlay.point.column + 1],
                      rotationOverlay.board[rotationOverlay.point.row + 1][rotationOverlay.point.column],
                      rotationOverlay.board[rotationOverlay.point.row + 1][rotationOverlay.point.column + 1]
                    ].map((token, index) => renderToken(token, `overlay-${index}`))}
                  </div>
                )}

                {chainNotice && (
                  <div className="color-chain-rotation-chain-notice" aria-hidden="true">
                    {chainNotice}
                  </div>
                )}

                {(phase === "idle" || phase === "clear" || phase === "timeout") && (
                  <div className="color-chain-rotation-start-overlay">
                    {phase === "clear" ? <Trophy aria-hidden="true" /> : <Play aria-hidden="true" />}
                    <h2>
                      {phase === "clear"
                        ? t.clearTitle
                        : phase === "timeout"
                        ? t.timeoutTitle
                        : t.title}
                    </h2>
                    <p>
                      {phase === "clear"
                        ? t.clearDescription
                        : phase === "timeout"
                        ? t.timeoutDescription
                        : t.startDescription}
                    </p>
                    {(phase === "clear" || phase === "timeout") && (
                      <div className="color-chain-rotation-result-score">
                        <span>{t.score}</span>
                        <strong>{score.toLocaleString()}</strong>
                      </div>
                    )}
                    <button onClick={startGame} type="button">
                      <Play aria-hidden="true" />
                      {phase === "idle" ? t.start : t.retry}
                    </button>
                  </div>
                )}
              </div>
              <div aria-live="polite" className="color-chain-rotation-message" role="status">
                {statusMessage}
              </div>
            </section>

            <aside className="color-chain-rotation-side-panel is-status">
              <div className="color-chain-rotation-timer">
                <Clock3 aria-hidden="true" />
                <span>{t.time}</span>
                <strong>{Math.ceil(timeLeft)}</strong>
              </div>
              <div className="color-chain-rotation-stats">
                <span><small>{t.score}</small><strong>{score.toLocaleString()}</strong></span>
                <span><small>{t.cleared}</small><strong>{cleared}</strong></span>
                <span><small>{t.maxChain}</small><strong>{maxChain}</strong></span>
                <span><small>{t.validMoves}</small><strong>{availableMoves.length}</strong></span>
              </div>
              <div className="color-chain-rotation-manual-controls">
                <button
                  disabled={!inputEnabled}
                  onClick={() => void performMove(selectedPoint, "counterclockwise")}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" />
                  {t.counterclockwise}
                </button>
                <button
                  disabled={!inputEnabled}
                  onClick={() => void performMove(selectedPoint, "clockwise")}
                  type="button"
                >
                  <RotateCw aria-hidden="true" />
                  {t.clockwise}
                </button>
                <button disabled={!inputEnabled} onClick={showHint} type="button">
                  <Lightbulb aria-hidden="true" />
                  {t.hint}
                </button>
              </div>
              <div className={`color-chain-rotation-phase-indicator is-${phase}`}>
                <Grid3X3 aria-hidden="true" />
                <span>{isResolving ? "RESOLVING" : phase.toUpperCase()}</span>
                <ShieldCheck aria-hidden="true" />
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
