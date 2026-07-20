import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronsDown,
  Eye,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Snowflake,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { ColorChainLandscapeNotice, ColorChainOpponentPlaceholder } from "./BattleShellSupport";
import {
  detectGestureAxis,
  GESTURE_CONFIG,
  gestureStepCount,
  isHardDropGesture,
  isTapGesture,
  shouldDeferSoftDrop,
  type GestureAxis
} from "./gesture";
import {
  applyGravityStep,
  addLaserCharge,
  addSlowCharge,
  BOMB_BLOCK,
  BOARD_COLUMNS,
  calculateClearScore,
  canPlacePair,
  cellKey,
  clearMatchedCells,
  COLOR_BREAKER_BLOCK,
  createEmptyBoard,
  createRandomPair,
  findMatches,
  findHorizontalLaserClearCells,
  findSuperSpecialClearCells,
  findTriggeredSpecialClearCells,
  getChainMultiplier,
  getGhostPair,
  getPairCells,
  getSpawnPreviewTokens,
  hasBlocksAboveTop,
  HIDDEN_ROWS,
  HORIZONTAL_LASER_BLOCK,
  mergePair,
  movePair,
  preparePairForSpawn,
  rotatePair,
  TOTAL_ROWS,
  VERTICAL_LASER_BLOCK,
  VISIBLE_ROWS,
  type BlockToken,
  type Board,
  type FallingPair,
  type SpecialClearResult
} from "./logic";

type ColorChainProps = {
  onBack: () => void;
  presentation?: "public" | "mascot-test";
};

type Difficulty = "easy" | "normal";
type GameStatus = "idle" | "playing" | "paused" | "resolving" | "gameover";
type HelpItemId = "bomb" | "verticalLaser" | "horizontalLaser" | "colorBreaker" | "slowTime" | "hold";
type MascotMood = "idle" | "chain" | "danger" | "defeat";
type MascotAction = "none" | "staff-spin" | "hat-pop" | "grand-spell";
type MascotIdleMotion = Exclude<MascotAction, "grand-spell">;
type SpecialMoveId =
  | "chain-bomb"
  | "grand-chain-bomb"
  | "chain-pillar"
  | "trinity-pillar"
  | "chain-wave"
  | "trinity-wave"
  | "prism-break"
  | "prism-nova";
type ActiveSpecialMove = {
  id: SpecialMoveId;
  name: string;
  tier: "standard" | "super";
  nonce: number;
};

type ActiveBoardGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  axis: GestureAxis;
  horizontalSteps: number;
  verticalSteps: number;
};

type BestResult = {
  score: number;
  maxChain: number;
  cleared: number;
  recordedAt: string;
};

const BEST_KEY = "game-shelf-color-chain-best";
const MASCOT_VISIBLE_KEY = "game-shelf-color-chain-mascot-visible";
const CLEAR_DELAY = 220;
const FALL_DELAY = 130;
const GRAVITY_STEP_DELAY = 36;
const BOMB_BLOCK_SCORE = 5;
const BOMB_TRIGGER_SCORE = 25;
const SUPER_BOMB_TRIGGER_SCORE = 100;
const LASER_BLOCK_SCORE = 4;
const VERTICAL_LASER_TRIGGER_SCORE = 20;
const SUPER_VERTICAL_LASER_TRIGGER_SCORE = 80;
const HORIZONTAL_LASER_TRIGGER_SCORE = 20;
const SUPER_HORIZONTAL_LASER_TRIGGER_SCORE = 80;
const COLOR_BREAKER_TRIGGER_SCORE = 45;
const SUPER_COLOR_BREAKER_TRIGGER_SCORE = 180;
const SLOW_DURATION = 10;
const SLOW_TICK = 250;
const IDLE_MOTION_MIN_DELAY = 9_000;
const IDLE_MOTION_DELAY_RANGE = 6_000;
const IDLE_MOTION_DURATION = 2_300;

const difficultySettings: Record<Difficulty, {
  colors: number;
  baseSpeed: number;
  bombChance: number;
  verticalLaserChance: number;
  horizontalLaserChance: number;
  colorBreakerChance: number;
  specialPity: number;
  laserBlocks: number;
}> = {
  easy: { colors: 4, baseSpeed: 860, bombChance: 0.07, verticalLaserChance: 0.05, horizontalLaserChance: 0.035, colorBreakerChance: 0.005, specialPity: 10, laserBlocks: 16 },
  normal: { colors: 5, baseSpeed: 710, bombChance: 0.05, verticalLaserChance: 0.04, horizontalLaserChance: 0.03, colorBreakerChance: 0.004, specialPity: 13, laserBlocks: 20 }
};

const symbols: Record<BlockToken, string> = {
  coral: "●",
  gold: "◆",
  mint: "▲",
  sky: "★",
  violet: "＋",
  rose: "✦",
  bomb: "✹",
  "vertical-laser": "↕",
  "horizontal-laser": "↔",
  "color-breaker": "✺"
};

function blockIcon(token: BlockToken) {
  return (
    <i
      aria-hidden="true"
      className={`color-chain-block-icon is-${token}`}
      data-symbol={symbols[token]}
    />
  );
}

const chainCallNames = {
  ja: [
    "マジカルチェイン",
    "Wチェイン",
    "トリプルチェイン",
    "ハイパーマジカルチェイン",
    "ギガマジカルチェイン",
    "アルティメットマジカルチェイン"
  ],
  en: [
    "Magical Chain",
    "Double Chain",
    "Triple Chain",
    "Hyper Magical Chain",
    "Giga Magical Chain",
    "Ultimate Magical Chain"
  ]
} as const;

function chainCallName(chain: number, language: keyof typeof chainCallNames) {
  const names = chainCallNames[language];
  return names[Math.min(Math.max(Math.floor(chain), 1), names.length) - 1];
}

const specialMoveNames: Record<"ja" | "en", Record<SpecialMoveId, string>> = {
  ja: {
    "chain-bomb": "チェインボム",
    "grand-chain-bomb": "グランドチェインボム",
    "chain-pillar": "チェインピラー",
    "trinity-pillar": "トリニティピラー",
    "chain-wave": "チェインウェーブ",
    "trinity-wave": "トリニティウェーブ",
    "prism-break": "プリズムブレイク",
    "prism-nova": "プリズムノヴァ"
  },
  en: {
    "chain-bomb": "Chain Bomb",
    "grand-chain-bomb": "Grand Chain Bomb",
    "chain-pillar": "Chain Pillar",
    "trinity-pillar": "Trinity Pillar",
    "chain-wave": "Chain Wave",
    "trinity-wave": "Trinity Wave",
    "prism-break": "Prism Break",
    "prism-nova": "Prism Nova"
  }
};

function specialMoveFromResult(result: SpecialClearResult, language: "ja" | "en") {
  let id: SpecialMoveId | null = null;
  if (result.superColorBreakers.size > 0) id = "prism-nova";
  else if (result.superVerticalLasers.size > 0) id = "trinity-pillar";
  else if (result.superHorizontalLasers.size > 0) id = "trinity-wave";
  else if (result.superBombs.size > 0) id = "grand-chain-bomb";
  else if (result.verticalLasers.size > 0) id = "chain-pillar";
  else if (result.horizontalLasers.size > 0) id = "chain-wave";
  else if (result.colorBreakers.size > 0) id = "prism-break";
  else if (result.bombs.size > 0) id = "chain-bomb";

  if (!id) return null;
  const tier = id === "grand-chain-bomb" || id === "trinity-pillar" || id === "trinity-wave" || id === "prism-nova"
    ? "super" as const
    : "standard" as const;
  return { id, name: specialMoveNames[language][id], tier };
}

const copy = {
  ja: {
    eyebrow: "落ちものパズル / 内部ゲーム",
    title: "カラーチェイン",
    idle: "2個1組のブロックを落とし、同じ色を4個以上並べてマジカルチェインを起こしましょう。",
    playing: "同じ色を4個以上つなげて、魔法のチェインを重ねましょう。",
    paused: "一時停止中です。再開すると落下が始まります。",
    resolving: (callName: string, count: number) => `${callName}！ ${count}個のブロックを消去しました。`,
    gameover: "ゲームオーバー。上部に余白を残しながらマジカルチェインを組み立てましょう。",
    score: "スコア",
    chain: "最大チェイン",
    cleared: "消去数",
    level: "レベル",
    next: "次のブロック",
    howTo: "遊び方",
    rules: "2個1組のブロックを移動・回転して積みます。同色が縦・横・斜めに4個以上並ぶと、魔法の鎖が結ばれる『マジカルチェイン』が発生します。落下後に続けて揃えるとWチェイン、トリプルチェインと発展し、特に3段階目以降はスコア倍率が大幅に上がります。ブロックが最上段を超えるとゲームオーバーです。",
    controls: "操作",
    keyboard: "PC: ←→で移動、↓で下降、Z/Xで回転、Spaceで即落下、Hでホールド、Sでスロータイム、Lでチェインウェーブ、Pで一時停止。チェインウェーブ照準中は↑↓で行を選び、Enterで発動します。1列幅の縦穴では、回転入力でブロックの上下を反転できます。",
    touchTitle: "タッチ操作",
    touchGuide: "盤面をタップで右回転、左右スワイプで横移動、ゆっくり下へなぞるとソフトドロップ、素早く下へ払うと即落下します。",
    easy: "初級",
    normal: "中級",
    easyDetail: "4色・ゆっくり",
    normalDetail: "5色・標準速度",
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
    resolvingLabel: "チェイン判定中",
    gameoverLabel: "ゲームオーバー",
    moveLeft: "左へ移動",
    moveRight: "右へ移動",
    rotate: "右回転",
    down: "1段下げる",
    hardDrop: "即落下",
    bombBlast: (count: number) => `チェインボム発動！ ${count}個のブロックを破壊しました。`,
    superBombBlast: (count: number) => `グランドチェインボム発動！ 5×5の範囲から${count}個のブロックを破壊しました。`,
    laser: "チェインウェーブ",
    laserReady: "発射可能",
    laserCharging: "ブロック消去で充填",
    laserProgress: (count: number) => `あと${count}個`,
    laserSelect: "消したい行を選んでください。上下キーで移動し、Enterで発射できます。",
    laserCancel: "選択をやめる",
    laserRow: (row: number) => `${row}行目へチェインウェーブ発動！`,
    laserMiss: "空の行にチェインウェーブを発動しました。",
    verticalLaserBlast: (count: number) => `チェインピラー発動！ ${count}個のブロックを破壊しました。`,
    superVerticalLaserBlast: (count: number) => `トリニティピラー発動！ 縦3列から${count}個のブロックを破壊しました。`,
    horizontalLaserBlast: (count: number) => `チェインウェーブ発動！ ${count}個のブロックを破壊しました。`,
    superHorizontalLaserBlast: (count: number) => `トリニティウェーブ発動！ 横3行から${count}個のブロックを破壊しました。`,
    colorBreakerBlast: (count: number) => `プリズムブレイク発動！ 同じ色のブロックを${count}個破壊しました。`,
    superColorBreakerBlast: (count: number) => `プリズムノヴァ発動！ すべての色ブロックを${count}個破壊しました。`,
    rewardCreated: (reward: string) => `${reward}を獲得！ 次のマジカルチェインに活用しましょう。`,
    itemHelpTitle: "特殊ブロック・補助技",
    itemHelpHint: "アイコンにマウスを重ねるか、タップすると詳しい説明を表示します。",
    bombItem: "チェインボム",
    bombDetail: "縦と横のラインを同時に消すと報酬として出現します。上下左右に隣接するブロックが消えると、周囲3×3を破壊します。チェインボム同士が上下左右で接触すると、5×5を消すグランドチェインボムが自動発動します。",
    verticalLaserItem: "チェインピラー",
    verticalLaserDetail: "縦に5個以上を消すと報酬として出現します。上下左右に隣接するブロックが消えると、その縦1列を消去します。チェインピラー同士が上下左右で接触すると、縦3列を消すトリニティピラーが自動発動します。",
    horizontalLaserItem: "チェインウェーブ",
    horizontalLaserDetail: "横に5個以上を消した報酬、または低確率の落下ブロックとして出現します。隣接ブロックの消去で横1行を破壊。チェインウェーブ同士が接触すると、横3行を消すトリニティウェーブが自動発動します。ゲージ技でも横1行を選んで消去できます。",
    colorBreakerItem: "プリズムブレイク",
    colorBreakerDetail: "斜めに5個以上を消した報酬、またはごく低確率のレア落下ブロックとして出現します。隣接する色ブロックが消えると、その色を全消去。チェインボム、チェインピラー、チェインウェーブに巻き込まれるとランダムな色を全消去し、同種同士の接触で全色を消すプリズムノヴァが発動します。",
    slowTimeItem: "スロータイム",
    slowTimeDetail: "10秒間、ブロックの落下速度を半分にします。16ブロック消去すると再使用できます。",
    holdItem: "ホールド",
    holdDetail: "現在のペアを保存し、次回以降のペアと交換できます。1ペアにつき1回使用できます。",
    selectRow: (row: number) => `${row}行目を消す`,
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
    mascotName: "彩鎖の魔女 クロマ",
    mascotShow: "キャラクターを表示",
    mascotHide: "キャラクターを非表示",
    mascotHidden: "キャラクター表示はOFFです。",
    mascotIdle: "次のマジカルチェインを見守っています。",
    mascotStaffSpin: "待ち時間に杖回しの練習中です。",
    mascotHatPop: "帽子がふわり！ 慌てて押さえました。",
    mascotGrandSpell: (spell: string) => `${spell}を詠唱！`,
    mascotChain: "マジカルチェイン成功！",
    mascotDanger: "上まで積み上がっています。気をつけて！",
    mascotDefeat: "次はもっと大きなチェインを作りましょう。"
  },
  en: {
    eyebrow: "FALLING BLOCK PUZZLE / INTERNAL GAME",
    title: "Color Chain",
    idle: "Drop connected pairs and match four or more colors to cast a Magical Chain.",
    playing: "Connect four matching colors and weave magical chains.",
    paused: "Paused. Resume when you are ready to continue.",
    resolving: (callName: string, count: number) => `${callName}! Cleared ${count} blocks.`,
    gameover: "Game over. Keep space near the top while preparing your chains.",
    score: "Score",
    chain: "Max chain",
    cleared: "Cleared",
    level: "Level",
    next: "Next pairs",
    howTo: "How to Play",
    rules: "Move and rotate each connected pair. Matching four or more colors vertically, horizontally, or diagonally casts a Magical Chain of glowing links. Matches formed after blocks fall advance to Double Chain, Triple Chain, and stronger calls, with a major score boost from the third stage onward. The game ends when blocks rise beyond the top.",
    controls: "Controls",
    keyboard: "PC: Move with ←/→, soft drop with ↓, rotate with Z/X, hard drop with Space, hold with H, use Slow Time with S, target Chain Wave with L, and pause with P. While targeting Chain Wave, choose a row with ↑/↓ and cast with Enter. In a one-cell-wide shaft, rotate to flip a vertical pair by 180 degrees.",
    touchTitle: "Touch controls",
    touchGuide: "Tap the board to rotate clockwise, swipe sideways to move, drag down slowly to soft drop, or flick down quickly to hard drop.",
    easy: "Easy",
    normal: "Normal",
    easyDetail: "4 colors · slow",
    normalDetail: "5 colors · standard",
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
    bombBlast: (count: number) => `Chain Bomb! Destroyed ${count} blocks.`,
    superBombBlast: (count: number) => `Grand Chain Bomb! Destroyed ${count} blocks in a 5×5 area.`,
    laser: "Chain Wave",
    laserReady: "Ready",
    laserCharging: "Charge by clearing blocks",
    laserProgress: (count: number) => `${count} blocks left`,
    laserSelect: "Select a row to clear. Use Up/Down and Enter on a keyboard.",
    laserCancel: "Cancel selection",
    laserRow: (row: number) => `Chain Wave cast at row ${row}!`,
    laserMiss: "Chain Wave was cast at an empty row.",
    verticalLaserBlast: (count: number) => `Chain Pillar! Destroyed ${count} blocks.`,
    superVerticalLaserBlast: (count: number) => `Trinity Pillar! Destroyed ${count} blocks across three columns.`,
    horizontalLaserBlast: (count: number) => `Chain Wave! Destroyed ${count} blocks.`,
    superHorizontalLaserBlast: (count: number) => `Trinity Wave! Destroyed ${count} blocks across three rows.`,
    colorBreakerBlast: (count: number) => `Prism Break! Destroyed ${count} matching-color blocks.`,
    superColorBreakerBlast: (count: number) => `Prism Nova! Destroyed all ${count} color blocks.`,
    rewardCreated: (reward: string) => `${reward} reward created! Set up your next chain with it.`,
    itemHelpTitle: "Special Blocks & Abilities",
    itemHelpHint: "Hover over an icon or tap it to see the full description.",
    bombItem: "Chain Bomb",
    bombDetail: "Created as a reward when horizontal and vertical lines clear together. It destroys a 3×3 area when an orthogonally adjacent block clears. Two touching Chain Bombs automatically cast a 5×5 Grand Chain Bomb.",
    verticalLaserItem: "Chain Pillar",
    verticalLaserDetail: "Created as a reward for clearing five or more blocks vertically. It erases its column when an orthogonally adjacent block clears. Two touching Chain Pillars automatically cast a three-column Trinity Pillar.",
    horizontalLaserItem: "Chain Wave",
    horizontalLaserDetail: "Appears after a horizontal five-block clear or as an occasional falling block. It erases its row when an adjacent block clears. Two touching Chain Waves automatically cast a three-row Trinity Wave. The charged ability can also erase one selected row.",
    colorBreakerItem: "Prism Break",
    colorBreakerDetail: "Appears after a diagonal five-block clear or, very rarely, as a falling block. An adjacent color clear erases that color; Chain Bomb, Chain Pillar, or Chain Wave erases a random color. Touching Prism Breaks casts Prism Nova to erase every color block.",
    slowTimeItem: "Slow Time",
    slowTimeDetail: "Halves the falling speed for 10 seconds. Clear 16 blocks to recharge it.",
    holdItem: "Hold",
    holdDetail: "Stores the current pair so you can swap it with a later pair. It can be used once per falling pair.",
    selectRow: (row: number) => `Clear row ${row}`,
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
    mascotName: "Chroma, Witch of Color Chains",
    mascotShow: "Show character",
    mascotHide: "Hide character",
    mascotHidden: "Character display is off.",
    mascotIdle: "Watching for the next Magical Chain.",
    mascotStaffSpin: "Passing the time with a quick wand spin.",
    mascotHatPop: "Her hat floated up! She caught it just in time.",
    mascotGrandSpell: (spell: string) => `Casting ${spell}!`,
    mascotChain: "Magical Chain complete!",
    mascotDanger: "The stack is near the top. Be careful!",
    mascotDefeat: "Let's weave an even bigger chain next time."
  }
} as const;

const mascotAssets: Record<Exclude<MascotMood, "idle"> | "idle" | "blink", string> = {
  idle: "/characters/chroma/chroma-idle",
  blink: "/characters/chroma/chroma-blink",
  chain: "/characters/chroma/chroma-chain",
  danger: "/characters/chroma/chroma-danger",
  defeat: "/characters/chroma/chroma-defeat"
};

function readMascotVisible() {
  try {
    return window.localStorage.getItem(MASCOT_VISIBLE_KEY) !== "false";
  } catch {
    return true;
  }
}

function ChromaMascotPanel({
  language,
  mood,
  action,
  visible,
  onToggle,
  labels
}: {
  language: "ja" | "en";
  mood: MascotMood;
  action: MascotAction;
  visible: boolean;
  onToggle: () => void;
  labels: {
    name: string;
    show: string;
    hide: string;
    hidden: string;
    status: string;
  };
}) {
  const alt = language === "ja" ? `クロマ：${labels.status}` : `Chroma: ${labels.status}`;

  return (
    <section className={`color-chain-mascot-panel is-${mood} is-action-${action}${visible ? "" : " is-hidden"}`} aria-label={labels.name}>
      <div className="color-chain-mascot-heading">
        <div>
          <span>{language === "ja" ? "CHARACTER" : "MASCOT"}</span>
          <strong>{labels.name}</strong>
        </div>
        <button
          aria-label={visible ? labels.hide : labels.show}
          aria-pressed={visible}
          className="color-chain-mascot-toggle"
          onClick={onToggle}
          type="button"
        >
          {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
          <span>{visible ? "ON" : "OFF"}</span>
        </button>
      </div>

      {visible ? (
        <>
          <div className="color-chain-mascot-portrait">
            <i className="color-chain-mascot-motion-fx is-staff" aria-hidden="true" />
            <i className="color-chain-mascot-motion-fx is-hat" aria-hidden="true" />
            <i className="color-chain-mascot-motion-fx is-grand-spell" aria-hidden="true" />
            {(Object.keys(mascotAssets) as Array<keyof typeof mascotAssets>).map((assetMood) => {
              const isIdleLayer = assetMood === "idle" || assetMood === "blink";
              const isActive = isIdleLayer ? mood === "idle" : assetMood === mood;
              return (
                <picture
                  aria-hidden={assetMood === "blink" || !isActive}
                  className={`color-chain-mascot-image is-${assetMood}${isActive ? " is-active" : ""}`}
                  key={assetMood}
                >
                  <source srcSet={`${mascotAssets[assetMood]}.webp`} type="image/webp" />
                  <img
                    alt={assetMood === "blink" || !isActive ? "" : alt}
                    draggable="false"
                    height="1254"
                    src={`${mascotAssets[assetMood]}.png`}
                    width="1254"
                  />
                </picture>
              );
            })}
          </div>
          <p aria-live="polite">{labels.status}</p>
        </>
      ) : <p className="color-chain-mascot-hidden-copy">{labels.hidden}</p>}
    </section>
  );
}

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

export function ColorChain({ onBack, presentation = "public" }: ColorChainProps) {
  const { language } = useI18n();
  const t = copy[language];
  const isMascotTest = presentation === "mascot-test";
  const title = isMascotTest
    ? language === "ja" ? "クロマのマジカルチェイン" : "Chroma's Magical Chain"
    : t.title;
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
  const [laserTargetRow, setLaserTargetRow] = useState(HIDDEN_ROWS + VISIBLE_ROWS - 1);
  const [horizontalLaserRows, setHorizontalLaserRows] = useState<number[]>([]);
  const [verticalLaserColumns, setVerticalLaserColumns] = useState<number[]>([]);
  const [holdPair, setHoldPair] = useState<FallingPair | null>(null);
  const [holdUsed, setHoldUsed] = useState(false);
  const [slowCharge, setSlowCharge] = useState(0);
  const [slowActive, setSlowActive] = useState(false);
  const [slowRemaining, setSlowRemaining] = useState(0);
  const [selectedHelpItem, setSelectedHelpItem] = useState<HelpItemId | null>(null);
  const [hoveredHelpItem, setHoveredHelpItem] = useState<HelpItemId | null>(null);
  const [bestResults, setBestResults] = useState<Partial<Record<Difficulty, BestResult>>>(() => readBestResults());
  const [mascotVisible, setMascotVisible] = useState(readMascotVisible);
  const [mascotIdleMotion, setMascotIdleMotion] = useState<MascotIdleMotion>("none");
  const [activeSpecialMove, setActiveSpecialMove] = useState<ActiveSpecialMove | null>(null);
  const [gestureAxis, setGestureAxis] = useState<GestureAxis>("none");

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
  const laserTargetRowRef = useRef(laserTargetRow);
  const holdPairRef = useRef(holdPair);
  const holdUsedRef = useRef(holdUsed);
  const slowChargeRef = useRef(slowCharge);
  const slowActiveRef = useRef(slowActive);
  const pairsWithoutSpecialRef = useRef(0);
  const resolutionToken = useRef(0);
  const specialMoveNonceRef = useRef(0);
  const activeBoardGestureRef = useRef<ActiveBoardGesture | null>(null);

  const settings = difficultySettings[difficulty];
  const ranking = useRanking({ gameId: `color-chain-${difficulty}`, metricLabel: "Score", mode: "higher" });
  const best = bestResults[difficulty];
  const normalDropInterval = Math.max(180, settings.baseSpeed - (level - 1) * 65);
  const dropInterval = slowActive ? normalDropInterval * 2 : normalDropInterval;
  const laserBlocksRemaining = Math.max(0, Math.ceil(((100 - laserCharge) * settings.laserBlocks) / 100));
  const helpItems = [
    { id: "bomb" as const, label: t.bombItem, detail: t.bombDetail, icon: blockIcon(BOMB_BLOCK) },
    { id: "verticalLaser" as const, label: t.verticalLaserItem, detail: t.verticalLaserDetail, icon: blockIcon(VERTICAL_LASER_BLOCK) },
    { id: "horizontalLaser" as const, label: t.horizontalLaserItem, detail: t.horizontalLaserDetail, icon: blockIcon(HORIZONTAL_LASER_BLOCK) },
    { id: "colorBreaker" as const, label: t.colorBreakerItem, detail: t.colorBreakerDetail, icon: blockIcon(COLOR_BREAKER_BLOCK) },
    { id: "slowTime" as const, label: t.slowTimeItem, detail: t.slowTimeDetail, icon: <Snowflake aria-hidden="true" /> },
    { id: "hold" as const, label: t.holdItem, detail: t.holdDetail, icon: <RotateCcw aria-hidden="true" /> }
  ];
  const activeHelpItemId = hoveredHelpItem ?? selectedHelpItem;
  const activeHelpItem = helpItems.find((item) => item.id === activeHelpItemId);
  const rewardLabel = (token: BlockToken) => {
    if (token === BOMB_BLOCK) return t.bombItem;
    if (token === VERTICAL_LASER_BLOCK) return t.verticalLaserItem;
    if (token === HORIZONTAL_LASER_BLOCK) return t.horizontalLaserItem;
    if (token === COLOR_BREAKER_BLOCK) return t.colorBreakerItem;
    return "";
  };

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

  const updateLaserTargetRow = (next: number) => {
    const normalized = Math.max(HIDDEN_ROWS, Math.min(TOTAL_ROWS - 1, next));
    laserTargetRowRef.current = normalized;
    setLaserTargetRow(normalized);
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

  const showSpecialMove = (move: Omit<ActiveSpecialMove, "nonce"> | null) => {
    if (!move) {
      setActiveSpecialMove(null);
      return;
    }
    specialMoveNonceRef.current += 1;
    setActiveSpecialMove({ ...move, nonce: specialMoveNonceRef.current });
  };

  const recordClearedBlocks = (count: number, chargeHorizontalLaser = true) => {
    if (count <= 0) return;
    const nextCleared = clearedRef.current + count;
    const nextLevel = Math.floor(nextCleared / 24) + 1;
    clearedRef.current = nextCleared;
    levelRef.current = nextLevel;
    setCleared(nextCleared);
    setLevel(nextLevel);
    updateSlowCharge(addSlowCharge(slowChargeRef.current, count, slowActiveRef.current));
    if (chargeHorizontalLaser) {
      updateLaserCharge(addLaserCharge(
        laserChargeRef.current,
        count,
        difficultySettings[difficultyRef.current].laserBlocks
      ));
    }
  };

  function createQueuedPair(nextDifficulty: Difficulty) {
    const nextSettings = difficultySettings[nextDifficulty];
    const forceSpecial = pairsWithoutSpecialRef.current >= nextSettings.specialPity;
    const specialChances = [
      nextSettings.bombChance,
      nextSettings.verticalLaserChance,
      nextSettings.horizontalLaserChance,
      nextSettings.colorBreakerChance
    ] as const;
    const totalSpecialChance = specialChances.reduce((sum, chance) => sum + chance, 0);
    const appliedChances = forceSpecial
      ? specialChances.map((chance) => chance / totalSpecialChance)
      : specialChances;
    const [bombChance, verticalLaserChance, horizontalLaserChance, colorBreakerChance] = appliedChances;
    const pair = createRandomPair(
      nextSettings.colors,
      Math.random,
      bombChance,
      verticalLaserChance,
      horizontalLaserChance,
      colorBreakerChance
    );
    if (
      pair.colors.includes(BOMB_BLOCK)
      || pair.colors.includes(VERTICAL_LASER_BLOCK)
      || pair.colors.includes(HORIZONTAL_LASER_BLOCK)
      || pair.colors.includes(COLOR_BREAKER_BLOCK)
    ) pairsWithoutSpecialRef.current = 0;
    else pairsWithoutSpecialRef.current += 1;
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
    setHorizontalLaserRows([]);
    setVerticalLaserColumns([]);
    showSpecialMove(null);
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
    showSpecialMove(null);
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

    while (token === resolutionToken.current) {
      const superClear = findSuperSpecialClearCells(nextBoard);
      if (superClear.cells.size > 0) {
        const superMove = specialMoveFromResult(superClear, language);
        showSpecialMove(superMove);
        setVerticalLaserColumns([...superClear.verticalLaserColumns]);
        setHorizontalLaserRows([...superClear.horizontalLaserRows]);
        setClearingCells(new Set(superClear.cells));
        setMessage(
          superClear.superColorBreakers.size > 0
            ? t.superColorBreakerBlast(superClear.colorBreakerClearedCells.size)
            : superClear.superVerticalLasers.size > 0
              ? t.superVerticalLaserBlast(superClear.cells.size)
              : superClear.superHorizontalLasers.size > 0
                ? t.superHorizontalLaserBlast(superClear.cells.size)
                : t.superBombBlast(superClear.cells.size)
        );
        await wait(CLEAR_DELAY + (superMove?.tier === "super" ? 420 : 140));
        if (token !== resolutionToken.current) return;

        nextBoard = clearMatchedCells(nextBoard, superClear.cells);
        updateBoard(nextBoard);
        setClearingCells(new Set());
        setVerticalLaserColumns([]);
        setHorizontalLaserRows([]);
        showSpecialMove(null);
        recordClearedBlocks(superClear.cells.size);
        const superClearScore = (
          superClear.cells.size * BOMB_BLOCK_SCORE
          + superClear.bombs.size * BOMB_TRIGGER_SCORE
          + superClear.verticalLasers.size * VERTICAL_LASER_TRIGGER_SCORE
          + superClear.horizontalLasers.size * HORIZONTAL_LASER_TRIGGER_SCORE
          + superClear.colorBreakers.size * COLOR_BREAKER_TRIGGER_SCORE
          + superClear.superBombs.size * SUPER_BOMB_TRIGGER_SCORE
          + superClear.superVerticalLasers.size * SUPER_VERTICAL_LASER_TRIGGER_SCORE
          + superClear.superHorizontalLasers.size * SUPER_HORIZONTAL_LASER_TRIGGER_SCORE
          + superClear.superColorBreakers.size * SUPER_COLOR_BREAKER_TRIGGER_SCORE
        );
        addScore(superClearScore * getChainMultiplier(chain));
        await wait(FALL_DELAY);
        if (token !== resolutionToken.current) return;
        nextBoard = await animateGravity(nextBoard, token);
        if (token !== resolutionToken.current) return;
        await wait(FALL_DELAY);
        continue;
      }

      const match = findMatches(nextBoard);
      if (match.cells.size === 0) break;

      chain += 1;
      const clearResult = findTriggeredSpecialClearCells(nextBoard, match.cells);
      const specialTriggered = (
        clearResult.bombs.size > 0
        || clearResult.verticalLasers.size > 0
        || clearResult.horizontalLasers.size > 0
        || clearResult.colorBreakers.size > 0
        || clearResult.superBombs.size > 0
        || clearResult.superVerticalLasers.size > 0
        || clearResult.superHorizontalLasers.size > 0
        || clearResult.superColorBreakers.size > 0
      );
      const specialMove = specialMoveFromResult(clearResult, language);
      const extraCleared = Math.max(0, clearResult.cells.size - match.cells.size);
      const rewards = match.rewardBlocks.filter((reward) => clearResult.cells.has(reward.key));
      const clearedCount = Math.max(0, clearResult.cells.size - rewards.length);
      setCurrentChain(chain);
      showSpecialMove(specialMove);
      setVerticalLaserColumns([...clearResult.verticalLaserColumns]);
      setHorizontalLaserRows([...clearResult.horizontalLaserRows]);
      setClearingCells(new Set(clearResult.cells));
      setMessage(
        clearResult.superColorBreakers.size > 0
          ? t.superColorBreakerBlast(clearResult.colorBreakerClearedCells.size)
          : clearResult.superVerticalLasers.size > 0
            ? t.superVerticalLaserBlast(clearResult.cells.size)
            : clearResult.superHorizontalLasers.size > 0
              ? t.superHorizontalLaserBlast(clearResult.cells.size)
              : clearResult.superBombs.size > 0
                ? t.superBombBlast(clearResult.cells.size)
                : clearResult.verticalLasers.size > 0
                  ? t.verticalLaserBlast(clearResult.cells.size)
                  : clearResult.horizontalLasers.size > 0
                    ? t.horizontalLaserBlast(clearResult.cells.size)
                    : clearResult.colorBreakers.size > 0
                      ? t.colorBreakerBlast(clearResult.colorBreakerClearedCells.size)
                      : clearResult.bombs.size > 0
                        ? t.bombBlast(clearResult.cells.size)
                        : rewards.length > 0
                          ? t.rewardCreated(rewards.map((reward) => rewardLabel(reward.token)).filter(Boolean).join("・"))
                          : t.resolving(chainCallName(chain, language), match.cells.size)
      );
      await wait(CLEAR_DELAY + (specialTriggered ? 80 : 0));
      if (token !== resolutionToken.current) return;

      nextBoard = clearMatchedCells(nextBoard, clearResult.cells, rewards);
      updateBoard(nextBoard);
      setClearingCells(new Set());
      setVerticalLaserColumns([]);
      setHorizontalLaserRows([]);
      showSpecialMove(null);
      await wait(FALL_DELAY);
      if (token !== resolutionToken.current) return;

      nextBoard = await animateGravity(nextBoard, token);
      if (token !== resolutionToken.current) return;
      const nextMaxChain = Math.max(maxChainRef.current, chain);
      maxChainRef.current = nextMaxChain;
      setMaxChain(nextMaxChain);
      recordClearedBlocks(clearedCount);
      const specialClearScore = (
        extraCleared * BOMB_BLOCK_SCORE
        + clearResult.bombs.size * BOMB_TRIGGER_SCORE
        + clearResult.verticalLasers.size * VERTICAL_LASER_TRIGGER_SCORE
        + clearResult.horizontalLasers.size * HORIZONTAL_LASER_TRIGGER_SCORE
        + clearResult.colorBreakers.size * COLOR_BREAKER_TRIGGER_SCORE
        + clearResult.superBombs.size * SUPER_BOMB_TRIGGER_SCORE
        + clearResult.superVerticalLasers.size * SUPER_VERTICAL_LASER_TRIGGER_SCORE
        + clearResult.superHorizontalLasers.size * SUPER_HORIZONTAL_LASER_TRIGGER_SCORE
        + clearResult.superColorBreakers.size * SUPER_COLOR_BREAKER_TRIGGER_SCORE
      );
      addScore(
        calculateClearScore(match, chain)
        + specialClearScore * getChainMultiplier(chain)
      );
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
    let bestRow = HIDDEN_ROWS + VISIBLE_ROWS - 1;
    let bestCount = -1;
    for (let row = HIDDEN_ROWS; row < TOTAL_ROWS; row += 1) {
      const count = boardRef.current[row].filter(Boolean).length;
      if (count >= bestCount) {
        bestRow = row;
        bestCount = count;
      }
    }
    updateLaserTargetRow(bestRow);
    updateLaserTargeting(true);
    setMessage(t.laserSelect);
  }

  function cancelLaserTargeting() {
    if (!laserTargetingRef.current) return;
    updateLaserTargeting(false);
    setMessage(t.playing);
  }

  function moveLaserTarget(direction: -1 | 1) {
    if (!laserTargetingRef.current) return;
    updateLaserTargetRow(laserTargetRowRef.current + direction);
  }

  async function resolveLaser(row: number, token: number) {
    const result = findHorizontalLaserClearCells(boardRef.current, row);
    const specialMove = specialMoveFromResult(result, language) ?? {
      id: "chain-wave" as const,
      name: specialMoveNames[language]["chain-wave"],
      tier: "standard" as const
    };
    showSpecialMove(specialMove);
    setHorizontalLaserRows([...new Set([row, ...result.horizontalLaserRows])]);
    setVerticalLaserColumns([...result.verticalLaserColumns]);
    setMessage(result.cells.size > 0 ? t.laserRow(row - HIDDEN_ROWS + 1) : t.laserMiss);
    setClearingCells(new Set(result.cells));
    await wait(CLEAR_DELAY + (specialMove.tier === "super" ? 420 : 80));
    if (token !== resolutionToken.current) return;

    let nextBoard = boardRef.current;
    if (result.cells.size > 0) {
      nextBoard = clearMatchedCells(nextBoard, result.cells);
      updateBoard(nextBoard);
      recordClearedBlocks(result.cells.size, false);
      addScore(
        result.cells.size * LASER_BLOCK_SCORE
        + result.bombs.size * BOMB_TRIGGER_SCORE
        + result.verticalLasers.size * VERTICAL_LASER_TRIGGER_SCORE
        + result.horizontalLasers.size * HORIZONTAL_LASER_TRIGGER_SCORE
        + result.colorBreakers.size * COLOR_BREAKER_TRIGGER_SCORE
        + result.superBombs.size * SUPER_BOMB_TRIGGER_SCORE
        + result.superVerticalLasers.size * SUPER_VERTICAL_LASER_TRIGGER_SCORE
        + result.superHorizontalLasers.size * SUPER_HORIZONTAL_LASER_TRIGGER_SCORE
        + result.superColorBreakers.size * SUPER_COLOR_BREAKER_TRIGGER_SCORE
      );
    }
    setClearingCells(new Set());
    setHorizontalLaserRows([]);
    setVerticalLaserColumns([]);
    showSpecialMove(null);
    await wait(FALL_DELAY);
    if (token !== resolutionToken.current) return;
    await resolveBoard(nextBoard, token, false);
  }

  function fireLaser(row: number) {
    if (!laserTargetingRef.current || statusRef.current !== "playing") return;
    if (row < HIDDEN_ROWS || row >= TOTAL_ROWS) return;
    updateLaserTargeting(false);
    updateLaserCharge(0);
    updateStatus("resolving");
    const token = resolutionToken.current + 1;
    resolutionToken.current = token;
    void resolveLaser(row, token);
  }

  function startGame(nextDifficulty: Difficulty = difficulty) {
    resolutionToken.current += 1;
    difficultyRef.current = nextDifficulty;
    setDifficulty(nextDifficulty);
    const nextBoard = createEmptyBoard();
    pairsWithoutSpecialRef.current = 0;
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
    laserTargetRowRef.current = HIDDEN_ROWS + VISIBLE_ROWS - 1;
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
    setLaserTargetRow(HIDDEN_ROWS + VISIBLE_ROWS - 1);
    setHorizontalLaserRows([]);
    setVerticalLaserColumns([]);
    setHoldPair(null);
    setHoldUsed(false);
    setSlowCharge(100);
    setSlowActive(false);
    setSlowRemaining(0);
    setMascotIdleMotion("none");
    showSpecialMove(null);
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

  function clearBoardGesture(pointerId?: number) {
    const gesture = activeBoardGestureRef.current;
    if (gesture && pointerId !== undefined && gesture.pointerId !== pointerId) return;
    activeBoardGestureRef.current = null;
    setGestureAxis("none");
  }

  function updateGestureAxis(gesture: ActiveBoardGesture, deltaX: number, deltaY: number) {
    const nextAxis = detectGestureAxis(deltaX, deltaY, gesture.axis);
    if (nextAxis !== gesture.axis) {
      gesture.axis = nextAxis;
      setGestureAxis(nextAxis);
    }
    return nextAxis;
  }

  function applyHorizontalGestureSteps(gesture: ActiveBoardGesture, deltaX: number, boardWidth: number) {
    const cellWidth = boardWidth / BOARD_COLUMNS;
    const totalSteps = gestureStepCount(
      deltaX,
      Math.max(18, cellWidth * GESTURE_CONFIG.horizontalStepRatio)
    );
    const pendingSteps = totalSteps - gesture.horizontalSteps;
    if (pendingSteps === 0) return;
    const direction = pendingSteps > 0 ? 1 : -1;
    for (let index = 0; index < Math.abs(pendingSteps); index += 1) moveHorizontal(direction);
    gesture.horizontalSteps = totalSteps;
  }

  function applyVerticalGestureSteps(
    gesture: ActiveBoardGesture,
    deltaY: number,
    duration: number,
    boardHeight: number,
    force = false
  ) {
    if (!force && shouldDeferSoftDrop(deltaY, duration)) return;
    const cellHeight = boardHeight / VISIBLE_ROWS;
    const totalSteps = Math.max(0, gestureStepCount(
      deltaY,
      Math.max(16, cellHeight * GESTURE_CONFIG.softDropStepRatio)
    ));
    const pendingSteps = totalSteps - gesture.verticalSteps;
    if (pendingSteps <= 0) return;
    for (let index = 0; index < pendingSteps; index += 1) {
      if (statusRef.current !== "playing") break;
      softDrop();
    }
    gesture.verticalSteps = totalSteps;
  }

  function handleBoardPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      !isMascotTest
      || event.pointerType === "mouse"
      || !event.isPrimary
      || event.button !== 0
      || statusRef.current !== "playing"
      || laserTargetingRef.current
      || activeBoardGestureRef.current
    ) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activeBoardGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: event.timeStamp,
      axis: "none",
      horizontalSteps: 0,
      verticalSteps: 0
    };
    setGestureAxis("none");
  }

  function handleBoardPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = activeBoardGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (statusRef.current !== "playing" || laserTargetingRef.current) {
      clearBoardGesture(event.pointerId);
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const duration = Math.max(1, event.timeStamp - gesture.startTime);
    const axis = updateGestureAxis(gesture, deltaX, deltaY);
    const boardRect = event.currentTarget.getBoundingClientRect();
    if (axis === "horizontal") applyHorizontalGestureSteps(gesture, deltaX, boardRect.width);
    if (axis === "vertical") applyVerticalGestureSteps(gesture, deltaY, duration, boardRect.height);
  }

  function handleBoardPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = activeBoardGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const duration = Math.max(1, event.timeStamp - gesture.startTime);
    const boardRect = event.currentTarget.getBoundingClientRect();

    if (statusRef.current === "playing" && !laserTargetingRef.current) {
      if (isHardDropGesture(deltaX, deltaY, duration, boardRect.height / VISIBLE_ROWS)) {
        hardDrop();
      } else {
        const axis = updateGestureAxis(gesture, deltaX, deltaY);
        if (axis === "horizontal") applyHorizontalGestureSteps(gesture, deltaX, boardRect.width);
        if (axis === "vertical") applyVerticalGestureSteps(gesture, deltaY, duration, boardRect.height, true);
        if (axis === "none" && isTapGesture(deltaX, deltaY, duration)) rotate(1);
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clearBoardGesture(event.pointerId);
  }

  function handleBoardPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clearBoardGesture(event.pointerId);
  }

  useEffect(() => {
    if (status !== "playing" || laserTargeting) return;
    const timer = window.setInterval(automaticDrop, dropInterval);
    return () => window.clearInterval(timer);
  }, [dropInterval, laserTargeting, status]);

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
      const controlKeys = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Enter", "z", "Z", "x", "X", "h", "H", "s", "S", "p", "P", "l", "L", "Escape"];
      if (!controlKeys.includes(event.key)) return;
      event.preventDefault();

      if (laserTargetingRef.current) {
        if (event.key === "Escape") cancelLaserTargeting();
        if (event.key === "ArrowUp") moveLaserTarget(-1);
        if (event.key === "ArrowDown") moveLaserTarget(1);
        if (event.key === "Enter" || event.key === " ") fireLaser(laserTargetRowRef.current);
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

  useEffect(() => {
    if (status !== "playing" || laserTargeting) clearBoardGesture();
  }, [laserTargeting, status]);

  useEffect(() => {
    if (!isMascotTest) return;
    try {
      window.localStorage.setItem(MASCOT_VISIBLE_KEY, String(mascotVisible));
    } catch {
      // Storage may be unavailable in privacy modes; the in-memory setting still works.
    }
  }, [isMascotTest, mascotVisible]);

  const ghostPair = activePair ? getGhostPair(board, activePair) : null;
  const boardIsDangerous = useMemo(
    () => board
      .slice(HIDDEN_ROWS, HIDDEN_ROWS + 4)
      .some((row) => row.some((cell) => cell !== null)),
    [board]
  );
  const mascotMood: MascotMood = status === "gameover"
    ? "defeat"
    : status === "resolving" && (currentChain > 0 || activeSpecialMove !== null)
      ? "chain"
      : boardIsDangerous
        ? "danger"
        : "idle";
  const mascotCanUseIdleMotion = mascotMood === "idle" && (status === "playing" || status === "resolving");

  useEffect(() => {
    setMascotIdleMotion("none");
    if (!isMascotTest || !mascotVisible || !mascotCanUseIdleMotion) return;

    let timer = 0;
    let cancelled = false;
    const scheduleMotion = () => {
      const delay = IDLE_MOTION_MIN_DELAY + Math.random() * IDLE_MOTION_DELAY_RANGE;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setMascotIdleMotion(Math.random() < 0.55 ? "staff-spin" : "hat-pop");
        timer = window.setTimeout(() => {
          if (cancelled) return;
          setMascotIdleMotion("none");
          scheduleMotion();
        }, IDLE_MOTION_DURATION);
      }, delay);
    };
    scheduleMotion();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isMascotTest, mascotCanUseIdleMotion, mascotVisible]);

  const mascotAction: MascotAction = activeSpecialMove?.tier === "super"
    ? "grand-spell"
    : mascotIdleMotion;
  const mascotStatus = activeSpecialMove?.tier === "super"
    ? t.mascotGrandSpell(activeSpecialMove.name)
    : mascotIdleMotion === "staff-spin"
      ? t.mascotStaffSpin
      : mascotIdleMotion === "hat-pop"
        ? t.mascotHatPop
        : mascotMood === "chain"
          ? t.mascotChain
    : mascotMood === "danger"
      ? t.mascotDanger
      : mascotMood === "defeat"
        ? t.mascotDefeat
        : t.mascotIdle;
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
    <section className={`puzzle-shell color-chain-shell${isMascotTest ? " is-mascot-test" : ""}`} aria-labelledby="color-chain-title">
      <div className="puzzle-hero color-chain-hero">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 id="color-chain-title">{title}</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel color-chain-score" aria-label={t.status}>
          <div><span>{t.score}</span><strong>{score.toLocaleString()}</strong></div>
          <div><span>{t.chain}</span><strong>{maxChain}</strong></div>
          <div><span>{t.cleared}</span><strong>{cleared}</strong></div>
          <div><span>{t.level}</span><strong>{level}</strong></div>
        </div>
      </div>

      {isMascotTest && <ColorChainLandscapeNotice language={language} />}

      <div className="puzzle-layout color-chain-layout">
        <div className={`color-chain-play-area${isMascotTest ? " has-mascot" : ""}${isMascotTest && activeSpecialMove?.tier === "super" ? " is-grand-spell-active" : ""}`}>
          <div className="color-chain-board-wrap">
            <div
              aria-describedby={isMascotTest ? "color-chain-touch-guide" : undefined}
              className={`color-chain-board${isMascotTest && status === "playing" && !laserTargeting ? " is-gesture-enabled" : ""}${gestureAxis !== "none" ? ` is-gesture-${gestureAxis}` : ""}`}
              onContextMenu={isMascotTest ? (event) => event.preventDefault() : undefined}
              onLostPointerCapture={isMascotTest ? (event) => clearBoardGesture(event.pointerId) : undefined}
              onPointerCancel={isMascotTest ? handleBoardPointerCancel : undefined}
              onPointerDown={isMascotTest ? handleBoardPointerDown : undefined}
              onPointerMove={isMascotTest ? handleBoardPointerMove : undefined}
              onPointerUp={isMascotTest ? handleBoardPointerUp : undefined}
              role="grid"
              aria-label={`${title} board`}
            >
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
                {Array.from({ length: VISIBLE_ROWS }, (_, visibleRow) => {
                  const boardRow = visibleRow + HIDDEN_ROWS;
                  return (
                  <button
                    aria-label={t.selectRow(visibleRow + 1)}
                    className={laserTargetRow === boardRow ? "is-selected" : ""}
                    key={boardRow}
                    onClick={() => fireLaser(boardRow)}
                    onPointerEnter={() => updateLaserTargetRow(boardRow)}
                    type="button"
                  ><span>{visibleRow + 1}</span></button>
                  );
                })}
              </div>
            )}

            {horizontalLaserRows.length > 0 && (
              <div className="color-chain-horizontal-laser-beams" aria-hidden="true">
                {Array.from({ length: VISIBLE_ROWS }, (_, visibleRow) => (
                  <i className={horizontalLaserRows.includes(visibleRow + HIDDEN_ROWS) ? "is-active" : ""} key={visibleRow} />
                ))}
              </div>
            )}

            {verticalLaserColumns.length > 0 && (
              <div className="color-chain-vertical-laser-beams" aria-hidden="true">
                {Array.from({ length: BOARD_COLUMNS }, (_, column) => (
                  <i className={verticalLaserColumns.includes(column) ? "is-active" : ""} key={column} />
                ))}
              </div>
            )}

            {clearingCells.size > 0 && status === "resolving" && (
              <div className={`color-chain-magic-chain-effect is-tier-${Math.min(currentChain, 6)}`} aria-hidden="true">
                <span>{Array.from({ length: 10 }, (_, index) => <i key={`upper-${index}`} />)}</span>
                <span>{Array.from({ length: 10 }, (_, index) => <i key={`lower-${index}`} />)}</span>
              </div>
            )}

            {isMascotTest && activeSpecialMove?.tier === "super" && status === "resolving" && (
              <div
                aria-hidden="true"
                className={`color-chain-grand-spell-effect is-${activeSpecialMove.id}`}
                key={`grand-spell-${activeSpecialMove.nonce}`}
              >
                <i />
                <i />
                <i />
              </div>
            )}

            {(currentChain >= 1 || activeSpecialMove) && status === "resolving" && (
              <div
                className={`color-chain-burst${activeSpecialMove ? " is-special-move" : ""}${activeSpecialMove?.tier === "super" ? " is-super-move" : ""}`}
                aria-live="polite"
                key={activeSpecialMove ? `special-${activeSpecialMove.nonce}` : `chain-${currentChain}`}
              >
                <Sparkles aria-hidden="true" />
                <span>
                  <strong>{activeSpecialMove?.name ?? chainCallName(currentChain, language)}</strong>
                  {activeSpecialMove && currentChain >= 1 && (
                    <small>{chainCallName(currentChain, language)} ×{getChainMultiplier(currentChain)}</small>
                  )}
                </span>
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

          {isMascotTest && (
            <ChromaMascotPanel
              action={mascotAction}
              labels={{
                name: t.mascotName,
                show: t.mascotShow,
                hide: t.mascotHide,
                hidden: t.mascotHidden,
                status: mascotStatus
              }}
              language={language}
              mood={mascotMood}
              onToggle={() => setMascotVisible((current) => !current)}
              visible={mascotVisible}
            />
          )}

          <div className="color-chain-touch-controls" aria-label={t.controls}>
            <button type="button" disabled={status !== "playing" || laserTargeting} onClick={() => moveHorizontal(-1)} aria-label={t.moveLeft}><ArrowLeft /></button>
            <button type="button" disabled={status !== "playing" || laserTargeting} onClick={() => rotate(1)} aria-label={t.rotate}><RotateCw /></button>
            <button type="button" disabled={status !== "playing" || laserTargeting} onClick={softDrop} aria-label={t.down}><ArrowDown /></button>
            <button type="button" disabled={status !== "playing" || laserTargeting} onClick={hardDrop} aria-label={t.hardDrop}><ChevronsDown /></button>
            <button type="button" disabled={status !== "playing" || laserTargeting} onClick={() => moveHorizontal(1)} aria-label={t.moveRight}><ArrowRight /></button>
          </div>

          <div className={`color-chain-laser-panel${laserCharge >= 100 ? " is-ready" : ""}`}>
            <div className="color-chain-laser-heading">
              <span>{blockIcon(HORIZONTAL_LASER_BLOCK)} {t.laser}</span>
              <strong>{laserCharge >= 100 ? t.laserReady : t.laserProgress(laserBlocksRemaining)}</strong>
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
              data-testid="color-chain-horizontal-laser-button"
              disabled={!laserTargeting && (status !== "playing" || laserCharge < 100)}
              onClick={laserTargeting ? cancelLaserTargeting : beginLaserTargeting}
              type="button"
            >
              {laserTargeting ? <X aria-hidden="true" /> : blockIcon(HORIZONTAL_LASER_BLOCK)}
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
          {isMascotTest && <ColorChainOpponentPlaceholder language={language} />}
          <div className="color-chain-next rule-card">
            <h2>{t.next}</h2>
            <div>
              {nextPairs.map((pair, index) => (
                <span className="color-chain-next-pair" key={`${index}-${pair.colors.join("-")}`}>
                  {getSpawnPreviewTokens(pair).map((color, colorIndex) => (
                    <i className={`is-${color}`} data-symbol={symbols[color]} key={`${color}-${colorIndex}`} />
                  ))}
                </span>
              ))}
            </div>
          </div>

          <div className="rule-card">
            <h2>{t.howTo}</h2>
            <p>{t.rules}</p>
            <section className="color-chain-help" aria-labelledby="color-chain-help-title">
              <h3 id="color-chain-help-title">{t.itemHelpTitle}</h3>
              <div
                className="color-chain-help-icons"
                onMouseLeave={() => setHoveredHelpItem(null)}
              >
                {helpItems.map((item) => (
                  <button
                    aria-controls="color-chain-help-detail"
                    aria-expanded={activeHelpItemId === item.id}
                    className={`color-chain-help-icon is-${item.id}${selectedHelpItem === item.id ? " is-selected" : ""}`}
                    key={item.id}
                    type="button"
                    onBlur={() => setHoveredHelpItem(null)}
                    onClick={() => setSelectedHelpItem(item.id)}
                    onFocus={() => setHoveredHelpItem(item.id)}
                    onMouseEnter={() => setHoveredHelpItem(item.id)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <div
                aria-live="polite"
                className={`color-chain-help-detail${activeHelpItem ? " is-active" : " is-empty"}`}
                id="color-chain-help-detail"
              >
                {activeHelpItem ? (
                  <>
                    <strong>{activeHelpItem.label}</strong>
                    <p>{activeHelpItem.detail}</p>
                  </>
                ) : (
                  <p>{t.itemHelpHint}</p>
                )}
              </div>
            </section>
            <h3>{t.controls}</h3>
            <p>{t.keyboard}</p>
            {isMascotTest && (
              <p className="color-chain-gesture-guide" id="color-chain-touch-guide">
                <strong>{t.touchTitle}:</strong> {t.touchGuide}
              </p>
            )}
          </div>

          <div className="color-chain-difficulties" aria-label="Difficulty">
            {(["easy", "normal"] as Difficulty[]).map((entry) => (
              <button
                className={difficulty === entry ? "is-selected" : ""}
                disabled={status === "playing" || status === "resolving" || status === "paused"}
                key={entry}
                type="button"
                onClick={() => startGame(entry)}
              >
                <strong>{t[entry]}</strong>
                <small>{t[`${entry}Detail` as "easyDetail" | "normalDetail"]}</small>
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

export function ColorChainMascotTest({ onBack }: Pick<ColorChainProps, "onBack">) {
  return <ColorChain onBack={onBack} presentation="mascot-test" />;
}
