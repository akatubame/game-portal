import {
  ArrowLeft,
  Clock3,
  Grid3X3,
  HelpCircle,
  Languages,
  Lightbulb,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X
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
import { useRanking } from "../ranking";
import {
  BOMB_BLOCK,
  COLOR_BREAKER_BLOCK,
  HORIZONTAL_LASER_BLOCK,
  VERTICAL_LASER_BLOCK,
  type Board,
  type BlockToken
} from "./tokens";
import {
  chooseSafeBlockedRotationPoint,
  classifyRotationGesture,
  findChangedOccupiedCells,
  findRefilledCells,
  moveRotationPoint
} from "./rotationInteraction";
import {
  ROTATION_COLUMNS,
  ROTATION_ROWS,
  calculateRotationClearScore,
  collapseRotationColumns,
  createPlayableRotationBoard,
  enumerateProductiveRotations,
  refillRotationBoard,
  resolveRotationChain,
  rotateSquare,
  shuffleToPlayableRotationBoard,
  type RotationDirection,
  type RotationChainStep,
  type RotationMove,
  type RotationPoint
} from "./rotationLogic";
import {
  calculateRotationSpecialScore,
  clearRotationCellsWithRewards,
  findRotationSpecialClearCells,
  type RotationSpecialEffect
} from "./rotationSpecials";
import {
  appendColorChainEvaluation,
  FALLING_EVALUATION_KEY,
  readColorChainEvaluations,
  ROTATION_EVALUATION_KEY,
  summarizeColorChainEvaluations,
  type ColorChainEvaluation
} from "./evaluation";

type ColorChainRotationTestProps = {
  onBack: () => void;
};

type RotationPhase =
  | "idle"
  | "paused"
  | "ready"
  | "selecting"
  | "rotating"
  | "validating"
  | "reverting"
  | "grand-spell"
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

type ChromaMood = "idle" | "blink" | "chain" | "danger" | "defeat";
type MokoMood = "idle" | "light" | "medium" | "heavy" | "purified";
type BattleImpact = "light" | "medium" | "heavy" | null;
type RotationOverlayPanel = "help" | "settings" | "tutorial" | null;
type RotationBest = {
  maxChain: number;
  remainingTime: number;
  score: number;
};
type GrandSpellId =
  | "grand-chain-bomb"
  | "trinity-pillar"
  | "trinity-wave"
  | "prism-nova"
  | "ultimate-magical-chain";
type GrandSpellCutin = {
  detail?: string;
  id: GrandSpellId;
  kicker: string;
  name: string;
  sequence: number;
};
type RotationAudio = {
  bgm: HTMLAudioElement;
  chain: HTMLAudioElement;
  strong: HTMLAudioElement;
  moreStrong: HTMLAudioElement;
  gameOver: HTMLAudioElement;
};

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;
const GAME_SECONDS = 120;
const CLEAR_TARGET = 90;
const ROTATION_DURATION = 160;
const INVALID_PAUSE = 90;
const CLEAR_DURATION = 250;
const FALL_DURATION = 170;
const REFILL_DURATION = 190;
const GRAND_SPELL_DURATION = 760;
const TIME_VEIL_DURATION = 6;
const TIME_VEIL_CHARGE_BLOCKS = 20;
const CHAIN_WAVE_CHARGE_BLOCKS = 24;
const CHAIN_WAVE_SCORE_PER_BLOCK = 18;
const MOKO_ATTACK_SECONDS = 24;
const MOKO_ATTACK_FORECAST_PERCENT = 72;
const MOKO_SLIME_DURATION = 6;
const AUTO_HINT_DELAY = 10_000;
const HINT_VISIBLE_DURATION = 3_500;
const rotationSettings = {
  colorCount: 4,
  maxChainSteps: 30,
  maxSpecialBlocks: 6,
  specialDropRate: 0.02
} as const;
const AUDIO_ENABLED_KEY = "game-shelf-color-chain-audio-enabled";
const ROTATION_BEST_KEY = "game-shelf-color-chain-rotate-v1-best";
const ROTATION_TUTORIAL_KEY = "game-shelf-color-chain-rotate-v1-tutorial";
const ROTATION_AUTO_HINT_KEY = "game-shelf-color-chain-rotate-v1-auto-hint";
const ROTATION_EFFECTS_KEY = "game-shelf-color-chain-rotate-v1-effects";
const ROTATION_CHROMA_KEY = "game-shelf-color-chain-rotate-v1-chroma";
const audioPaths = {
  bgm: "/audio/color-chain/block-puzzle-blues.mp3",
  chain: "/audio/color-chain/magical-chain.mp3",
  strong: "/audio/color-chain/strong-magic.mp3",
  moreStrong: "/audio/color-chain/more-strong-magic.mp3",
  gameOver: "/audio/color-chain/game-over.mp3"
} as const;
const chromaAssets: Record<ChromaMood, string> = {
  idle: "/characters/chroma/chroma-idle",
  blink: "/characters/chroma/chroma-blink",
  chain: "/characters/chroma/chroma-chain",
  danger: "/characters/chroma/chroma-danger",
  defeat: "/characters/chroma/chroma-defeat"
};
const mokoAssets: Record<MokoMood, string> = {
  idle: "/characters/moko/moko-idle",
  light: "/characters/moko/moko-hit-light",
  medium: "/characters/moko/moko-hit-medium",
  heavy: "/characters/moko/moko-hit-heavy",
  purified: "/characters/moko/moko-purified"
};
const grandSpellIds = {
  [BOMB_BLOCK]: "grand-chain-bomb",
  [VERTICAL_LASER_BLOCK]: "trinity-pillar",
  [HORIZONTAL_LASER_BLOCK]: "trinity-wave",
  [COLOR_BREAKER_BLOCK]: "prism-nova"
} as const satisfies Record<RotationSpecialEffect["token"], GrandSpellId>;
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

const specialNames = {
  ja: {
    [BOMB_BLOCK]: ["チェインボム", "グランドチェインボム"],
    [VERTICAL_LASER_BLOCK]: ["チェインピラー", "トリニティピラー"],
    [HORIZONTAL_LASER_BLOCK]: ["チェインウェーブ", "トリニティウェーブ"],
    [COLOR_BREAKER_BLOCK]: ["プリズムブレイク", "プリズムノヴァ"]
  },
  en: {
    [BOMB_BLOCK]: ["Chain Bomb", "Grand Chain Bomb"],
    [VERTICAL_LASER_BLOCK]: ["Chain Pillar", "Trinity Pillar"],
    [HORIZONTAL_LASER_BLOCK]: ["Chain Wave", "Trinity Wave"],
    [COLOR_BREAKER_BLOCK]: ["Prism Break", "Prism Nova"]
  }
} as const;

function getDominantSpecialEffect(effects: RotationSpecialEffect[]) {
  const tokenPriority = {
    [VERTICAL_LASER_BLOCK]: 1,
    [HORIZONTAL_LASER_BLOCK]: 1,
    [BOMB_BLOCK]: 2,
    [COLOR_BREAKER_BLOCK]: 3
  } as const;
  return effects.reduce<RotationSpecialEffect | null>((dominant, effect) => {
    if (!dominant) return effect;
    const dominantPriority = (dominant.super ? 10 : 0) + tokenPriority[dominant.token];
    const effectPriority = (effect.super ? 10 : 0) + tokenPriority[effect.token];
    return effectPriority >= dominantPriority ? effect : dominant;
  }, null);
}

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
    successfulMoves: "成功手",
    invalidMoves: "不成立手",
    successRate: "成功率",
    remainingTime: "残り時間",
    sealGauge: "封印ゲージ",
    target: `目標 ${CLEAR_TARGET}個消去`,
    selectedPoint: "選択中の交点",
    pointValue: (point: RotationPoint) => `${point.row + 1}行・${point.column + 1}列`,
    clockwise: "時計回り",
    counterclockwise: "反時計回り",
    hint: "ヒント",
    start: "試作ゲームを開始",
    retry: "もう一度遊ぶ",
    startDescription: `${GAME_SECONDS}秒以内に${CLEAR_TARGET}個消して封印ゲージを満タンにしてください。`,
    ready: "交点をタップ、または右・左へスワイプして2×2を回転します。",
    cancelled: "縦方向の操作はキャンセルされました。",
    invalid: "チェイン不成立。元の配置へ戻します。",
    chain: (chain: number, points: number) => `${chain} CHAIN!  +${points}`,
    specialChain: (name: string, chain: number, points: number) =>
      `${name}！  ${chain} CHAIN  +${points}`,
    ultimateChain: "アルティメットマジカルチェイン",
    supportSkills: "補助技",
    timeVeil: "タイムヴェール",
    timeVeilActive: (seconds: number) => `時間停止 ${seconds.toFixed(1)}秒`,
    timeVeilStarted: "タイムヴェール！ 6秒間、操作中の制限時間を停止します。",
    timeVeilEnded: "タイムヴェールの効果が終了しました。",
    chainWave: "チェインウェーブ",
    chainWaveSelect: "消去する横一列を選んでください。",
    chainWaveCancel: "行選択をキャンセル",
    chainWaveResult: (row: number, count: number) =>
      `チェインウェーブ！ ${row}行目から${count}個消去`,
    waveRowAria: (row: number) => `${row}行目へチェインウェーブを発動`,
    charge: (percent: number) => `${percent}%`,
    readyLabel: "READY",
    interference: "ぬめり結び",
    interferenceForecast: "ぬめり結びの予告地点が現れました。",
    interferenceCast: (point: RotationPoint) =>
      `${point.row + 1}行・${point.column + 1}列の交点が6秒間ぬめりで封鎖されました。`,
    interferenceBlocked: "この交点はぬめり結びで封鎖されています。",
    interferenceEnded: "ぬめり結びが解けました。",
    interferenceFizzle: "安全に封じられる交点がなく、ぬめり結びは不発になりました。",
    interferenceReady: "発動間近",
    help: "遊び方",
    settings: "設定",
    close: "閉じる",
    rulesTitle: "盤面回転の基本",
    rules: "交点をタップすると2×2が時計回り、右スワイプでも時計回り、左スワイプでは反時計回りに回転します。同色を縦・横・斜めに4個以上揃えるとマジカルチェインが発生します。揃わない回転は元へ戻ります。",
    specialGuide: "特殊ブロック",
    specialGuideText: "チェインボムは3×3、チェインピラーは縦一列、チェインウェーブは横一列、プリズムブレイクは対象色を消去します。同種が隣接するとスーパー技へ変化します。",
    supportGuide: "補助技と妨害",
    supportGuideText: "消去で補助技ゲージがたまります。タイムヴェールは6秒停止、チェインウェーブは選んだ横一列を消去します。モコスライムのぬめり結びは予告された交点を6秒封鎖します。",
    soundSetting: "BGM・SE",
    effectsSetting: "画面効果",
    chromaSetting: "クロマ表示",
    autoHintSetting: "10秒後の自動ヒント",
    on: "ON",
    off: "OFF",
    settingsSaved: "設定はこの端末へ自動保存されます。",
    tutorialTitle: "はじめての盤面回転",
    tutorialSteps: [
      "交点をタップすると、周囲の2×2が時計回りに回転します。",
      "交点から右へスワイプしても時計回りに回転します。",
      "左へスワイプすると反時計回りに回転します。",
      "4個以上揃わない回転は自動で元へ戻ります。光るヒントも活用してください。"
    ],
    tutorialNext: "次へ",
    tutorialStart: "ゲームへ",
    tutorialReplay: "チュートリアルを再表示",
    tutorialStep: (step: number) => `STEP ${step}/4`,
    bestRecord: "ベスト記録",
    noBest: "まだ記録がありません",
    rankingTitle: "ローカルランキング",
    rankingName: "名前",
    rankingSubmit: "記録を登録",
    rankingSubmitted: "登録済み",
    evaluationTitle: "試作評価データ",
    evaluationEmpty: "プレイ完了後に端末内へ集計されます。",
    evaluationSummary: (plays: number, clearRate: number, averageTime: number, averageChain: number) =>
      `${plays}回 / クリア率${clearRate}% / 平均${averageTime}秒 / 平均最大${averageChain} CHAIN`,
    comparisonTitle: "落下式との比較",
    comparisonDescription: "同じ端末・ブラウザに保存された直近20プレイを比較します。",
    rotationMode: "盤面回転式",
    fallingMode: "落下式",
    comparisonPlays: "回数",
    comparisonClearRate: "達成率",
    comparisonTime: "平均時間",
    comparisonChain: "平均最大CHAIN",
    comparisonSpecials: "平均特殊技",
    comparisonInvalid: "不成立率",
    comparisonShuffles: "平均再構成",
    comparisonUnavailable: "未計測",
    comparisonNotApplicable: "対象外",
    comparisonRefresh: "比較データを再読込",
    comparisonNote: "落下式はモコスライム浄化（50個消去）まで、回転式は封印完了（90個消去）までを達成として計測します。",
    shuffled: "成立手がなくなったため、盤面を再構成しました。",
    hintMessage: (direction: RotationDirection) =>
      `光っている交点を${direction === "clockwise" ? "時計回り" : "反時計回り"}に回してみましょう。`,
    clearTitle: "封印成功！",
    clearDescription: "消去目標を達成しました。",
    timeoutTitle: "時間切れ",
    timeoutDescription: "盤面を見直して、もう一度挑戦しましょう。",
    rotateNotice: "横向きにすると固定画面を大きく表示できます。",
    keyboardHelp: "矢印キーで交点移動、Enterで時計回り、Shift+EnterまたはZで反時計回り",
    soundOn: "サウンドをON",
    soundOff: "サウンドをOFF",
    chromaName: "彩鎖の魔女 クロマ",
    mokoName: "モコスライム",
    chromaIdle: "盤面を見守っています。",
    chromaChain: "マジカルチェイン成功！",
    chromaDanger: "残り時間に気をつけて！",
    chromaDefeat: "もう一度、鎖をつなぎ直しましょう。",
    mokoIdle: "色の乱れをまとって、ぷるぷるしています。",
    mokoLight: "ぴょこん！ 鎖の魔法が届きました。",
    mokoMedium: "ぷるぷる！ 大きく乱れがほどけました。",
    mokoHeavy: "大きくぐらり！ 強い魔法が直撃しました。",
    mokoPurified: "浄化完了！ モコスライムはおとなしくなりました。",
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
    successfulMoves: "Successful",
    invalidMoves: "Invalid",
    successRate: "Success Rate",
    remainingTime: "Time Left",
    sealGauge: "Seal Gauge",
    target: `Clear ${CLEAR_TARGET} blocks`,
    selectedPoint: "Selected Point",
    pointValue: (point: RotationPoint) => `Row ${point.row + 1}, Column ${point.column + 1}`,
    clockwise: "Clockwise",
    counterclockwise: "Counterclockwise",
    hint: "Hint",
    start: "Start Prototype",
    retry: "Play Again",
    startDescription: `Clear ${CLEAR_TARGET} blocks within ${GAME_SECONDS} seconds to fill the Seal Gauge.`,
    ready: "Tap an intersection, or swipe right or left, to rotate its 2×2 group.",
    cancelled: "Vertical input was cancelled.",
    invalid: "No chain formed. Restoring the previous layout.",
    chain: (chain: number, points: number) => `${chain} CHAIN!  +${points}`,
    specialChain: (name: string, chain: number, points: number) =>
      `${name}!  ${chain} CHAIN  +${points}`,
    ultimateChain: "Ultimate Magical Chain",
    supportSkills: "Support Spells",
    timeVeil: "Time Veil",
    timeVeilActive: (seconds: number) => `Time stopped: ${seconds.toFixed(1)}s`,
    timeVeilStarted: "Time Veil! The play timer is stopped for 6 seconds.",
    timeVeilEnded: "Time Veil has ended.",
    chainWave: "Chain Wave",
    chainWaveSelect: "Select one row to clear.",
    chainWaveCancel: "Cancel row selection",
    chainWaveResult: (row: number, count: number) =>
      `Chain Wave! Cleared ${count} blocks from row ${row}.`,
    waveRowAria: (row: number) => `Cast Chain Wave on row ${row}`,
    charge: (percent: number) => `${percent}%`,
    readyLabel: "READY",
    interference: "Slime Bind",
    interferenceForecast: "Slime Bind is targeting an intersection.",
    interferenceCast: (point: RotationPoint) =>
      `Intersection ${point.row + 1}-${point.column + 1} is sealed for 6 seconds.`,
    interferenceBlocked: "Slime Bind is blocking this intersection.",
    interferenceEnded: "Slime Bind has worn off.",
    interferenceFizzle: "No safe intersection could be sealed. Slime Bind fizzled.",
    interferenceReady: "DANGER",
    help: "How to Play",
    settings: "Settings",
    close: "Close",
    rulesTitle: "Rotation Basics",
    rules: "Tap an intersection to rotate its 2×2 group clockwise. Swipe right for clockwise or left for counterclockwise. Match four or more blocks vertically, horizontally, or diagonally to cast a Magical Chain. Rotations without a match return to their previous state.",
    specialGuide: "Special Blocks",
    specialGuideText: "Chain Bomb clears 3×3, Chain Pillar clears a column, Chain Wave clears a row, and Prism Break clears its target color. Adjacent matching specials combine into a super spell.",
    supportGuide: "Support & Interference",
    supportGuideText: "Clears charge your support spells. Time Veil stops time for 6 seconds, while Chain Wave clears one selected row. Moko Slime's Slime Bind seals a forecast intersection for 6 seconds.",
    soundSetting: "BGM & SFX",
    effectsSetting: "Screen effects",
    chromaSetting: "Show Chroma",
    autoHintSetting: "Auto hint after 10s",
    on: "ON",
    off: "OFF",
    settingsSaved: "Settings are saved automatically on this device.",
    tutorialTitle: "Rotation Tutorial",
    tutorialSteps: [
      "Tap an intersection to rotate the surrounding 2×2 group clockwise.",
      "Swipe right from an intersection to rotate clockwise.",
      "Swipe left to rotate counterclockwise.",
      "A rotation without a match returns automatically. Use the glowing hint when needed."
    ],
    tutorialNext: "Next",
    tutorialStart: "Start Playing",
    tutorialReplay: "Replay Tutorial",
    tutorialStep: (step: number) => `STEP ${step}/4`,
    bestRecord: "Best Record",
    noBest: "No record yet",
    rankingTitle: "Local Ranking",
    rankingName: "Name",
    rankingSubmit: "Save Score",
    rankingSubmitted: "Saved",
    evaluationTitle: "Prototype Evaluation",
    evaluationEmpty: "Results are summarized on this device after each play.",
    evaluationSummary: (plays: number, clearRate: number, averageTime: number, averageChain: number) =>
      `${plays} plays / ${clearRate}% clear / ${averageTime}s avg / ${averageChain} avg max chain`,
    comparisonTitle: "Comparison with Falling Mode",
    comparisonDescription: "Compares the latest 20 plays saved in this browser on this device.",
    rotationMode: "Rotation",
    fallingMode: "Falling",
    comparisonPlays: "Plays",
    comparisonClearRate: "Goal rate",
    comparisonTime: "Avg time",
    comparisonChain: "Avg max chain",
    comparisonSpecials: "Avg specials",
    comparisonInvalid: "Invalid rate",
    comparisonShuffles: "Avg shuffles",
    comparisonUnavailable: "No data",
    comparisonNotApplicable: "N/A",
    comparisonRefresh: "Reload comparison data",
    comparisonNote: "Falling mode records Moko purification (50 blocks); rotation mode records seal completion (90 blocks).",
    shuffled: "No valid moves remained, so the board was reshuffled.",
    hintMessage: (direction: RotationDirection) =>
      `Try rotating the glowing point ${direction === "clockwise" ? "clockwise" : "counterclockwise"}.`,
    clearTitle: "Seal Complete!",
    clearDescription: "You reached the clearing target.",
    timeoutTitle: "Time Up",
    timeoutDescription: "Study the board and try again.",
    rotateNotice: "Rotate your device to landscape for a larger fixed game screen.",
    keyboardHelp: "Arrow keys: move point / Enter: clockwise / Shift+Enter or Z: counterclockwise",
    soundOn: "Turn sound on",
    soundOff: "Turn sound off",
    chromaName: "Chroma, Witch of Color Chains",
    mokoName: "Moko Slime",
    chromaIdle: "Watching the board closely.",
    chromaChain: "Magical Chain complete!",
    chromaDanger: "Keep an eye on the remaining time!",
    chromaDefeat: "Let's weave the chains again.",
    mokoIdle: "It jiggles while wrapped in unstable color magic.",
    mokoLight: "Boing! The chain magic connected.",
    mokoMedium: "Wobble! A large piece of disorder unraveled.",
    mokoHeavy: "Big wobble! A powerful spell landed.",
    mokoPurified: "Purified! Moko Slime has settled down.",
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

function readAudioEnabled() {
  try {
    return window.localStorage.getItem(AUDIO_ENABLED_KEY) !== "false";
  } catch {
    return true;
  }
}

function readStoredBoolean(key: string, fallback: boolean) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored !== "false";
  } catch {
    return fallback;
  }
}

function readRotationBest(): RotationBest | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(ROTATION_BEST_KEY) ?? "null");
    return value
      && typeof value.score === "number"
      && typeof value.maxChain === "number"
      && typeof value.remainingTime === "number"
      ? value
      : null;
  } catch {
    return null;
  }
}

function CharacterPicture({
  alt,
  asset,
  className
}: {
  alt: string;
  asset: string;
  className: string;
}) {
  return (
    <picture className={className}>
      <source srcSet={`${asset}.webp`} type="image/webp" />
      <img
        alt={alt}
        draggable="false"
        height="1254"
        src={`${asset}.png`}
        width="1254"
      />
    </picture>
  );
}

function useFixedStage() {
  const [layout, setLayout] = useState({
    scale: 1,
    portrait: false,
    coarsePointer: false
  });

  useLayoutEffect(() => {
    const update = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const scale = Math.max(
        0.1,
        Math.min((width - 12) / STAGE_WIDTH, (height - 12) / STAGE_HEIGHT)
      );
      setLayout({
        scale,
        portrait: height > width,
        coarsePointer: window.matchMedia("(pointer: coarse)").matches
      });
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
  const { scale, portrait, coarsePointer } = useFixedStage();
  const initialBoard = useMemo(() => createPlayableRotationBoard(rotationSettings), []);
  const [board, setBoard] = useState<Board>(initialBoard);
  const [availableMoves, setAvailableMoves] = useState<RotationMove[]>(
    () => enumerateProductiveRotations(initialBoard)
  );
  const [phase, setPhase] = useState<RotationPhase>("idle");
  const [selectedPoint, setSelectedPoint] = useState<RotationPoint>({ row: 3, column: 3 });
  const [focusedPoint, setFocusedPoint] = useState<RotationPoint>({ row: 3, column: 3 });
  const [rotationOverlay, setRotationOverlay] = useState<RotationOverlay | null>(null);
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [motionCells, setMotionCells] = useState<Set<string>>(new Set());
  const [invalidPoint, setInvalidPoint] = useState<RotationPoint | null>(null);
  const [hintMove, setHintMove] = useState<RotationMove | null>(null);
  const [chainNotice, setChainNotice] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>(t.ready);
  const [score, setScore] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [maxChain, setMaxChain] = useState(0);
  const [successfulMoves, setSuccessfulMoves] = useState(0);
  const [invalidMoves, setInvalidMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [documentHidden, setDocumentHidden] = useState(document.hidden);
  const [audioEnabled, setAudioEnabled] = useState(readAudioEnabled);
  const [battleImpact, setBattleImpact] = useState<BattleImpact>(null);
  const [grandSpell, setGrandSpell] = useState<GrandSpellCutin | null>(null);
  const [timeVeilCharge, setTimeVeilCharge] = useState(0);
  const [timeVeilRemaining, setTimeVeilRemaining] = useState(0);
  const [chainWaveCharge, setChainWaveCharge] = useState(0);
  const [chainWaveTargeting, setChainWaveTargeting] = useState(false);
  const [mokoAttackCharge, setMokoAttackCharge] = useState(0);
  const [slimeForecastPoint, setSlimeForecastPoint] = useState<RotationPoint | null>(null);
  const [slimeLockedPoint, setSlimeLockedPoint] = useState<RotationPoint | null>(null);
  const [slimeRemaining, setSlimeRemaining] = useState(0);
  const [overlayPanel, setOverlayPanel] = useState<RotationOverlayPanel>(() => (
    readStoredBoolean(ROTATION_TUTORIAL_KEY, false) ? null : "tutorial"
  ));
  const [tutorialStep, setTutorialStep] = useState(0);
  const [autoHintEnabled, setAutoHintEnabled] = useState(
    () => readStoredBoolean(ROTATION_AUTO_HINT_KEY, true)
  );
  const [effectsEnabled, setEffectsEnabled] = useState(
    () => readStoredBoolean(ROTATION_EFFECTS_KEY, true)
  );
  const [chromaVisible, setChromaVisible] = useState(
    () => readStoredBoolean(ROTATION_CHROMA_KEY, true)
  );
  const [bestRecord, setBestRecord] = useState<RotationBest | null>(readRotationBest);
  const [evaluations, setEvaluations] = useState<ColorChainEvaluation[]>(
    () => readColorChainEvaluations(ROTATION_EVALUATION_KEY)
  );
  const [fallingEvaluations, setFallingEvaluations] = useState<ColorChainEvaluation[]>(
    () => readColorChainEvaluations(FALLING_EVALUATION_KEY)
  );
  const [specialActivations, setSpecialActivations] = useState(0);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [rankingName, setRankingName] = useState("");
  const [rankingSubmitted, setRankingSubmitted] = useState(false);
  const [blinkActive, setBlinkActive] = useState(false);
  const boardRef = useRef(board);
  const phaseRef = useRef(phase);
  const timeLeftRef = useRef(timeLeft);
  const clearedRef = useRef(cleared);
  const successfulMovesRef = useRef(successfulMoves);
  const invalidMovesRef = useRef(invalidMoves);
  const runIdRef = useRef(0);
  const pointerRef = useRef<PointerStart | null>(null);
  const stageScaleRef = useRef(scale);
  const lastBoardActionRef = useRef(performance.now());
  const hintSequenceRef = useRef(0);
  const grandSpellSequenceRef = useRef(0);
  const timeVeilChargeRef = useRef(0);
  const timeVeilRemainingRef = useRef(0);
  const chainWaveChargeRef = useRef(0);
  const mokoAttackChargeRef = useRef(0);
  const slimeForecastPointRef = useRef<RotationPoint | null>(null);
  const slimeLockedPointRef = useRef<RotationPoint | null>(null);
  const slimeRemainingRef = useRef(0);
  const effectsEnabledRef = useRef(effectsEnabled);
  const overlayResumePhaseRef = useRef<RotationPhase | null>(null);
  const evaluationSavedRef = useRef(false);
  const pointButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const audioRef = useRef<RotationAudio | null>(null);
  const audioEnabledRef = useRef(audioEnabled);
  const ranking = useRanking({
    gameId: "color-chain-rotate-stage-1",
    metricLabel: "Score",
    mode: "higher"
  });

  const sealPercent = Math.min(100, Math.round((cleared / CLEAR_TARGET) * 100));
  const mobilePerformance = coarsePointer || scale < 0.72;
  const successRate = successfulMoves + invalidMoves > 0
    ? Math.round((successfulMoves / (successfulMoves + invalidMoves)) * 100)
    : 0;
  const evaluationSummary = useMemo(
    () => summarizeColorChainEvaluations(evaluations),
    [evaluations]
  );
  const fallingEvaluationSummary = useMemo(
    () => summarizeColorChainEvaluations(fallingEvaluations),
    [fallingEvaluations]
  );
  const chromaMood: ChromaMood = phase === "timeout"
    ? "defeat"
    : grandSpell || battleImpact
      ? "chain"
      : timeLeft <= 10 && phase !== "idle" && phase !== "clear"
        ? "danger"
        : blinkActive
          ? "blink"
          : "idle";
  const mokoMood: MokoMood = sealPercent >= 100
    ? "purified"
    : battleImpact ?? "idle";
  const chromaStatus = chromaMood === "defeat"
    ? t.chromaDefeat
    : chromaMood === "danger"
      ? t.chromaDanger
      : chromaMood === "chain"
        ? t.chromaChain
        : t.chromaIdle;
  const mokoStatus = mokoMood === "purified"
    ? t.mokoPurified
    : mokoMood === "heavy"
      ? t.mokoHeavy
      : mokoMood === "medium"
        ? t.mokoMedium
        : mokoMood === "light"
          ? t.mokoLight
          : t.mokoIdle;
  const inputEnabled = phase === "ready" || phase === "selecting";
  const boardInputEnabled = inputEnabled && !chainWaveTargeting;
  const isResolving = [
    "rotating",
    "validating",
    "reverting",
    "grand-spell",
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

  const ensureAudio = () => {
    if (audioRef.current) return audioRef.current;
    const bgm = new Audio(audioPaths.bgm);
    const chain = new Audio(audioPaths.chain);
    const strong = new Audio(audioPaths.strong);
    const moreStrong = new Audio(audioPaths.moreStrong);
    const gameOver = new Audio(audioPaths.gameOver);
    bgm.loop = true;
    bgm.preload = "metadata";
    bgm.volume = 0.25;
    chain.preload = "auto";
    chain.volume = 0.48;
    strong.preload = "auto";
    strong.volume = 0.56;
    moreStrong.preload = "auto";
    moreStrong.volume = 0.62;
    gameOver.preload = "auto";
    gameOver.volume = 0.56;
    audioRef.current = { bgm, chain, strong, moreStrong, gameOver };
    return audioRef.current;
  };

  const playBgm = (restart = false) => {
    if (!audioEnabledRef.current) return;
    const audio = ensureAudio();
    if (restart) audio.bgm.currentTime = 0;
    void audio.bgm.play().catch(() => {
      // Browsers may wait for the next explicit user interaction.
    });
  };

  const pauseBgm = (reset = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.bgm.pause();
    if (reset) audio.bgm.currentTime = 0;
  };

  const playAudioEffect = (kind: "chain" | "strong" | "moreStrong" | "gameOver") => {
    if (!audioEnabledRef.current) return;
    const audio = ensureAudio();
    const effect = audio[kind];
    effect.pause();
    effect.currentTime = 0;
    void effect.play().catch(() => {
      // Audio failure must not interrupt gameplay.
    });
  };

  const stopAllAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    Object.values(audio).forEach((track) => {
      track.pause();
      track.currentTime = 0;
    });
  };

  const toggleAudio = () => {
    const next = !audioEnabledRef.current;
    audioEnabledRef.current = next;
    setAudioEnabled(next);
    try {
      window.localStorage.setItem(AUDIO_ENABLED_KEY, String(next));
    } catch {
      // Storage failure only affects preference persistence.
    }
    if (!next) {
      stopAllAudio();
    } else if (!["idle", "clear", "timeout"].includes(phaseRef.current)) {
      playBgm();
    }
  };

  const saveBooleanSetting = (
    key: string,
    next: boolean,
    setter: (value: boolean) => void
  ) => {
    setter(next);
    try {
      window.localStorage.setItem(key, String(next));
    } catch {
      // Storage failure only affects preference persistence.
    }
  };

  const toggleEffects = () => {
    const next = !effectsEnabledRef.current;
    effectsEnabledRef.current = next;
    saveBooleanSetting(ROTATION_EFFECTS_KEY, next, setEffectsEnabled);
  };

  const refreshEvaluationComparison = () => {
    setEvaluations(readColorChainEvaluations(ROTATION_EVALUATION_KEY));
    setFallingEvaluations(readColorChainEvaluations(FALLING_EVALUATION_KEY));
  };

  const openOverlay = (panel: Exclude<RotationOverlayPanel, null>) => {
    if (isResolving) return;
    if (phaseRef.current === "ready" || phaseRef.current === "selecting") {
      overlayResumePhaseRef.current = phaseRef.current;
      commitPhase("paused");
    }
    setOverlayPanel(panel);
  };

  const closeOverlay = () => {
    setOverlayPanel(null);
    const resumePhase = overlayResumePhaseRef.current;
    overlayResumePhaseRef.current = null;
    if (phaseRef.current === "paused" && resumePhase) commitPhase(resumePhase);
  };

  const advanceTutorial = () => {
    if (tutorialStep < t.tutorialSteps.length - 1) {
      setTutorialStep((current) => current + 1);
      return;
    }
    try {
      window.localStorage.setItem(ROTATION_TUTORIAL_KEY, "true");
    } catch {
      // The tutorial can still close when storage is unavailable.
    }
    closeOverlay();
  };

  const updateTimeVeilCharge = (next: number) => {
    const normalized = Math.max(0, Math.min(100, next));
    timeVeilChargeRef.current = normalized;
    setTimeVeilCharge(normalized);
  };

  const updateTimeVeilRemaining = (next: number) => {
    const normalized = Math.max(0, next);
    timeVeilRemainingRef.current = normalized;
    setTimeVeilRemaining(normalized);
  };

  const updateChainWaveCharge = (next: number) => {
    const normalized = Math.max(0, Math.min(100, next));
    chainWaveChargeRef.current = normalized;
    setChainWaveCharge(normalized);
  };

  const updateMokoAttackCharge = (next: number) => {
    const normalized = Math.max(0, Math.min(100, next));
    mokoAttackChargeRef.current = normalized;
    setMokoAttackCharge(normalized);
  };

  const updateSlimeForecastPoint = (next: RotationPoint | null) => {
    slimeForecastPointRef.current = next;
    setSlimeForecastPoint(next);
  };

  const updateSlimeLockedPoint = (next: RotationPoint | null) => {
    slimeLockedPointRef.current = next;
    setSlimeLockedPoint(next);
  };

  const updateSlimeRemaining = (next: number) => {
    const normalized = Math.max(0, next);
    slimeRemainingRef.current = normalized;
    setSlimeRemaining(normalized);
  };

  const commitAvailableMoves = (nextMoves: RotationMove[]) => {
    const locked = slimeLockedPointRef.current;
    if (
      locked
      && !nextMoves.some((move) => move.row !== locked.row || move.column !== locked.column)
    ) {
      updateSlimeLockedPoint(null);
      updateSlimeRemaining(0);
    }
    setAvailableMoves(nextMoves);
  };

  const chargeSupportSkills = (count: number, chargeWave = true) => {
    if (count <= 0) return;
    if (timeVeilRemainingRef.current <= 0) {
      updateTimeVeilCharge(
        timeVeilChargeRef.current + (count / TIME_VEIL_CHARGE_BLOCKS) * 100
      );
    }
    if (chargeWave) {
      updateChainWaveCharge(
        chainWaveChargeRef.current + (count / CHAIN_WAVE_CHARGE_BLOCKS) * 100
      );
    }
  };

  const playGrandCutin = async (
    dominantEffect: RotationSpecialEffect | null,
    chain: number,
    currentRun: number
  ) => {
    const isUltimateChain = chain === 6;
    const hasGrandCutin = Boolean(dominantEffect?.super) || isUltimateChain;
    if (!hasGrandCutin) return true;
    if (!effectsEnabledRef.current) {
      playAudioEffect("moreStrong");
      return true;
    }

    const superSpellName = dominantEffect?.super
      ? specialNames[language][dominantEffect.token][1]
      : undefined;
    const cutinName = isUltimateChain ? t.ultimateChain : superSpellName!;
    const sequence = ++grandSpellSequenceRef.current;
    setGrandSpell({
      detail: isUltimateChain ? superSpellName : undefined,
      id: isUltimateChain
        ? "ultimate-magical-chain"
        : grandSpellIds[dominantEffect!.token],
      kicker: isUltimateChain ? `${chain} CHAIN / ULTIMATE` : "SUPER MAGIC",
      name: cutinName,
      sequence
    });
    setChainNotice("");
    setStatusMessage(cutinName);
    commitPhase("grand-spell");
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const cutinDuration = prefersReducedMotion
      ? 180
      : mobilePerformance
        ? 620
        : GRAND_SPELL_DURATION;
    if (isUltimateChain) {
      const soundLead = prefersReducedMotion ? 35 : 80;
      playAudioEffect("strong");
      await delay(soundLead);
      if (runIdRef.current !== currentRun) return false;
      playAudioEffect("moreStrong");
      await delay(cutinDuration - soundLead);
    } else {
      playAudioEffect("moreStrong");
      await delay(cutinDuration);
    }
    if (runIdRef.current !== currentRun) return false;
    setGrandSpell(null);
    return true;
  };

  const finishGame = (result: "clear" | "timeout") => {
    hintSequenceRef.current += 1;
    pointerRef.current = null;
    setRotationOverlay(null);
    setClearingCells(new Set());
    setMotionCells(new Set());
    setInvalidPoint(null);
    setHintMove(null);
    setChainNotice("");
    setBattleImpact(null);
    setGrandSpell(null);
    setChainWaveTargeting(false);
    updateTimeVeilRemaining(0);
    updateSlimeForecastPoint(null);
    updateSlimeLockedPoint(null);
    updateSlimeRemaining(0);
    pauseBgm();
    playAudioEffect(result === "timeout" ? "gameOver" : "strong");
    commitPhase(result);
  };

  const finishTurn = () => {
    if (clearedRef.current >= CLEAR_TARGET) {
      finishGame("clear");
    } else if (timeLeftRef.current <= 0) {
      finishGame("timeout");
    } else {
      lastBoardActionRef.current = performance.now();
      commitPhase("ready");
    }
  };

  const animateRotationSteps = async (
    steps: RotationChainStep[],
    currentRun: number
  ) => {
    for (const step of steps) {
      if (runIdRef.current !== currentRun) return false;
      commitBoard(step.boardBeforeClear);
      const points = calculateRotationClearScore(step.matches, step.chain) + step.specialScore;
      const nextCleared = clearedRef.current + step.clearedCells.size;
      const dominantEffect = getDominantSpecialEffect(step.specialEffects);
      if (step.specialEffects.length > 0) {
        setSpecialActivations((current) => current + step.specialEffects.length);
      }
      const impact: Exclude<BattleImpact, null> = (
        step.chain >= 3
        || dominantEffect?.super
        || dominantEffect?.token === COLOR_BREAKER_BLOCK
      )
        ? "heavy"
        : step.chain === 2 || dominantEffect
          ? "medium"
          : "light";
      const notice = dominantEffect
        ? t.specialChain(
            specialNames[language][dominantEffect.token][dominantEffect.super ? 1 : 0],
            step.chain,
            points
          )
        : t.chain(step.chain, points);
      const hasGrandCutin = Boolean(dominantEffect?.super) || step.chain === 6;
      if (!(await playGrandCutin(dominantEffect, step.chain, currentRun))) return false;

      setClearingCells(new Set(step.clearedCells));
      commitPhase("clearing");
      clearedRef.current = nextCleared;
      setCleared(nextCleared);
      chargeSupportSkills(step.clearedCells.size);
      updateMokoAttackCharge(
        mokoAttackChargeRef.current
        - step.clearedCells.size * 0.35
        - (step.chain >= 3 ? 4 : 0)
      );
      if (
        slimeRemainingRef.current > 0
        && (step.chain >= 3 || dominantEffect)
      ) {
        const nextSlimeRemaining = Math.max(0, slimeRemainingRef.current - 1.25);
        updateSlimeRemaining(nextSlimeRemaining);
        if (nextSlimeRemaining <= 0) updateSlimeLockedPoint(null);
      }
      setBattleImpact(impact);
      setScore((current) => current + points);
      setMaxChain((current) => Math.max(current, step.chain));
      setChainNotice(notice);
      setStatusMessage(notice);
      if (!hasGrandCutin) {
        playAudioEffect(
          step.chain >= 5
            ? "moreStrong"
            : step.chain >= 3 || dominantEffect
              ? "strong"
              : "chain"
        );
      }

      await delay(CLEAR_DURATION);
      if (runIdRef.current !== currentRun) return false;
      setClearingCells(new Set());
      commitBoard(step.boardAfterClear);

      commitPhase("falling");
      await delay(70);
      if (runIdRef.current !== currentRun) return false;
      setMotionCells(findChangedOccupiedCells(step.boardAfterClear, step.boardAfterCollapse));
      commitBoard(step.boardAfterCollapse);
      await delay(FALL_DURATION);
      if (runIdRef.current !== currentRun) return false;

      commitPhase("refilling");
      setMotionCells(findRefilledCells(step.boardAfterCollapse, step.boardAfterRefill));
      commitBoard(step.boardAfterRefill);
      await delay(REFILL_DURATION);
      if (runIdRef.current !== currentRun) return false;
      setMotionCells(new Set());
    }
    return true;
  };

  const performMove = async (point: RotationPoint, direction: RotationDirection) => {
    if (!boardInputEnabled || !["ready", "selecting"].includes(phaseRef.current)) return;
    if (
      slimeLockedPointRef.current?.row === point.row
      && slimeLockedPointRef.current.column === point.column
    ) {
      setInvalidPoint(point);
      setStatusMessage(t.interferenceBlocked);
      window.setTimeout(() => {
        setInvalidPoint((current) => (
          current?.row === point.row && current.column === point.column ? null : current
        ));
      }, 360);
      commitPhase(timeLeftRef.current <= 0 ? "timeout" : "ready");
      return;
    }

    lastBoardActionRef.current = performance.now();
    hintSequenceRef.current += 1;
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
    const preferredRewardKeys = [
      cellKey(point.row, point.column),
      cellKey(point.row, point.column + 1),
      cellKey(point.row + 1, point.column),
      cellKey(point.row + 1, point.column + 1)
    ];
    const resolution = resolveRotationChain(
      rotatedBoard,
      Math.random,
      rotationSettings,
      preferredRewardKeys
    );

    if (resolution.steps.length === 0) {
      const nextInvalidMoves = invalidMovesRef.current + 1;
      invalidMovesRef.current = nextInvalidMoves;
      setInvalidMoves(nextInvalidMoves);
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

    const nextSuccessfulMoves = successfulMovesRef.current + 1;
    successfulMovesRef.current = nextSuccessfulMoves;
    setSuccessfulMoves(nextSuccessfulMoves);
    if (!(await animateRotationSteps(resolution.steps, currentRun))) return;

    if (runIdRef.current !== currentRun) return;
    setChainNotice("");
    setBattleImpact(null);
    let stableBoard = resolution.board;
    if (resolution.capped || enumerateProductiveRotations(stableBoard).length === 0) {
      commitPhase("shuffling");
      setShuffleCount((current) => current + 1);
      setStatusMessage(t.shuffled);
      await delay(220);
      if (runIdRef.current !== currentRun) return;
      stableBoard = shuffleToPlayableRotationBoard(stableBoard, Math.random, rotationSettings);
      commitBoard(stableBoard);
      await delay(220);
    }

    if (runIdRef.current !== currentRun) return;
    commitAvailableMoves(enumerateProductiveRotations(stableBoard));
    setStatusMessage(t.ready);
    finishTurn();
  };

  const activateTimeVeil = () => {
    if (
      !boardInputEnabled
      || timeVeilChargeRef.current < 100
      || timeVeilRemainingRef.current > 0
    ) return;
    updateTimeVeilCharge(0);
    updateTimeVeilRemaining(TIME_VEIL_DURATION);
    setStatusMessage(t.timeVeilStarted);
    playAudioEffect("strong");
  };

  const toggleChainWaveTargeting = () => {
    if (chainWaveTargeting) {
      setChainWaveTargeting(false);
      commitPhase("ready");
      setStatusMessage(t.ready);
      return;
    }
    if (!inputEnabled || chainWaveChargeRef.current < 100) return;
    hintSequenceRef.current += 1;
    setHintMove(null);
    setChainWaveTargeting(true);
    commitPhase("selecting");
    setStatusMessage(t.chainWaveSelect);
  };

  const activateChainWave = async (row: number) => {
    if (
      !chainWaveTargeting
      || chainWaveChargeRef.current < 100
      || !["ready", "selecting"].includes(phaseRef.current)
    ) return;

    const currentRun = ++runIdRef.current;
    const sourceBoard = boardRef.current.map((sourceRow) => [...sourceRow]);
    const rowCells = Array.from(
      { length: ROTATION_COLUMNS },
      (_, column) => cellKey(row, column)
    );
    const specialResolution = findRotationSpecialClearCells(
      sourceBoard,
      rowCells,
      Math.random,
      true
    );
    const dominantEffect = getDominantSpecialEffect(specialResolution.effects);
    if (specialResolution.effects.length > 0) {
      setSpecialActivations((current) => current + specialResolution.effects.length);
    }
    setChainWaveTargeting(false);
    updateChainWaveCharge(0);
    setHintMove(null);
    setChainNotice("");

    if (!(await playGrandCutin(dominantEffect, 0, currentRun))) return;

    const clearedCells = specialResolution.cells;
    const points = (
      clearedCells.size * CHAIN_WAVE_SCORE_PER_BLOCK
      + calculateRotationSpecialScore(specialResolution.effects)
    );
    const notice = t.chainWaveResult(row + 1, clearedCells.size);
    setClearingCells(new Set(clearedCells));
    setBattleImpact(dominantEffect ? "heavy" : "medium");
    setStatusMessage(notice);
    setChainNotice(notice);
    commitPhase("clearing");
    clearedRef.current += clearedCells.size;
    setCleared(clearedRef.current);
    chargeSupportSkills(clearedCells.size, false);
    setScore((current) => current + points);
    if (!dominantEffect?.super) playAudioEffect("strong");

    await delay(CLEAR_DURATION);
    if (runIdRef.current !== currentRun) return;
    setClearingCells(new Set());
    const boardAfterClear = clearRotationCellsWithRewards(
      sourceBoard,
      clearedCells,
      []
    );
    commitBoard(boardAfterClear);

    commitPhase("falling");
    await delay(70);
    if (runIdRef.current !== currentRun) return;
    const boardAfterCollapse = collapseRotationColumns(boardAfterClear);
    setMotionCells(findChangedOccupiedCells(boardAfterClear, boardAfterCollapse));
    commitBoard(boardAfterCollapse);
    await delay(FALL_DURATION);
    if (runIdRef.current !== currentRun) return;

    commitPhase("refilling");
    const boardAfterRefill = refillRotationBoard(
      boardAfterCollapse,
      Math.random,
      rotationSettings
    );
    setMotionCells(findRefilledCells(boardAfterCollapse, boardAfterRefill));
    commitBoard(boardAfterRefill);
    await delay(REFILL_DURATION);
    if (runIdRef.current !== currentRun) return;
    setMotionCells(new Set());

    const resolution = resolveRotationChain(
      boardAfterRefill,
      Math.random,
      rotationSettings
    );
    if (!(await animateRotationSteps(resolution.steps, currentRun))) return;
    if (runIdRef.current !== currentRun) return;

    setChainNotice("");
    setBattleImpact(null);
    let stableBoard = resolution.board;
    if (resolution.capped || enumerateProductiveRotations(stableBoard).length === 0) {
      commitPhase("shuffling");
      setShuffleCount((current) => current + 1);
      setStatusMessage(t.shuffled);
      await delay(220);
      if (runIdRef.current !== currentRun) return;
      stableBoard = shuffleToPlayableRotationBoard(stableBoard, Math.random, rotationSettings);
      commitBoard(stableBoard);
      await delay(220);
    }

    if (runIdRef.current !== currentRun) return;
    commitAvailableMoves(enumerateProductiveRotations(stableBoard));
    setStatusMessage(t.ready);
    finishTurn();
  };

  const startGame = () => {
    runIdRef.current += 1;
    hintSequenceRef.current += 1;
    lastBoardActionRef.current = performance.now();
    const nextBoard = createPlayableRotationBoard(rotationSettings);
    commitBoard(nextBoard);
    commitAvailableMoves(enumerateProductiveRotations(nextBoard));
    timeLeftRef.current = GAME_SECONDS;
    clearedRef.current = 0;
    setTimeLeft(GAME_SECONDS);
    setScore(0);
    setCleared(0);
    setMaxChain(0);
    successfulMovesRef.current = 0;
    invalidMovesRef.current = 0;
    setSuccessfulMoves(0);
    setInvalidMoves(0);
    setSpecialActivations(0);
    setShuffleCount(0);
    setRankingSubmitted(false);
    evaluationSavedRef.current = false;
    setSelectedPoint({ row: 3, column: 3 });
    setFocusedPoint({ row: 3, column: 3 });
    setRotationOverlay(null);
    setClearingCells(new Set());
    setMotionCells(new Set());
    setInvalidPoint(null);
    setHintMove(null);
    setChainNotice("");
    setBattleImpact(null);
    setGrandSpell(null);
    updateTimeVeilCharge(0);
    updateTimeVeilRemaining(0);
    updateChainWaveCharge(0);
    setChainWaveTargeting(false);
    updateMokoAttackCharge(0);
    updateSlimeForecastPoint(null);
    updateSlimeLockedPoint(null);
    updateSlimeRemaining(0);
    setStatusMessage(t.ready);
    commitPhase("ready");
    playBgm(true);
  };

  const showHint = () => {
    if (!boardInputEnabled || availableMoves.length === 0) return;
    const move = availableMoves[0];
    const hintSequence = ++hintSequenceRef.current;
    lastBoardActionRef.current = performance.now();
    setHintMove(move);
    setSelectedPoint(move);
    setFocusedPoint(move);
    setStatusMessage(t.hintMessage(move.direction));
    window.setTimeout(() => {
      if (hintSequenceRef.current !== hintSequence) return;
      setHintMove((current) => (
        current?.row === move.row
        && current.column === move.column
        && current.direction === move.direction
          ? null
          : current
      ));
    }, HINT_VISIBLE_DURATION);
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    point: RotationPoint
  ) => {
    if (!boardInputEnabled || phaseRef.current !== "ready" || !event.isPrimary || event.button !== 0) {
      return;
    }
    event.preventDefault();
    if (
      slimeLockedPointRef.current?.row === point.row
      && slimeLockedPointRef.current.column === point.column
    ) {
      setInvalidPoint(point);
      setStatusMessage(t.interferenceBlocked);
      window.setTimeout(() => {
        setInvalidPoint((current) => (
          current?.row === point.row && current.column === point.column ? null : current
        ));
      }, 360);
      return;
    }
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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
    if (!boardInputEnabled) return;
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
    const preloadTimer = window.setTimeout(() => {
      [
        ...Object.values(chromaAssets),
        ...Object.values(mokoAssets)
      ].forEach((asset) => {
        const image = new Image();
        image.src = `${asset}.webp`;
      });
    }, 250);
    return () => {
      runIdRef.current += 1;
      window.clearTimeout(preloadTimer);
      stopAllAudio();
      document.body.classList.remove("color-chain-rotation-mode");
      root.classList.remove("color-chain-rotation-mode");
    };
  }, []);

  useEffect(() => {
    if (phase === "idle" || phase === "clear" || phase === "timeout") {
      setBlinkActive(false);
      return;
    }
    const blinkTimer = window.setInterval(() => {
      if (phaseRef.current === "ready" && !document.hidden) {
        setBlinkActive(true);
        window.setTimeout(() => setBlinkActive(false), 170);
      }
    }, 4200);
    return () => window.clearInterval(blinkTimer);
  }, [phase]);

  useEffect(() => {
    const handleVisibility = () => {
      const hidden = document.hidden;
      setDocumentHidden(hidden);
      if (hidden) {
        pointerRef.current = null;
        pauseBgm();
        if (phaseRef.current === "selecting") commitPhase("ready");
      } else if (!["idle", "clear", "timeout"].includes(phaseRef.current)) {
        playBgm();
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
      if (timeVeilRemainingRef.current > 0) {
        const nextVeil = Math.max(0, timeVeilRemainingRef.current - elapsed);
        updateTimeVeilRemaining(nextVeil);
        if (nextVeil <= 0) setStatusMessage(t.timeVeilEnded);
        return;
      }
      if (slimeRemainingRef.current > 0) {
        const nextSlime = Math.max(0, slimeRemainingRef.current - elapsed);
        updateSlimeRemaining(nextSlime);
        if (nextSlime <= 0) {
          updateSlimeLockedPoint(null);
          setStatusMessage(t.interferenceEnded);
        }
      } else {
        const nextAttackCharge = Math.min(
          100,
          mokoAttackChargeRef.current + (elapsed / MOKO_ATTACK_SECONDS) * 100
        );
        updateMokoAttackCharge(nextAttackCharge);
        if (
          nextAttackCharge >= MOKO_ATTACK_FORECAST_PERCENT
          && !slimeForecastPointRef.current
        ) {
          const forecast = chooseSafeBlockedRotationPoint(
            enumerateProductiveRotations(boardRef.current),
            null,
            Math.random
          );
          updateSlimeForecastPoint(forecast);
          if (forecast) setStatusMessage(t.interferenceForecast);
        }
        if (nextAttackCharge >= 100) {
          const target = chooseSafeBlockedRotationPoint(
            enumerateProductiveRotations(boardRef.current),
            slimeForecastPointRef.current,
            Math.random
          );
          updateSlimeForecastPoint(null);
          if (target) {
            updateSlimeLockedPoint(target);
            updateSlimeRemaining(MOKO_SLIME_DURATION);
            updateMokoAttackCharge(0);
            setStatusMessage(t.interferenceCast(target));
          } else {
            updateMokoAttackCharge(50);
            setStatusMessage(t.interferenceFizzle);
          }
        }
      }
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

  useEffect(() => {
    if (!["clear", "timeout"].includes(phase) || evaluationSavedRef.current) return;
    evaluationSavedRef.current = true;
    const evaluation: ColorChainEvaluation = {
      cleared,
      completed: phase === "clear",
      invalidMoves,
      maxChain,
      mode: "rotation",
      playedSeconds: Math.round((GAME_SECONDS - timeLeft) * 10) / 10,
      recordedAt: new Date().toISOString(),
      score,
      shuffles: shuffleCount,
      specialActivations,
      successfulMoves
    };
    const nextEvaluations = appendColorChainEvaluation(
      ROTATION_EVALUATION_KEY,
      evaluation
    );
    setEvaluations(nextEvaluations);

    if (phase === "clear") {
      const nextBest = {
        maxChain,
        remainingTime: Math.ceil(timeLeft),
        score
      };
      if (
        !bestRecord
        || nextBest.score > bestRecord.score
        || (
          nextBest.score === bestRecord.score
          && nextBest.remainingTime > bestRecord.remainingTime
        )
      ) {
        setBestRecord(nextBest);
        try {
          window.localStorage.setItem(ROTATION_BEST_KEY, JSON.stringify(nextBest));
        } catch {
          // Best record remains visible for this session.
        }
      }
    }
  }, [phase]);

  useEffect(() => {
    if (
      phase !== "ready"
      || documentHidden
      || hintMove
      || !autoHintEnabled
      || availableMoves.length === 0
    ) {
      return;
    }

    const elapsed = performance.now() - lastBoardActionRef.current;
    const timer = window.setTimeout(() => {
      if (phaseRef.current === "ready" && !document.hidden) {
        showHint();
      }
    }, Math.max(0, AUTO_HINT_DELAY - elapsed));
    return () => window.clearTimeout(timer);
  }, [autoHintEnabled, availableMoves, documentHidden, hintMove, phase]);

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
        <section
          className={`color-chain-rotation-stage is-${phase}${mobilePerformance ? " is-mobile-performance" : ""}${grandSpell ? " is-grand-cutin-active" : ""}${grandSpell?.id === "ultimate-magical-chain" ? " is-ultimate-cutin" : ""}${effectsEnabled ? "" : " is-effects-off"}${chromaVisible ? "" : " is-chroma-hidden"}`}
          style={stageStyle}
        >
          <header className="color-chain-rotation-stage-header">
            <div className="color-chain-rotation-title">
              <p>{t.eyebrow}</p>
              <h1>{t.title}</h1>
              <span>{t.subtitle}</span>
            </div>
            <div className="color-chain-rotation-top-actions">
              <button
                aria-label={t.help}
                disabled={isResolving}
                onClick={() => openOverlay("help")}
                title={t.help}
                type="button"
              >
                <HelpCircle aria-hidden="true" />
                {t.help}
              </button>
              <button
                aria-label={t.settings}
                disabled={isResolving}
                onClick={() => openOverlay("settings")}
                title={t.settings}
                type="button"
              >
                <Settings aria-hidden="true" />
                {t.settings}
              </button>
              <button
                aria-label={audioEnabled ? t.soundOff : t.soundOn}
                aria-pressed={audioEnabled}
                onClick={toggleAudio}
                type="button"
              >
                {audioEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
                {audioEnabled ? "ON" : "OFF"}
              </button>
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
              <section className="color-chain-rotation-chroma-card">
                <div className="color-chain-rotation-character-heading">
                  <span>CHARACTER</span>
                  <strong>{t.chromaName}</strong>
                </div>
                <div className={`color-chain-rotation-character-stage is-${chromaMood}`}>
                  <i aria-hidden="true"><Sparkles /></i>
                  <CharacterPicture
                    alt={`${t.chromaName}: ${chromaStatus}`}
                    asset={chromaAssets[chromaMood]}
                    className="color-chain-rotation-character-picture is-chroma"
                  />
                </div>
                <p aria-live="polite" className="color-chain-rotation-character-copy">{chromaStatus}</p>
              </section>
              <section className="color-chain-rotation-objective-card">
                <p className="color-chain-rotation-objective-kicker">SEAL OBJECTIVE</p>
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
              </section>
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
                        phase === "falling" && motionCells.has(key) ? " is-rotation-falling" : "",
                        phase === "refilling" && motionCells.has(key) ? " is-rotation-refilling" : ""
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
                      const isSlimeForecast = (
                        slimeForecastPoint?.row === row
                        && slimeForecastPoint.column === column
                      );
                      const isSlimeLocked = (
                        slimeLockedPoint?.row === row
                        && slimeLockedPoint.column === column
                      );
                      return (
                        <button
                          aria-label={t.ariaPoint(point)}
                          aria-pressed={isSelected}
                          className={[
                            "color-chain-rotation-point",
                            isSelected ? "is-selected" : "",
                            isHint ? `is-hint is-${hintMove.direction}` : "",
                            isInvalid ? "is-invalid" : "",
                            isSlimeForecast ? "is-slime-forecast" : "",
                            isSlimeLocked ? "is-slime-locked" : ""
                          ].filter(Boolean).join(" ")}
                          disabled={!boardInputEnabled}
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

                {chainWaveTargeting && (
                  <div className="color-chain-rotation-wave-targets">
                    {Array.from({ length: ROTATION_ROWS }, (_, row) => (
                      <button
                        aria-label={t.waveRowAria(row + 1)}
                        key={row}
                        onClick={() => void activateChainWave(row)}
                        style={{
                          height: `${100 / ROTATION_ROWS}%`,
                          top: `${(row * 100) / ROTATION_ROWS}%`
                        }}
                        type="button"
                      >
                        <span>{row + 1}</span>
                      </button>
                    ))}
                  </div>
                )}

                {hintMove && !rotationOverlay && (
                  <div
                    aria-hidden="true"
                    className={`color-chain-rotation-hint-preview is-${hintMove.direction}`}
                    style={{
                      left: `${hintMove.column * 12.5}%`,
                      top: `${hintMove.row * 12.5}%`
                    }}
                  >
                    {[
                      board[hintMove.row][hintMove.column],
                      board[hintMove.row][hintMove.column + 1],
                      board[hintMove.row + 1][hintMove.column],
                      board[hintMove.row + 1][hintMove.column + 1]
                    ].map((token, index) => renderToken(token, `hint-${index}`))}
                  </div>
                )}

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
                      <>
                        <div className="color-chain-rotation-result-grid">
                          <span><small>{t.score}</small><strong>{score.toLocaleString()}</strong></span>
                          <span><small>{t.cleared}</small><strong>{cleared}</strong></span>
                          <span><small>{t.maxChain}</small><strong>{maxChain}</strong></span>
                          <span><small>{t.remainingTime}</small><strong>{Math.ceil(timeLeft)}</strong></span>
                          <span><small>{t.successfulMoves}</small><strong>{successfulMoves}</strong></span>
                          <span><small>{t.invalidMoves}</small><strong>{invalidMoves}</strong></span>
                          <span><small>{t.successRate}</small><strong>{successRate}%</strong></span>
                        </div>
                        <div className="color-chain-rotation-records">
                          <p>
                            <span>{t.bestRecord}</span>
                            <strong>
                              {bestRecord
                                ? `${bestRecord.score.toLocaleString()} / ${bestRecord.maxChain} CHAIN`
                                : t.noBest}
                            </strong>
                          </p>
                          <div>
                            <input
                              aria-label={t.rankingName}
                              maxLength={18}
                              onChange={(event) => {
                                setRankingName(event.target.value);
                                setRankingSubmitted(false);
                              }}
                              placeholder={t.rankingName}
                              type="text"
                              value={rankingName}
                            />
                            <button
                              disabled={rankingSubmitted}
                              onClick={() => {
                                ranking.submit(rankingName, {
                                  display: language === "ja"
                                    ? `${score.toLocaleString()}点`
                                    : `${score.toLocaleString()} pts`,
                                  meta: language === "ja"
                                    ? `${maxChain} CHAIN / ${cleared}個`
                                    : `${maxChain} CHAIN / ${cleared} blocks`,
                                  score
                                });
                                setRankingSubmitted(true);
                              }}
                              type="button"
                            >
                              {rankingSubmitted ? t.rankingSubmitted : t.rankingSubmit}
                            </button>
                          </div>
                          {ranking.entries.length > 0 && (
                            <ol aria-label={t.rankingTitle}>
                              {ranking.entries.slice(0, 3).map((entry, index) => (
                                <li key={entry.id}>
                                  <span>{index + 1}</span>
                                  <strong>{entry.name}</strong>
                                  <em>{entry.display}</em>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </>
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
              <div className="color-chain-rotation-opponent-compact">
                <div>
                  <span>STAGE 1 / MAGIC FOREST</span>
                  <strong>{t.mokoName}</strong>
                </div>
                <div className={`color-chain-rotation-opponent-stage is-${mokoMood}`}>
                  <i aria-hidden="true" />
                  <CharacterPicture
                    alt={`${t.mokoName}: ${mokoStatus}`}
                    asset={mokoAssets[mokoMood]}
                    className="color-chain-rotation-character-picture is-moko"
                  />
                </div>
                <p aria-live="polite">{mokoStatus}</p>
                <div
                  className={[
                    "color-chain-rotation-interference",
                    slimeLockedPoint ? "is-active" : "",
                    slimeForecastPoint ? "is-forecast" : ""
                  ].filter(Boolean).join(" ")}
                >
                  <span>{t.interference}</span>
                  <strong>
                    {slimeLockedPoint
                      ? `${slimeRemaining.toFixed(1)}s`
                      : mokoAttackCharge >= MOKO_ATTACK_FORECAST_PERCENT
                        ? t.interferenceReady
                        : `${Math.round(mokoAttackCharge)}%`}
                  </strong>
                  <i style={{
                    width: `${slimeLockedPoint
                      ? (slimeRemaining / MOKO_SLIME_DURATION) * 100
                      : mokoAttackCharge}%`
                  }} />
                </div>
              </div>
              <div className="color-chain-rotation-stats">
                <span><small>{t.score}</small><strong>{score.toLocaleString()}</strong></span>
                <span><small>{t.cleared}</small><strong>{cleared}</strong></span>
                <span><small>{t.maxChain}</small><strong>{maxChain}</strong></span>
                <span><small>{t.successRate}</small><strong>{successRate}%</strong></span>
              </div>
              <section className="color-chain-rotation-support-skills">
                <p>{t.supportSkills}</p>
                <div>
                  <button
                    className={timeVeilRemaining > 0 || timeVeilCharge >= 100 ? "is-ready" : ""}
                    disabled={
                      !boardInputEnabled
                      || timeVeilRemaining > 0
                      || timeVeilCharge < 100
                    }
                    onClick={activateTimeVeil}
                    type="button"
                  >
                    <Clock3 aria-hidden="true" />
                    <span>{t.timeVeil}</span>
                    <strong>
                      {timeVeilRemaining > 0
                        ? t.timeVeilActive(timeVeilRemaining)
                        : timeVeilCharge >= 100
                          ? t.readyLabel
                          : t.charge(Math.round(timeVeilCharge))}
                    </strong>
                    <i style={{
                      width: `${timeVeilRemaining > 0
                        ? (timeVeilRemaining / TIME_VEIL_DURATION) * 100
                        : timeVeilCharge}%`
                    }} />
                  </button>
                  <button
                    className={chainWaveTargeting || chainWaveCharge >= 100 ? "is-ready" : ""}
                    disabled={!chainWaveTargeting && (!inputEnabled || chainWaveCharge < 100)}
                    onClick={toggleChainWaveTargeting}
                    type="button"
                  >
                    <Sparkles aria-hidden="true" />
                    <span>{t.chainWave}</span>
                    <strong>
                      {chainWaveTargeting
                        ? t.chainWaveCancel
                        : chainWaveCharge >= 100
                          ? t.readyLabel
                          : t.charge(Math.round(chainWaveCharge))}
                    </strong>
                    <i style={{ width: `${chainWaveCharge}%` }} />
                  </button>
                </div>
              </section>
              <div className="color-chain-rotation-manual-controls">
                <button
                  disabled={!boardInputEnabled}
                  onClick={() => void performMove(selectedPoint, "counterclockwise")}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" />
                  {t.counterclockwise}
                </button>
                <button
                  disabled={!boardInputEnabled}
                  onClick={() => void performMove(selectedPoint, "clockwise")}
                  type="button"
                >
                  <RotateCw aria-hidden="true" />
                  {t.clockwise}
                </button>
                <button disabled={!boardInputEnabled} onClick={showHint} type="button">
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
          {overlayPanel && (
            <div className="color-chain-rotation-dialog-backdrop" role="presentation">
              <section
                aria-labelledby="color-chain-rotation-dialog-title"
                aria-modal="true"
                className={`color-chain-rotation-dialog is-${overlayPanel}`}
                role="dialog"
              >
                <header>
                  <div>
                    {overlayPanel === "settings"
                      ? <Settings aria-hidden="true" />
                      : <HelpCircle aria-hidden="true" />}
                    <h2 id="color-chain-rotation-dialog-title">
                      {overlayPanel === "settings"
                        ? t.settings
                        : overlayPanel === "tutorial"
                          ? t.tutorialTitle
                          : t.help}
                    </h2>
                  </div>
                  <button aria-label={t.close} onClick={closeOverlay} type="button">
                    <X aria-hidden="true" />
                  </button>
                </header>

                {overlayPanel === "tutorial" ? (
                  <div className="color-chain-rotation-tutorial">
                    <span>{t.tutorialStep(tutorialStep + 1)}</span>
                    <div
                      aria-hidden="true"
                      className={`color-chain-rotation-tutorial-demo is-step-${tutorialStep + 1}`}
                    >
                      <i className="is-coral" />
                      <i className="is-gold" />
                      <i className="is-mint" />
                      <i className="is-sky" />
                      <strong>{tutorialStep === 2 ? "↺" : "↻"}</strong>
                    </div>
                    <p>{t.tutorialSteps[tutorialStep]}</p>
                    <button onClick={advanceTutorial} type="button">
                      {tutorialStep < t.tutorialSteps.length - 1
                        ? t.tutorialNext
                        : t.tutorialStart}
                    </button>
                  </div>
                ) : overlayPanel === "help" ? (
                  <div className="color-chain-rotation-dialog-content">
                    <section>
                      <h3>{t.rulesTitle}</h3>
                      <p>{t.rules}</p>
                    </section>
                    <section>
                      <h3>{t.specialGuide}</h3>
                      <div className="color-chain-rotation-special-guide" aria-hidden="true">
                        {[BOMB_BLOCK, VERTICAL_LASER_BLOCK, HORIZONTAL_LASER_BLOCK, COLOR_BREAKER_BLOCK]
                          .map((token) => renderToken(token, `guide-${token}`))}
                      </div>
                      <p>{t.specialGuideText}</p>
                    </section>
                    <section>
                      <h3>{t.supportGuide}</h3>
                      <p>{t.supportGuideText}</p>
                    </section>
                    <button
                      className="color-chain-rotation-dialog-primary"
                      onClick={() => {
                        setTutorialStep(0);
                        setOverlayPanel("tutorial");
                      }}
                      type="button"
                    >
                      {t.tutorialReplay}
                    </button>
                  </div>
                ) : (
                  <div className="color-chain-rotation-dialog-content is-settings">
                    {[
                      {
                        label: t.soundSetting,
                        on: audioEnabled,
                        toggle: toggleAudio
                      },
                      {
                        label: t.effectsSetting,
                        on: effectsEnabled,
                        toggle: toggleEffects
                      },
                      {
                        label: t.chromaSetting,
                        on: chromaVisible,
                        toggle: () => saveBooleanSetting(
                          ROTATION_CHROMA_KEY,
                          !chromaVisible,
                          setChromaVisible
                        )
                      },
                      {
                        label: t.autoHintSetting,
                        on: autoHintEnabled,
                        toggle: () => saveBooleanSetting(
                          ROTATION_AUTO_HINT_KEY,
                          !autoHintEnabled,
                          setAutoHintEnabled
                        )
                      }
                    ].map((setting) => (
                      <button
                        aria-pressed={setting.on}
                        className={setting.on ? "is-on" : ""}
                        key={setting.label}
                        onClick={setting.toggle}
                        type="button"
                      >
                        <span>{setting.label}</span>
                        <strong>{setting.on ? t.on : t.off}</strong>
                      </button>
                    ))}
                    <p>{t.settingsSaved}</p>
                    <section className="color-chain-rotation-evaluation">
                      <h3>{t.evaluationTitle}</h3>
                      <p>
                        {evaluationSummary
                          ? t.evaluationSummary(
                              evaluationSummary.plays,
                              evaluationSummary.clearRate,
                              evaluationSummary.averageTime,
                              evaluationSummary.averageChain
                            )
                          : t.evaluationEmpty}
                      </p>
                      <h4>{t.comparisonTitle}</h4>
                      <p>{t.comparisonDescription}</p>
                      <div className="color-chain-rotation-comparison-table">
                        <table>
                          <thead>
                            <tr>
                              <th scope="col" />
                              <th scope="col">{t.rotationMode}</th>
                              <th scope="col">{t.fallingMode}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              {
                                label: t.comparisonPlays,
                                rotation: evaluationSummary?.plays,
                                falling: fallingEvaluationSummary?.plays
                              },
                              {
                                label: t.comparisonClearRate,
                                rotation: evaluationSummary
                                  ? `${evaluationSummary.clearRate}%`
                                  : undefined,
                                falling: fallingEvaluationSummary
                                  ? `${fallingEvaluationSummary.clearRate}%`
                                  : undefined
                              },
                              {
                                label: t.comparisonTime,
                                rotation: evaluationSummary
                                  ? `${evaluationSummary.averageTime}s`
                                  : undefined,
                                falling: fallingEvaluationSummary
                                  ? `${fallingEvaluationSummary.averageTime}s`
                                  : undefined
                              },
                              {
                                label: t.comparisonChain,
                                rotation: evaluationSummary?.averageChain,
                                falling: fallingEvaluationSummary?.averageChain
                              },
                              {
                                label: t.comparisonSpecials,
                                rotation: evaluationSummary?.averageSpecials,
                                falling: fallingEvaluationSummary?.averageSpecials
                              },
                              {
                                label: t.comparisonInvalid,
                                rotation: evaluationSummary?.invalidRate === null
                                  ? t.comparisonNotApplicable
                                  : evaluationSummary
                                    ? `${evaluationSummary.invalidRate}%`
                                    : undefined,
                                falling: fallingEvaluationSummary
                                  ? t.comparisonNotApplicable
                                  : undefined
                              },
                              {
                                label: t.comparisonShuffles,
                                rotation: evaluationSummary?.averageShuffles,
                                falling: fallingEvaluationSummary
                                  ? t.comparisonNotApplicable
                                  : undefined
                              }
                            ].map((row) => (
                              <tr key={row.label}>
                                <th scope="row">{row.label}</th>
                                <td>{row.rotation ?? t.comparisonUnavailable}</td>
                                <td>{row.falling ?? t.comparisonUnavailable}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="color-chain-rotation-comparison-note">
                        {t.comparisonNote}
                      </p>
                      <button
                        className="color-chain-rotation-comparison-refresh"
                        onClick={refreshEvaluationComparison}
                        type="button"
                      >
                        <RotateCcw aria-hidden="true" />
                        {t.comparisonRefresh}
                      </button>
                    </section>
                  </div>
                )}
              </section>
            </div>
          )}
          {battleImpact && (
            <div
              aria-hidden="true"
              className={`color-chain-rotation-battle-flash is-${battleImpact}`}
            />
          )}
          {grandSpell && (
            <div
              aria-live="assertive"
              className={`color-chain-rotation-grand-cutin is-${grandSpell.id}`}
              key={grandSpell.sequence}
              role="status"
            >
              <div aria-hidden="true" className="color-chain-rotation-grand-cutin-backdrop" />
              <div aria-hidden="true" className="color-chain-rotation-grand-cutin-chains">
                <i />
                <i />
                <i />
              </div>
              <div aria-hidden="true" className="color-chain-rotation-grand-cutin-summon">
                <i />
                <i />
                <i />
              </div>
              <CharacterPicture
                alt=""
                asset={chromaAssets.chain}
                className="color-chain-rotation-grand-cutin-chroma"
              />
              <div className="color-chain-rotation-grand-cutin-copy">
                <span>{grandSpell.kicker}</span>
                <strong>{grandSpell.name}</strong>
                {grandSpell.detail && <small>× {grandSpell.detail}</small>}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
