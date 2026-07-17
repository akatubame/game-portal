import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bomb,
  ChevronsDown,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Snowflake,
  Sparkles,
  X,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import {
  applyGravityStep,
  addSlowCharge,
  BOMB_BLOCK,
  BOARD_COLUMNS,
  calculateClearScore,
  canPlacePair,
  cellKey,
  clearMatchedCells,
  createEmptyBoard,
  createRandomPair,
  findMatches,
  findBombBlastCells,
  findLaserClearCells,
  getGhostPair,
  getPairCells,
  hasBlocksAboveTop,
  HIDDEN_ROWS,
  mergePair,
  movePair,
  preparePairForSpawn,
  rotatePair,
  VISIBLE_ROWS,
  type BlockToken,
  type Board,
  type FallingPair
} from "./logic";

type ColorChainProps = {
  onBack: () => void;
};

type Difficulty = "easy" | "normal" | "hard";
type GameStatus = "idle" | "playing" | "paused" | "resolving" | "gameover";

type BestResult = {
  score: number;
  maxChain: number;
  cleared: number;
  recordedAt: string;
};

const BEST_KEY = "game-shelf-color-chain-best";
const CLEAR_DELAY = 220;
const FALL_DELAY = 130;
const GRAVITY_STEP_DELAY = 36;
const LASER_TICK = 250;
const BOMB_BLOCK_SCORE = 5;
const BOMB_TRIGGER_SCORE = 25;
const LASER_BLOCK_SCORE = 4;
const SLOW_DURATION = 10;
const SLOW_TICK = 250;

const difficultySettings: Record<Difficulty, { colors: number; baseSpeed: number; bombChance: number; bombPity: number; laserSeconds: number }> = {
  easy: { colors: 4, baseSpeed: 860, bombChance: 0.09, bombPity: 11, laserSeconds: 35 },
  normal: { colors: 5, baseSpeed: 710, bombChance: 0.06, bombPity: 14, laserSeconds: 40 },
  hard: { colors: 6, baseSpeed: 590, bombChance: 0.04, bombPity: 17, laserSeconds: 45 }
};

const symbols: Record<BlockToken, string> = {
  coral: "●",
  gold: "◆",
  mint: "▲",
  sky: "★",
  violet: "＋",
  rose: "✦",
  bomb: "✹"
};

const copy = {
  ja: {
    eyebrow: "落ちものパズル / 内部ゲーム",
    title: "カラーチェイン",
    idle: "2個1組のブロックを落とし、同じ色を縦・横・斜めに4個以上並べましょう。",
    playing: "同じ色を4個以上つなげて、連鎖を狙いましょう。",
    paused: "一時停止中です。再開すると落下が始まります。",
    resolving: (chain: number, count: number) => `${chain}連鎖！ ${count}個のブロックを消去しました。`,
    gameover: "ゲームオーバー。上部に余白を残しながら連鎖を組み立てましょう。",
    score: "スコア",
    chain: "最大連鎖",
    cleared: "消去数",
    level: "レベル",
    next: "次のブロック",
    howTo: "遊び方",
    rules: "2個1組のブロックを移動・回転して積みます。着地後、支えのないブロックは個別に下まで落下します。同色が縦・横・斜めに4個以上並ぶと一括消去。落下後に再び揃うと連鎖ボーナスです。ブロックが最上段を超えるとゲームオーバーです。",
    controls: "操作",
    keyboard: "PC: ←→で移動、↓で下降、Z/Xで回転、Spaceで即落下、Hでホールド、Sでスロータイム、Lでレーザー、Pで一時停止。1列幅の縦穴では、回転入力でブロックの上下を反転できます。",
    easy: "初級",
    normal: "中級",
    hard: "上級",
    easyDetail: "4色・ゆっくり",
    normalDetail: "5色・標準速度",
    hardDetail: "6色・速め",
    start: "ゲーム開始",
    restart: "最初から",
    pause: "一時停止",
    resume: "再開",
    resetBest: "ベスト削除",
    back: "棚へ戻る",
    best: "ベスト記録",
    noBest: "まだ記録がありません",
    status: "状態",
    ready: "待機中",
    inPlay: "プレイ中",
    resolvingLabel: "連鎖判定中",
    gameoverLabel: "ゲームオーバー",
    moveLeft: "左へ移動",
    moveRight: "右へ移動",
    rotate: "右回転",
    down: "1段下げる",
    hardDrop: "即落下",
    bombBlast: (count: number) => `爆弾が炸裂！ ${count}個のブロックを破壊しました。`,
    laser: "縦レーザー",
    laserReady: "発射可能",
    laserCharging: "充填中",
    laserSelect: "消したい列を選んでください。",
    laserCancel: "選択をやめる",
    laserColumn: (column: number) => `${column}列目へレーザー発射！`,
    laserMiss: "空の列にレーザーを発射しました。",
    bombHelp: "爆弾は着地後に周囲3×3を破壊します。レーザーはゲージが満タンになると縦1列を消去できます。",
    selectColumn: (column: number) => `${column}列目を消す`,
    slow: "スロータイム",
    slowReady: "使用可能",
    slowCharging: "消去で充填",
    slowActive: (seconds: number) => `残り${seconds.toFixed(1)}秒`,
    slowStarted: "スロータイム発動！ 10秒間、落下速度が半分になります。",
    hold: "ホールド",
    holdEmpty: "空き",
    holdUse: "ペアを保存・交換",
    holdUsed: "次のペアまで使用済み",
    holdStored: "現在のペアをホールドしました。",
    holdSwapped: "ホールド中のペアと交換しました。",
    secondHelp: "スロータイムは10秒間、落下速度を半分にします。16ブロック消去で再使用できます。ホールドは現在のペアを保存し、次回以降に交換できます。"
  },
  en: {
    eyebrow: "FALLING BLOCK PUZZLE / INTERNAL GAME",
    title: "Color Chain Drop",
    idle: "Drop connected pairs and line up four or more matching colors vertically, horizontally, or diagonally.",
    playing: "Connect four matching colors and build a chain reaction.",
    paused: "Paused. Resume when you are ready to continue.",
    resolving: (chain: number, count: number) => `${chain} CHAIN! Cleared ${count} blocks.`,
    gameover: "Game over. Keep space near the top while preparing your chains.",
    score: "Score",
    chain: "Max chain",
    cleared: "Cleared",
    level: "Level",
    next: "Next pairs",
    howTo: "How to Play",
    rules: "Move and rotate each connected pair. After landing, unsupported blocks fall independently. Four or more matching colors in a vertical, horizontal, or diagonal line clear together. New matches formed after blocks fall create chain bonuses. The game ends when blocks rise beyond the top.",
    controls: "Controls",
    keyboard: "PC: Move with ←/→, soft drop with ↓, rotate with Z/X, hard drop with Space, hold with H, use Slow Time with S, target the laser with L, and pause with P. In a one-cell-wide shaft, rotate to flip a vertical pair by 180 degrees.",
    easy: "Easy",
    normal: "Normal",
    hard: "Hard",
    easyDetail: "4 colors · slow",
    normalDetail: "5 colors · standard",
    hardDetail: "6 colors · fast",
    start: "Start game",
    restart: "Restart",
    pause: "Pause",
    resume: "Resume",
    resetBest: "Clear best",
    back: "Back to shelf",
    best: "Best result",
    noBest: "No record yet",
    status: "Status",
    ready: "Ready",
    inPlay: "Playing",
    resolvingLabel: "Resolving chain",
    gameoverLabel: "Game over",
    moveLeft: "Move left",
    moveRight: "Move right",
    rotate: "Rotate clockwise",
    down: "Soft drop",
    hardDrop: "Hard drop",
    bombBlast: (count: number) => `Bomb blast! Destroyed ${count} blocks.`,
    laser: "Column laser",
    laserReady: "Ready",
    laserCharging: "Charging",
    laserSelect: "Select a column to clear.",
    laserCancel: "Cancel selection",
    laserColumn: (column: number) => `Laser fired at column ${column}!`,
    laserMiss: "The laser was fired at an empty column.",
    bombHelp: "Bombs destroy a 3×3 area after landing. When the laser gauge is full, it can clear an entire column.",
    selectColumn: (column: number) => `Clear column ${column}`,
    slow: "Slow Time",
    slowReady: "Ready",
    slowCharging: "Charge by clearing",
    slowActive: (seconds: number) => `${seconds.toFixed(1)}s left`,
    slowStarted: "Slow Time activated! Falling speed is halved for 10 seconds.",
    hold: "Hold",
    holdEmpty: "Empty",
    holdUse: "Store or swap pair",
    holdUsed: "Used until next pair",
    holdStored: "The current pair was moved to Hold.",
    holdSwapped: "Swapped with the held pair.",
    secondHelp: "Slow Time halves the falling speed for 10 seconds and recharges after you clear 16 blocks. Hold stores the current pair and lets you swap it back later."
  }
} as const;

function readBestResults(): Partial<Record<Difficulty, BestResult>> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BEST_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed as Partial<Record<Difficulty, BestResult>> : {};
  } catch {
    return {};
  }
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function statusLabel(status: GameStatus, t: typeof copy.ja | typeof copy.en) {
  if (status === "playing") return t.inPlay;
  if (status === "paused") return t.pause;
  if (status === "resolving") return t.resolvingLabel;
  if (status === "gameover") return t.gameoverLabel;
  return t.ready;
}

export function ColorChain({ onBack }: ColorChainProps) {
  const { language } = useI18n();
  const t = copy[language];
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [activePair, setActivePair] = useState<FallingPair | null>(null);
  const [nextPairs, setNextPairs] = useState<FallingPair[]>([]);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentChain, setCurrentChain] = useState(0);
  const [maxChain, setMaxChain] = useState(0);
  const [clearingCells, setClearingCells] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string>(t.idle);
  const [laserCharge, setLaserCharge] = useState(0);
  const [laserTargeting, setLaserTargeting] = useState(false);
  const [laserColumn, setLaserColumn] = useState<number | null>(null);
  const [holdPair, setHoldPair] = useState<FallingPair | null>(null);
  const [holdUsed, setHoldUsed] = useState(false);
  const [slowCharge, setSlowCharge] = useState(0);
  const [slowActive, setSlowActive] = useState(false);
  const [slowRemaining, setSlowRemaining] = useState(0);
  const [bestResults, setBestResults] = useState<Partial<Record<Difficulty, BestResult>>>(() => readBestResults());

  const boardRef = useRef(board);
  const activePairRef = useRef(activePair);
  const nextPairsRef = useRef(nextPairs);
  const statusRef = useRef(status);
  const difficultyRef = useRef(difficulty);
  const scoreRef = useRef(score);
  const clearedRef = useRef(cleared);
  const levelRef = useRef(level);
  const maxChainRef = useRef(maxChain);
  const laserChargeRef = useRef(laserCharge);
  const laserTargetingRef = useRef(laserTargeting);
  const holdPairRef = useRef(holdPair);
  const holdUsedRef = useRef(holdUsed);
  const slowChargeRef = useRef(slowCharge);
  const slowActiveRef = useRef(slowActive);
  const pairsWithoutBombRef = useRef(0);
  const resolutionToken = useRef(0);

  const settings = difficultySettings[difficulty];
  const ranking = useRanking({ gameId: `color-chain-${difficulty}`, metricLabel: "Score", mode: "higher" });
  const best = bestResults[difficulty];
  const normalDropInterval = Math.max(180, settings.baseSpeed - (level - 1) * 65);
  const dropInterval = slowActive ? normalDropInterval * 2 : normalDropInterval;

  const updateBoard = (next: Board) => {
    boardRef.current = next;
    setBoard(next);
  };

  const updateActivePair = (next: FallingPair | null) => {
    activePairRef.current = next;
    setActivePair(next);
  };

  const updateStatus = (next: GameStatus) => {
    statusRef.current = next;
    setStatus(next);
  };

  const addScore = (points: number) => {
    const nextScore = scoreRef.current + points;
    scoreRef.current = nextScore;
    setScore(nextScore);
  };

  const updateLaserCharge = (next: number) => {
    const normalized = Math.max(0, Math.min(100, next));
    laserChargeRef.current = normalized;
    setLaserCharge(normalized);
  };

  const updateLaserTargeting = (next: boolean) => {
    laserTargetingRef.current = next;
    setLaserTargeting(next);
  };

  const updateHoldUsed = (next: boolean) => {
    holdUsedRef.current = next;
    setHoldUsed(next);
  };

  const updateHoldPair = (next: FallingPair | null) => {
    holdPairRef.current = next;
    setHoldPair(next);
  };

  const updateSlowCharge = (next: number) => {
    const normalized = Math.max(0, Math.min(100, next));
    slowChargeRef.current = normalized;
    setSlowCharge(normalized);
  };

  const updateSlowActive = (next: boolean) => {
    slowActiveRef.current = next;
    setSlowActive(next);
  };

  const recordClearedBlocks = (count: number) => {
    if (count <= 0) return;
    const nextCleared = clearedRef.current + count;
    const nextLevel = Math.floor(nextCleared / 24) + 1;
    clearedRef.current = nextCleared;
    levelRef.current = nextLevel;
    setCleared(nextCleared);
    setLevel(nextLevel);
    updateSlowCharge(addSlowCharge(slowChargeRef.current, count, slowActiveRef.current));
  };

  function createQueuedPair(nextDifficulty: Difficulty) {
    const nextSettings = difficultySettings[nextDifficulty];
    const forceBomb = pairsWithoutBombRef.current >= nextSettings.bombPity;
    const pair = createRandomPair(
      nextSettings.colors,
      Math.random,
      forceBomb ? 1 : nextSettings.bombChance
    );
    if (pair.colors.includes(BOMB_BLOCK)) pairsWithoutBombRef.current = 0;
    else pairsWithoutBombRef.current += 1;
    return pair;
  }

  function finishGame() {
    updateStatus("gameover");
    updateActivePair(null);
    setCurrentChain(0);
    setClearingCells(new Set());
    updateLaserTargeting(false);
    updateSlowActive(false);
    setSlowRemaining(0);
    setLaserColumn(null);
    setMessage(t.gameover);

    const result: BestResult = {
      score: scoreRef.current,
      maxChain: maxChainRef.current,
      cleared: clearedRef.current,
      recordedAt: new Date().toISOString()
    };
    setBestResults((current) => {
      const previous = current[difficultyRef.current];
      if (previous && previous.score >= result.score) return current;
      const next = { ...current, [difficultyRef.current]: result };
      window.localStorage.setItem(BEST_KEY, JSON.stringify(next));
      return next;
    });
  }

  function spawnNext(nextBoard: Board) {
    const queue = nextPairsRef.current.length > 0
      ? nextPairsRef.current
      : Array.from({ length: 3 }, () => createQueuedPair(difficultyRef.current));
    const pair = queue[0];
    const replenished = [
      ...queue.slice(1),
      createQueuedPair(difficultyRef.current)
    ];
    nextPairsRef.current = replenished;
    setNextPairs(replenished);

    if (!pair || !canPlacePair(nextBoard, pair)) {
      finishGame();
      return;
    }

    updateActivePair(pair);
    updateHoldUsed(false);
    updateStatus("playing");
    setCurrentChain(0);
    setMessage(t.playing);
  }

  async function animateGravity(initialBoard: Board, token: number) {
    let nextBoard = initialBoard;

    while (token === resolutionToken.current) {
      const gravity = applyGravityStep(nextBoard);
      if (!gravity.moved) break;
      nextBoard = gravity.board;
      updateBoard(nextBoard);
      await wait(GRAVITY_STEP_DELAY);
    }

    return nextBoard;
  }

  async function resolveBoard(lockedBoard: Board, token: number, spawnAfter = true) {
    let nextBoard = lockedBoard;
    let chain = 0;

    await wait(GRAVITY_STEP_DELAY);
    if (token !== resolutionToken.current) return;
    nextBoard = await animateGravity(nextBoard, token);
    if (token !== resolutionToken.current) return;

    const blast = findBombBlastCells(nextBoard);
    if (blast.cells.size > 0) {
      setClearingCells(new Set(blast.cells));
      setMessage(t.bombBlast(blast.cells.size));
      await wait(CLEAR_DELAY + 80);
      if (token !== resolutionToken.current) return;

      nextBoard = clearMatchedCells(nextBoard, blast.cells);
      updateBoard(nextBoard);
      setClearingCells(new Set());
      recordClearedBlocks(blast.cells.size);
      addScore(blast.cells.size * BOMB_BLOCK_SCORE + blast.bombs.size * BOMB_TRIGGER_SCORE);
      await wait(FALL_DELAY);
      if (token !== resolutionToken.current) return;
      nextBoard = await animateGravity(nextBoard, token);
      if (token !== resolutionToken.current) return;
    }

    while (token === resolutionToken.current) {
      const match = findMatches(nextBoard);
      if (match.cells.size === 0) break;

      chain += 1;
      setCurrentChain(chain);
      setClearingCells(new Set(match.cells));
      setMessage(t.resolving(chain, match.cells.size));
      await wait(CLEAR_DELAY);
      if (token !== resolutionToken.current) return;

      nextBoard = clearMatchedCells(nextBoard, match.cells);
      updateBoard(nextBoard);
      setClearingCells(new Set());
      await wait(FALL_DELAY);
      if (token !== resolutionToken.current) return;

      nextBoard = await animateGravity(nextBoard, token);
      if (token !== resolutionToken.current) return;
      const nextMaxChain = Math.max(maxChainRef.current, chain);
      maxChainRef.current = nextMaxChain;
      setMaxChain(nextMaxChain);
      recordClearedBlocks(match.cells.size);
      addScore(calculateClearScore(match, chain));
      await wait(FALL_DELAY);
    }

    if (token !== resolutionToken.current) return;
    if (hasBlocksAboveTop(nextBoard)) {
      finishGame();
      return;
    }
    if (spawnAfter) {
      spawnNext(nextBoard);
    } else {
      updateStatus("playing");
      setCurrentChain(0);
      setMessage(t.playing);
    }
  }

  function lockPair(pair: FallingPair) {
    if (statusRef.current !== "playing") return;
    const lockedBoard = mergePair(boardRef.current, pair);
    updateBoard(lockedBoard);
    updateActivePair(null);
    updateStatus("resolving");
    const token = resolutionToken.current + 1;
    resolutionToken.current = token;
    void resolveBoard(lockedBoard, token);
  }

  function beginLaserTargeting() {
    if (statusRef.current !== "playing" || laserChargeRef.current < 100) return;
    updateLaserTargeting(true);
    setMessage(t.laserSelect);
  }

  function cancelLaserTargeting() {
    if (!laserTargetingRef.current) return;
    updateLaserTargeting(false);
    setMessage(t.playing);
  }

  async function resolveLaser(column: number, token: number) {
    const result = findLaserClearCells(boardRef.current, column);
    setLaserColumn(column);
    setMessage(result.cells.size > 0 ? t.laserColumn(column + 1) : t.laserMiss);
    setClearingCells(new Set(result.cells));
    await wait(CLEAR_DELAY + 80);
    if (token !== resolutionToken.current) return;

    let nextBoard = boardRef.current;
    if (result.cells.size > 0) {
      nextBoard = clearMatchedCells(nextBoard, result.cells);
      updateBoard(nextBoard);
      recordClearedBlocks(result.cells.size);
      addScore(result.cells.size * LASER_BLOCK_SCORE + result.bombs.size * BOMB_TRIGGER_SCORE);
    }
    setClearingCells(new Set());
    setLaserColumn(null);
    await wait(FALL_DELAY);
    if (token !== resolutionToken.current) return;
    await resolveBoard(nextBoard, token, false);
  }

  function fireLaser(column: number) {
    if (!laserTargetingRef.current || statusRef.current !== "playing") return;
    updateLaserTargeting(false);
    updateLaserCharge(0);
    updateStatus("resolving");
    const token = resolutionToken.current + 1;
    resolutionToken.current = token;
    void resolveLaser(column, token);
  }

  function startGame(nextDifficulty: Difficulty = difficulty) {
    resolutionToken.current += 1;
    difficultyRef.current = nextDifficulty;
    setDifficulty(nextDifficulty);
    const nextBoard = createEmptyBoard();
    pairsWithoutBombRef.current = 0;
    const firstPair = createQueuedPair(nextDifficulty);
    const queue = Array.from({ length: 3 }, () => createQueuedPair(nextDifficulty));

    boardRef.current = nextBoard;
    activePairRef.current = firstPair;
    nextPairsRef.current = queue;
    statusRef.current = "playing";
    scoreRef.current = 0;
    clearedRef.current = 0;
    levelRef.current = 1;
    maxChainRef.current = 0;
    laserChargeRef.current = 0;
    laserTargetingRef.current = false;
    holdPairRef.current = null;
    holdUsedRef.current = false;
    slowChargeRef.current = 100;
    slowActiveRef.current = false;
    setBoard(nextBoard);
    setActivePair(firstPair);
    setNextPairs(queue);
    setStatus("playing");
    setScore(0);
    setCleared(0);
    setLevel(1);
    setCurrentChain(0);
    setMaxChain(0);
    setClearingCells(new Set());
    setLaserCharge(0);
    setLaserTargeting(false);
    setLaserColumn(null);
    setHoldPair(null);
    setHoldUsed(false);
    setSlowCharge(100);
    setSlowActive(false);
    setSlowRemaining(0);
    setMessage(t.playing);
  }

  function holdCurrentPair() {
    const currentPair = activePairRef.current;
    if (
      statusRef.current !== "playing"
      || !currentPair
      || holdUsedRef.current
      || laserTargetingRef.current
    ) return;

    const storedPair = preparePairForSpawn(currentPair);
    const previousHold = holdPairRef.current;
    let replacement: FallingPair | undefined;

    if (previousHold) {
      replacement = preparePairForSpawn(previousHold);
      updateHoldPair(storedPair);
    } else {
      const queue = nextPairsRef.current.length > 0
        ? nextPairsRef.current
        : Array.from({ length: 3 }, () => createQueuedPair(difficultyRef.current));
      replacement = queue[0];
      const replenished = [
        ...queue.slice(1),
        createQueuedPair(difficultyRef.current)
      ];
      nextPairsRef.current = replenished;
      setNextPairs(replenished);
      updateHoldPair(storedPair);
    }

    if (!replacement || !canPlacePair(boardRef.current, replacement)) {
      finishGame();
      return;
    }

    updateActivePair(replacement);
    updateHoldUsed(true);
    setMessage(previousHold ? t.holdSwapped : t.holdStored);
  }

  function activateSlowTime() {
    if (
      statusRef.current !== "playing"
      || laserTargetingRef.current
      || slowActiveRef.current
      || slowChargeRef.current < 100
    ) return;

    updateSlowCharge(0);
    updateSlowActive(true);
    setSlowRemaining(SLOW_DURATION);
    setMessage(t.slowStarted);
  }

  function moveHorizontal(direction: -1 | 1) {
    const pair = activePairRef.current;
    if (statusRef.current !== "playing" || !pair) return;
    const candidate = movePair(pair, 0, direction);
    if (canPlacePair(boardRef.current, candidate)) updateActivePair(candidate);
  }

  function softDrop() {
    const pair = activePairRef.current;
    if (statusRef.current !== "playing" || !pair) return;
    const candidate = movePair(pair, 1, 0);
    if (canPlacePair(boardRef.current, candidate)) {
      updateActivePair(candidate);
      addScore(1);
    } else {
      lockPair(pair);
    }
  }

  function automaticDrop() {
    const pair = activePairRef.current;
    if (statusRef.current !== "playing" || !pair) return;
    const candidate = movePair(pair, 1, 0);
    if (canPlacePair(boardRef.current, candidate)) updateActivePair(candidate);
    else lockPair(pair);
  }

  function hardDrop() {
    const pair = activePairRef.current;
    if (statusRef.current !== "playing" || !pair) return;
    const ghost = getGhostPair(boardRef.current, pair);
    addScore(Math.max(0, ghost.row - pair.row) * 2);
    updateActivePair(ghost);
    lockPair(ghost);
  }

  function rotate(direction: -1 | 1) {
    const pair = activePairRef.current;
    if (statusRef.current !== "playing" || !pair) return;
    updateActivePair(rotatePair(boardRef.current, pair, direction));
  }

  function togglePause() {
    if (statusRef.current === "playing") {
      updateLaserTargeting(false);
      updateStatus("paused");
      setMessage(t.paused);
    } else if (statusRef.current === "paused") {
      updateStatus("playing");
      setMessage(t.playing);
    }
  }

  useEffect(() => {
    if (status !== "playing" || laserTargeting) return;
    const timer = window.setInterval(automaticDrop, dropInterval);
    return () => window.clearInterval(timer);
  }, [dropInterval, laserTargeting, status]);

  useEffect(() => {
    if (status !== "playing" || laserTargeting || laserCharge >= 100) return;
    const timer = window.setInterval(() => {
      const seconds = difficultySettings[difficultyRef.current].laserSeconds;
      updateLaserCharge(laserChargeRef.current + (100 * LASER_TICK) / (seconds * 1000));
    }, LASER_TICK);
    return () => window.clearInterval(timer);
  }, [laserCharge, laserTargeting, status]);

  useEffect(() => {
    if (!slowActive || status !== "playing" || laserTargeting) return;
    const timer = window.setInterval(() => {
      setSlowRemaining((current) => {
        const next = Math.max(0, current - SLOW_TICK / 1000);
        if (next === 0) updateSlowActive(false);
        return next;
      });
    }, SLOW_TICK);
    return () => window.clearInterval(timer);
  }, [laserTargeting, slowActive, status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const controlKeys = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "z", "Z", "x", "X", "h", "H", "s", "S", "p", "P", "l", "L", "Escape", "1", "2", "3", "4", "5", "6", "7", "8"];
      if (!controlKeys.includes(event.key)) return;
      event.preventDefault();

      if (laserTargetingRef.current) {
        if (event.key === "Escape") cancelLaserTargeting();
        if (/^[1-8]$/.test(event.key)) fireLaser(Number(event.key) - 1);
        return;
      }

      if (event.key === "l" || event.key === "L") {
        beginLaserTargeting();
        return;
      }

      if (event.key === "p" || event.key === "P") {
        togglePause();
        return;
      }
      if (statusRef.current !== "playing") return;
      if (event.key === "h" || event.key === "H") holdCurrentPair();
      if (event.key === "s" || event.key === "S") activateSlowTime();
      if (event.key === "ArrowLeft") moveHorizontal(-1);
      if (event.key === "ArrowRight") moveHorizontal(1);
      if (event.key === "ArrowDown") softDrop();
      if (event.key === "ArrowUp" || event.key === "x" || event.key === "X") rotate(1);
      if (event.key === "z" || event.key === "Z") rotate(-1);
      if (event.key === " ") hardDrop();
    };
    const handleVisibility = () => {
      if (document.hidden && statusRef.current === "playing") togglePause();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [language]);

  useEffect(() => {
    if (status === "idle") setMessage(t.idle);
    if (status === "playing") setMessage(laserTargeting ? t.laserSelect : t.playing);
    if (status === "paused") setMessage(t.paused);
    if (status === "gameover") setMessage(t.gameover);
  }, [language, laserTargeting, status, t.gameover, t.idle, t.laserSelect, t.paused, t.playing]);

  const ghostPair = activePair ? getGhostPair(board, activePair) : null;
  const visibleCells = useMemo(() => {
    const cells = Array.from({ length: VISIBLE_ROWS * BOARD_COLUMNS }, (_, index) => {
      const visibleRow = Math.floor(index / BOARD_COLUMNS);
      const column = index % BOARD_COLUMNS;
      const boardRow = visibleRow + HIDDEN_ROWS;
      return {
        row: boardRow,
        column,
        color: board[boardRow][column],
        active: false,
        ghost: false
      };
    });
    const byKey = new Map(cells.map((cell) => [cellKey(cell.row, cell.column), cell]));

    if (ghostPair && activePair) {
      getPairCells(ghostPair).forEach(({ row, column, color }) => {
        const cell = byKey.get(cellKey(row, column));
        if (cell && !cell.color) {
          cell.color = color;
          cell.ghost = true;
        }
      });
    }
    if (activePair) {
      getPairCells(activePair).forEach(({ row, column, color }) => {
        const cell = byKey.get(cellKey(row, column));
        if (cell) {
          cell.color = color;
          cell.active = true;
          cell.ghost = false;
        }
      });
    }
    return cells;
  }, [activePair, board, ghostPair]);

  const resetBest = () => {
    const next = { ...bestResults };
    delete next[difficulty];
    setBestResults(next);
    window.localStorage.setItem(BEST_KEY, JSON.stringify(next));
  };

  return (
    <section className="puzzle-shell color-chain-shell" aria-labelledby="color-chain-title">
      <div className="puzzle-hero color-chain-hero">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 id="color-chain-title">{t.title}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel color-chain-score" aria-label={t.status}>
          <div><span>{t.score}</span><strong>{score.toLocaleString()}</strong></div>
          <div><span>{t.chain}</span><strong>{maxChain}</strong></div>
          <div><span>{t.cleared}</span><strong>{cleared}</strong></div>
          <div><span>{t.level}</span><strong>{level}</strong></div>
        </div>
      </div>

      <div className="puzzle-layout color-chain-layout">
        <div className="color-chain-play-area">
          <div className="color-chain-board-wrap">
            <div className="color-chain-board" role="grid" aria-label={`${t.title} board`}>
              {visibleCells.map((cell) => (
                <div
                  aria-label={cell.color ? `${cell.row - HIDDEN_ROWS + 1}, ${cell.column + 1}, ${cell.color}` : `${cell.row - HIDDEN_ROWS + 1}, ${cell.column + 1}, empty`}
                  className={`color-chain-cell${cell.color ? ` is-${cell.color}` : ""}${cell.active ? " is-active" : ""}${cell.ghost ? " is-ghost" : ""}${clearingCells.has(cellKey(cell.row, cell.column)) ? " is-clearing" : ""}`}
                  data-symbol={cell.color ? symbols[cell.color] : ""}
                  key={cellKey(cell.row, cell.column)}
                  role="gridcell"
                />
              ))}
            </div>

            {laserTargeting && (
              <div className="color-chain-laser-selector" aria-label={t.laserSelect}>
                {Array.from({ length: BOARD_COLUMNS }, (_, column) => (
                  <button
                    aria-label={t.selectColumn(column + 1)}
                    key={column}
                    onClick={() => fireLaser(column)}
                    type="button"
                  ><span>{column + 1}</span></button>
                ))}
              </div>
            )}

            {laserColumn !== null && (
              <div className="color-chain-laser-beams" aria-hidden="true">
                {Array.from({ length: BOARD_COLUMNS }, (_, column) => (
                  <i className={laserColumn === column ? "is-active" : ""} key={column} />
                ))}
              </div>
            )}

            {currentChain >= 2 && status === "resolving" && (
              <div className="color-chain-burst" aria-live="polite">
                <Sparkles aria-hidden="true" />
                <strong>{currentChain} CHAIN!</strong>
              </div>
            )}

            {(status === "idle" || status === "paused" || status === "gameover") && (
              <div className="color-chain-overlay">
                {status === "paused" ? <Pause aria-hidden="true" /> : status === "gameover" ? <RotateCcw aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                <strong>{statusLabel(status, t)}</strong>
                <button className="primary-button" type="button" onClick={() => status === "paused" ? togglePause() : startGame()}>
                  {status === "paused" ? <Play aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                  {status === "paused" ? t.resume : status === "gameover" ? t.restart : t.start}
                </button>
              </div>
            )}
          </div>

          <div className="color-chain-touch-controls" aria-label={t.controls}>
            <button type="button" disabled={status !== "playing" || laserTargeting} onClick={() => moveHorizontal(-1)} aria-label={t.moveLeft}><ArrowLeft /></button>
            <button type="button" disabled={status !== "playing" || laserTargeting} onClick={() => rotate(1)} aria-label={t.rotate}><RotateCw /></button>
            <button type="button" disabled={status !== "playing" || laserTargeting} onClick={softDrop} aria-label={t.down}><ArrowDown /></button>
            <button type="button" disabled={status !== "playing" || laserTargeting} onClick={hardDrop} aria-label={t.hardDrop}><ChevronsDown /></button>
            <button type="button" disabled={status !== "playing" || laserTargeting} onClick={() => moveHorizontal(1)} aria-label={t.moveRight}><ArrowRight /></button>
          </div>

          <div className={`color-chain-laser-panel${laserCharge >= 100 ? " is-ready" : ""}`}>
            <div className="color-chain-laser-heading">
              <span><Zap aria-hidden="true" /> {t.laser}</span>
              <strong>{laserCharge >= 100 ? t.laserReady : `${Math.floor(laserCharge)}%`}</strong>
            </div>
            <div
              aria-label={t.laser}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(laserCharge)}
              className="color-chain-laser-gauge"
              role="progressbar"
            ><i style={{ width: `${laserCharge}%` }} /></div>
            <button
              className={laserTargeting ? "ghost-button" : "primary-button"}
              disabled={!laserTargeting && (status !== "playing" || laserCharge < 100)}
              onClick={laserTargeting ? cancelLaserTargeting : beginLaserTargeting}
              type="button"
            >
              {laserTargeting ? <X aria-hidden="true" /> : <Zap aria-hidden="true" />}
              {laserTargeting ? t.laserCancel : laserCharge >= 100 ? t.laserReady : t.laserCharging}
            </button>
          </div>

          <div className="color-chain-second-tools">
            <div className={`color-chain-tool-card color-chain-slow${slowActive ? " is-active" : slowCharge >= 100 ? " is-ready" : ""}`}>
              <div className="color-chain-tool-heading">
                <span><Snowflake aria-hidden="true" /> {t.slow}</span>
                <strong>{slowActive ? t.slowActive(slowRemaining) : slowCharge >= 100 ? t.slowReady : `${Math.floor(slowCharge)}%`}</strong>
              </div>
              <div
                aria-label={t.slow}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.round(slowCharge)}
                className="color-chain-slow-gauge"
                role="progressbar"
              ><i style={{ width: `${slowActive ? (slowRemaining / SLOW_DURATION) * 100 : slowCharge}%` }} /></div>
              <button
                className="primary-button"
                data-testid="color-chain-slow-button"
                disabled={status !== "playing" || laserTargeting || slowActive || slowCharge < 100}
                onClick={activateSlowTime}
                type="button"
              >
                <Snowflake aria-hidden="true" />
                {slowActive ? t.slowActive(slowRemaining) : slowCharge >= 100 ? t.slowReady : t.slowCharging}
              </button>
            </div>

            <div className={`color-chain-tool-card color-chain-hold${holdUsed ? " is-used" : ""}`}>
              <div className="color-chain-tool-heading">
                <span><RotateCcw aria-hidden="true" /> {t.hold}</span>
                <strong>{holdPair ? "" : t.holdEmpty}</strong>
              </div>
              <div className="color-chain-hold-slot" data-testid="color-chain-hold-slot">
                {holdPair ? (
                  <span className="color-chain-next-pair">
                    {holdPair.colors.map((color, index) => (
                      <i className={`is-${color}`} data-symbol={symbols[color]} key={`${color}-${index}`} />
                    ))}
                  </span>
                ) : <span>{t.holdEmpty}</span>}
              </div>
              <button
                className="ghost-button"
                data-testid="color-chain-hold-button"
                disabled={status !== "playing" || laserTargeting || holdUsed || !activePair}
                onClick={holdCurrentPair}
                type="button"
              >
                <RotateCcw aria-hidden="true" />
                {holdUsed ? t.holdUsed : t.holdUse}
              </button>
            </div>
          </div>
        </div>

        <aside className="puzzle-side color-chain-side">
          <div className="color-chain-next rule-card">
            <h2>{t.next}</h2>
            <div>
              {nextPairs.map((pair, index) => (
                <span className="color-chain-next-pair" key={`${index}-${pair.colors.join("-")}`}>
                  {pair.colors.map((color, colorIndex) => (
                    <i className={`is-${color}`} data-symbol={symbols[color]} key={`${color}-${colorIndex}`} />
                  ))}
                </span>
              ))}
            </div>
          </div>

          <div className="rule-card">
            <h2>{t.howTo}</h2>
            <p>{t.rules}</p>
            <p className="color-chain-item-help"><Bomb aria-hidden="true" /> {t.bombHelp}</p>
            <p className="color-chain-item-help is-second"><Snowflake aria-hidden="true" /> {t.secondHelp}</p>
            <h3>{t.controls}</h3>
            <p>{t.keyboard}</p>
          </div>

          <div className="color-chain-difficulties" aria-label="Difficulty">
            {(["easy", "normal", "hard"] as Difficulty[]).map((entry) => (
              <button
                className={difficulty === entry ? "is-selected" : ""}
                disabled={status === "playing" || status === "resolving" || status === "paused"}
                key={entry}
                type="button"
                onClick={() => startGame(entry)}
              >
                <strong>{t[entry]}</strong>
                <small>{t[`${entry}Detail` as "easyDetail" | "normalDetail" | "hardDetail"]}</small>
              </button>
            ))}
          </div>

          <div className="color-chain-progress">
            <span>{t.status}: <strong>{statusLabel(status, t)}</strong></span>
            <span>{t.best}: <strong>{best ? `${best.score.toLocaleString()} / ${best.maxChain} CHAIN` : t.noBest}</strong></span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "gameover" ? {
              score,
              display: `${score.toLocaleString()}${language === "ja" ? "点" : " pts"}`,
              meta: `${maxChain} CHAIN · ${t[difficulty]}`
            } : null}
          />

          <div className="control-row color-chain-actions">
            <button className="primary-button" type="button" onClick={() => startGame()}>
              <RotateCcw aria-hidden="true" />
              {status === "idle" ? t.start : t.restart}
            </button>
            <button className="ghost-button" type="button" disabled={status !== "playing" && status !== "paused"} onClick={togglePause}>
              {status === "paused" ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
              {status === "paused" ? t.resume : t.pause}
            </button>
            <button className="ghost-button" type="button" onClick={resetBest}>
              <RotateCcw aria-hidden="true" />
              {t.resetBest}
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>{t.back}</button>
        </aside>
      </div>
    </section>
  );
}
