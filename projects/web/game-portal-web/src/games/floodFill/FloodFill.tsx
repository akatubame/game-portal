import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { safeStorage } from "../../safeStorage";
import { PaintBucket, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { useLocalizedMessage } from "../useLocalizedMessage";
import type { CSSProperties } from "react";
import type { FloodBest, FloodColor, FloodDifficulty, FloodStatus } from "./types";

type FloodFillProps = {
  onBack: () => void;
};

const BEST_KEY = "game-shelf-flood-fill-best";
const colors: FloodColor[] = ["coral", "gold", "mint", "sky", "violet", "rose"];

const colorLabels: Record<FloodColor, string> = {
  coral: "コーラル",
  gold: "ゴールド",
  mint: "ミント",
  sky: "スカイ",
  violet: "バイオレット",
  rose: "ローズ"
};

const difficultySettings: Record<FloodDifficulty, { label: string; size: number; moves: number; description: string }> = {
  small: {
    label: "小さめ",
    size: 8,
    moves: 18,
    description: "8×8を18手以内。まずは軽く遊べます。"
  },
  normal: {
    label: "ふつう",
    size: 10,
    moves: 22,
    description: "10×10を22手以内。標準的な手応えです。"
  },
  large: {
    label: "大きめ",
    size: 12,
    moves: 26,
    description: "12×12を26手以内。少しじっくり考える盤面です。"
  }
};

function readBest(): Record<FloodDifficulty, FloodBest | undefined> {
  const stored = safeStorage.getItem(BEST_KEY);
  return {
    small: undefined,
    normal: undefined,
    large: undefined,
    ...(stored ? (JSON.parse(stored) as Partial<Record<FloodDifficulty, FloodBest>>) : {})
  };
}

function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

function createBoard(size: number) {
  return Array.from({ length: size * size }, () => randomColor());
}

function getNeighbors(index: number, size: number) {
  const row = Math.floor(index / size);
  const column = index % size;
  const neighbors: number[] = [];

  if (row > 0) neighbors.push(index - size);
  if (row < size - 1) neighbors.push(index + size);
  if (column > 0) neighbors.push(index - 1);
  if (column < size - 1) neighbors.push(index + 1);

  return neighbors;
}

function getFloodRegion(board: FloodColor[], size: number) {
  const targetColor = board[0];
  const visited = new Set<number>();
  const queue = [0];

  while (queue.length > 0) {
    const index = queue.shift();

    if (index === undefined || visited.has(index) || board[index] !== targetColor) {
      continue;
    }

    visited.add(index);
    getNeighbors(index, size).forEach((neighbor) => {
      if (!visited.has(neighbor) && board[neighbor] === targetColor) {
        queue.push(neighbor);
      }
    });
  }

  return visited;
}

function floodBoard(board: FloodColor[], size: number, nextColor: FloodColor) {
  const region = getFloodRegion(board, size);
  return board.map((color, index) => (region.has(index) ? nextColor : color));
}

function isSolved(board: FloodColor[]) {
  return board.every((color) => color === board[0]);
}

export function FloodFill({ onBack }: FloodFillProps) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const text = (ja: string, en: string) => isEnglish ? en : ja;
  const confirmRecordReset = useConfirmRecordReset();
  const [difficulty, setDifficulty] = useState<FloodDifficulty>("normal");
  const [board, setBoard] = useState<FloodColor[]>(() => createBoard(difficultySettings.normal.size));
  const [status, setStatus] = useState<FloodStatus>("idle");
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useLocalizedMessage("左上のエリアを広げて、盤面全体を同じ色に染めましょう。", "Expand the top-left area until the whole board is one color.");
  const [bestByDifficulty, setBestByDifficulty] = useState<Record<FloodDifficulty, FloodBest | undefined>>(() => readBest());

  const settings = difficultySettings[difficulty];
  const ranking = useRanking({ gameId: `flood-fill-${difficulty}`, metricLabel: "Moves", mode: "lower" });
  const currentColor = board[0];
  const floodSize = useMemo(() => getFloodRegion(board, settings.size).size, [board, settings.size]);
  const progress = Math.round((floodSize / board.length) * 100);
  const movesLeft = settings.moves - moves;
  const currentBest = bestByDifficulty[difficulty];

  const saveBest = (clearMoves: number) => {
    if (currentBest && currentBest.moves <= clearMoves) {
      return;
    }

    const nextBest = {
      moves: clearMoves,
      difficulty,
      recordedAt: new Date().toISOString()
    };
    const nextBestByDifficulty = { ...bestByDifficulty, [difficulty]: nextBest };
    setBestByDifficulty(nextBestByDifficulty);
    safeStorage.setItem(BEST_KEY, JSON.stringify(nextBestByDifficulty));
  };

  const startGame = (nextDifficulty = difficulty) => {
    const nextSettings = difficultySettings[nextDifficulty];
    setDifficulty(nextDifficulty);
    setBoard(createBoard(nextSettings.size));
    setStatus("playing");
    setMoves(0);
    setMessage("色を選ぶと、左上からつながっているエリアがその色に変わります。", "Choose a color to change the connected area in the top-left corner.");
  };

  const chooseColor = (nextColor: FloodColor) => {
    if (status !== "playing" || nextColor === currentColor) {
      return;
    }

    const nextBoard = floodBoard(board, settings.size, nextColor);
    const nextMoves = moves + 1;
    setBoard(nextBoard);
    setMoves(nextMoves);

    if (isSolved(nextBoard)) {
      setStatus("cleared");
      setMessage(`クリア！${nextMoves}手で全面を染めました。`, `Cleared the board in ${nextMoves} moves!`);
      saveBest(nextMoves);
      return;
    }

    if (nextMoves >= settings.moves) {
      setStatus("failed");
      setMessage("手数切れです。色の広がり方を見直して、もう一度挑戦しましょう。", "No moves left. Try a different color path!");
      return;
    }

    setMessage(`${colorLabels[nextColor]}に変更しました。残り${settings.moves - nextMoves}手です。`, `Changed to ${nextColor}. ${settings.moves - nextMoves} moves left.`);
  };

  const resetBest = () => {
    if (!confirmRecordReset()) return;
    safeStorage.removeItem(BEST_KEY);
    setBestByDifficulty({ small: undefined, normal: undefined, large: undefined });
  };

  return (
    <section className="puzzle-shell flood-shell" aria-labelledby="flood-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PUZZLE / INTERNAL GAME</p>
          <h1 id="flood-title">Flood Fill</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel flood-score" aria-label={text("Flood Fillの状態", "Flood Fill status")}>
          <div>
            <span>Moves</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Left</span>
            <strong>{movesLeft}</strong>
          </div>
          <div>
            <span>Area</span>
            <strong>{progress}%</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout flood-layout">
        <div className="flood-play-area">
          <div className="flood-board" style={{ "--flood-size": settings.size } as CSSProperties} aria-label={text("Flood Fill盤面", "Flood Fill board")}>
            {board.map((color, index) => (
              <button
                className={`flood-cell is-${color}${index === 0 ? " is-origin" : ""}`}
                disabled={status !== "playing" || currentColor === color}
                key={`${index}-${color}`}
                type="button"
                onClick={() => chooseColor(color)}
                aria-label={text(`${index + 1}番目のマス ${colorLabels[color]}を選ぶ`, `Cell ${index + 1}: choose ${color}`)}
              />
            ))}
          </div>

          <div className="flood-palette" aria-label={text("色選択", "Choose a color")}>
            {colors.map((color) => (
              <button
                className={`is-${color}${currentColor === color ? " is-current" : ""}`}
                disabled={status !== "playing" || currentColor === color}
                key={color}
                type="button"
                onClick={() => chooseColor(color)}
                aria-label={text(`${colorLabels[color]}を選ぶ`, `Choose ${color}`)}
              >
                <span />
                {isEnglish ? color : colorLabels[color]}
              </button>
            ))}
          </div>
        </div>

        <aside className="puzzle-side flood-side">
          <div className="rule-card">
            <h2>{text("遊び方", "How to Play")}</h2>
            <p>
              {text("左上からつながっている同色エリアが自分の陣地です。色を選ぶと陣地全体がその色に変わり、隣接する同じ色のマスを取り込めます。制限手数内に全マスを同じ色にしましょう。",
                "Your area begins in the top-left corner. Choose a color to recolor your connected area and absorb adjacent cells of that color. Fill the board before you run out of moves.")}
            </p>
          </div>

          <div className="flood-options" aria-label={text("盤面サイズ", "Board size")}>
            {(Object.keys(difficultySettings) as FloodDifficulty[]).map((level) => (
              <button
                className={difficulty === level ? "is-selected" : ""}
                disabled={status === "playing"}
                key={level}
                type="button"
                onClick={() => startGame(level)}
              >
                <span>{isEnglish ? { small: "Small", normal: "Normal", large: "Large" }[level] : difficultySettings[level].label}</span>
                <small>{isEnglish ? { small: "8×8 in 18 moves. A quick introduction.", normal: "10×10 in 22 moves. Standard challenge.", large: "12×12 in 26 moves. Plan ahead." }[level] : difficultySettings[level].description}</small>
              </button>
            ))}
          </div>

          <div className="flood-progress">
            <span>{text("現在", "Status")}: {status === "playing" ? text("プレイ中", "Playing") : status === "cleared" ? text("クリア", "Cleared") : status === "failed" ? text("失敗", "Failed") : text("待機中", "Ready")}</span>
            <span>{text("盤面", "Board")}: {settings.size}×{settings.size}</span>
            <span>{text("ベスト", "Best")}: {currentBest ? text(`${currentBest.moves}手`, `${currentBest.moves} moves`) : text("まだ記録なし", "No record yet")}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "cleared" ? { score: moves, display: text(`${moves}手`, `${moves} moves`), meta: isEnglish ? { small: "Small", normal: "Normal", large: "Large" }[difficulty] : settings.label } : null}
          />

          <div className="flood-hint">
            <PaintBucket aria-hidden="true" />
            {text("目先の大きい色だけでなく、次に隣接する色まで見ると一気に広げやすくなります。", "Look beyond the largest nearby color group to plan your next move.")}
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startGame()}>
              <Sparkles aria-hidden="true" />
              {text("新しく始める", "New game")}
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
