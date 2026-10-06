import { useConfirmRecordReset } from "../useConfirmRecordReset";
import { safeStorage } from "../../safeStorage";
import { RotateCcw, Sparkles, Trophy, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import { isPlainRecord, readSavedProgress } from "../savedProgress";
import { useLocalizedMessage } from "../useLocalizedMessage";
import type { WaterBottle, WaterColor, WaterSortHistory, WaterSortRecord, WaterSortStatus } from "./types";

type WaterSortProps = {
  onBack: () => void;
};

type WaterSortLevel = {
  id: string;
  name: string;
  bottles: WaterBottle[];
};

const RECORD_KEY = "game-shelf-water-sort-record-v2";
const PROGRESS_KEY = "game-shelf-progress-water-sort-v1";
const CAPACITY = 4;
type SavedWaterSort = { version: 1; levelId: string; bottles: WaterBottle[]; moves: number; history: WaterSortHistory[] };

const colorLabels: Record<WaterColor, string> = {
  red: "赤",
  blue: "青",
  green: "緑",
  yellow: "黄",
  purple: "紫",
  orange: "橙"
};

const colorLabelsEn: Record<WaterColor, string> = {
  red: "red",
  blue: "blue",
  green: "green",
  yellow: "yellow",
  purple: "purple",
  orange: "orange"
};

const levels: WaterSortLevel[] = [
  {
    id: "easy",
    name: "Easy",
    bottles: [
      ["blue", "green", "red", "green"],
      ["blue", "blue", "red", "green"],
      ["blue", "red", "green", "red"],
      [],
      []
    ]
  },
  {
    id: "normal",
    name: "Normal",
    bottles: [
      ["red", "green", "red", "yellow"],
      ["blue", "blue", "red", "green"],
      ["blue", "green", "yellow", "red"],
      ["yellow", "yellow", "green", "blue"],
      [],
      []
    ]
  },
  {
    id: "hard",
    name: "Hard",
    bottles: [
      ["green", "blue", "purple", "purple"],
      ["green", "red", "purple", "red"],
      ["yellow", "blue", "green", "yellow"],
      ["yellow", "yellow", "blue", "red"],
      ["green", "red", "purple", "blue"],
      [],
      []
    ]
  }
];

function isSavedWaterSort(value: unknown): value is SavedWaterSort {
  if (!isPlainRecord(value) || value.version !== 1 || typeof value.levelId !== "string" ||
      !Number.isSafeInteger(value.moves) || (value.moves as number) < 1 || (value.moves as number) > 10000 ||
      !Array.isArray(value.history) || value.history.length !== value.moves) return false;
  const level = levels.find((item) => item.id === value.levelId);
  if (!level) return false;
  const expected = level.bottles.flat().sort().join(",");
  const validBottles = (candidate: unknown): candidate is WaterBottle[] =>
    Array.isArray(candidate) && candidate.length === level.bottles.length &&
    candidate.every((bottle) => Array.isArray(bottle) && bottle.length <= CAPACITY &&
      bottle.every((color) => typeof color === "string" && color in colorLabels)) &&
    candidate.flat().sort().join(",") === expected;
  if (!validBottles(value.bottles) || isSolved(value.bottles) ||
      !value.history.every((entry, index) => isPlainRecord(entry) && entry.moves === index && validBottles(entry.bottles))) return false;
  const history = value.history as WaterSortHistory[];
  const finalBottles = value.bottles as WaterBottle[];
  if (JSON.stringify(history[0].bottles) !== JSON.stringify(level.bottles)) return false;
  return history.every((entry, index) => {
    const next = index + 1 < history.length ? history[index + 1].bottles : finalBottles;
    for (let source = 0; source < next.length; source += 1) for (let destination = 0; destination < next.length; destination += 1) {
      if (source === destination) continue;
      const poured = pour(entry.bottles, source, destination);
      if (poured && JSON.stringify(poured) === JSON.stringify(next)) return true;
    }
    return false;
  });
}

function cloneBottles(bottles: WaterBottle[]) {
  return bottles.map((bottle) => [...bottle]);
}

function readRecord(): WaterSortRecord {
  const stored = safeStorage.getItem(RECORD_KEY);
  return stored ? (JSON.parse(stored) as WaterSortRecord) : {};
}

function getTopColor(bottle: WaterBottle) {
  return bottle.length > 0 ? bottle[bottle.length - 1] : null;
}

function getPourAmount(source: WaterBottle, destination: WaterBottle) {
  const sourceColor = getTopColor(source);

  if (!sourceColor || destination.length >= CAPACITY) {
    return 0;
  }

  const destinationColor = getTopColor(destination);

  if (destinationColor && destinationColor !== sourceColor) {
    return 0;
  }

  let sameColorCount = 0;

  for (let index = source.length - 1; index >= 0; index -= 1) {
    if (source[index] !== sourceColor) {
      break;
    }

    sameColorCount += 1;
  }

  return Math.min(sameColorCount, CAPACITY - destination.length);
}

function pour(bottles: WaterBottle[], sourceIndex: number, destinationIndex: number) {
  const nextBottles = cloneBottles(bottles);
  const source = nextBottles[sourceIndex];
  const destination = nextBottles[destinationIndex];
  const amount = getPourAmount(source, destination);

  if (amount <= 0) {
    return null;
  }

  for (let index = 0; index < amount; index += 1) {
    const color = source.pop();

    if (color) {
      destination.push(color);
    }
  }

  return nextBottles;
}

function isSolved(bottles: WaterBottle[]) {
  return bottles.every((bottle) => bottle.length === 0 || (bottle.length === CAPACITY && bottle.every((color) => color === bottle[0])));
}

export function WaterSort({ onBack }: WaterSortProps) {
  const confirmRecordReset = useConfirmRecordReset();
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [saved] = useState(() => readSavedProgress(PROGRESS_KEY, isSavedWaterSort));
  const [levelIndex, setLevelIndex] = useState(() => Math.max(0, levels.findIndex((item) => item.id === saved?.levelId)));
  const [bottles, setBottles] = useState<WaterBottle[]>(() => cloneBottles(saved?.bottles ?? levels[0].bottles));
  const [selectedBottle, setSelectedBottle] = useState<number | null>(null);
  const [moves, setMoves] = useState(saved?.moves ?? 0);
  const [history, setHistory] = useState<WaterSortHistory[]>(() => saved?.history.map((entry) => ({ bottles: cloneBottles(entry.bottles), moves: entry.moves })) ?? []);
  const [status, setStatus] = useState<WaterSortStatus>("playing");
  const [record, setRecord] = useState<WaterSortRecord>(() => readRecord());
  const [message, setMessage] = useLocalizedMessage("同じ色の水だけを重ねられます。ボトルを選んで、注ぎ先を選びましょう。", "Only matching colors can be stacked. Choose a bottle, then choose where to pour.");

  const level = levels[levelIndex];
  const ranking = useRanking({ gameId: `water-sort-${level.id}`, metricLabel: "Moves", mode: "lower" });
  const bestMoves = record[level.id] ?? null;
  const filledBottleCount = useMemo(() => bottles.filter((bottle) => bottle.length === CAPACITY && bottle.every((color) => color === bottle[0])).length, [bottles]);

  useEffect(() => {
    if (status === "playing" && moves > 0) {
      safeStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, levelId: level.id, bottles, moves, history } satisfies SavedWaterSort));
    } else if (status === "cleared") {
      safeStorage.removeItem(PROGRESS_KEY);
    }
  }, [bottles, history, level.id, moves, status]);

  const startLevel = (nextLevelIndex = levelIndex) => {
    safeStorage.removeItem(PROGRESS_KEY);
    const nextLevel = levels[nextLevelIndex];

    setLevelIndex(nextLevelIndex);
    setBottles(cloneBottles(nextLevel.bottles));
    setSelectedBottle(null);
    setMoves(0);
    setHistory([]);
    setStatus("playing");
    setMessage(`${nextLevel.name}を開始しました。上にある同色の水はまとめて注がれます。`, `Started ${nextLevel.name}. Consecutive layers of the same color pour together.`);
  };

  const selectLevel = (nextLevelIndex: number) => {
    startLevel(nextLevelIndex);
  };

  const completeIfSolved = (nextBottles: WaterBottle[], nextMoves: number) => {
    if (!isSolved(nextBottles)) {
      return false;
    }

    const nextRecord = {
      ...record,
      [level.id]: bestMoves === null ? nextMoves : Math.min(bestMoves, nextMoves)
    };

    setRecord(nextRecord);
    safeStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus("cleared");
    setMessage(`クリア！ ${nextMoves}手で全ボトルを整理できました。`, `Clear! You sorted every bottle in ${nextMoves} moves.`);

    return true;
  };

  const handleBottleClick = (bottleIndex: number) => {
    if (status !== "playing") {
      return;
    }

    const bottle = bottles[bottleIndex];

    if (selectedBottle === null) {
      if (bottle.length === 0) {
        setMessage("空のボトルからは注げません。水が入っているボトルを選びましょう。", "You cannot pour from an empty bottle. Choose one with water.");
        return;
      }

      setSelectedBottle(bottleIndex);
      setMessage(`${bottleIndex + 1}番のボトルを選択中。注ぎ先を選んでください。`, `Bottle ${bottleIndex + 1} selected. Choose a destination.`);
      return;
    }

    if (selectedBottle === bottleIndex) {
      setSelectedBottle(null);
      setMessage("選択を解除しました。", "Selection cleared.");
      return;
    }

    const nextBottles = pour(bottles, selectedBottle, bottleIndex);

    if (!nextBottles) {
      if (bottle.length > 0) {
        setSelectedBottle(bottleIndex);
        setMessage("そのボトルには注げません。選択を切り替えました。", "You cannot pour there. Switched selection.");
      } else {
        setMessage("そのボトルには注げません。色か空き容量を確認してください。", "You cannot pour there. Check the color or available space.");
      }
      return;
    }

    const nextMoves = moves + 1;

    setHistory([...history, { bottles: cloneBottles(bottles), moves }]);
    setBottles(nextBottles);
    setMoves(nextMoves);
    setSelectedBottle(null);

    if (!completeIfSolved(nextBottles, nextMoves)) {
      setMessage("いい注ぎ方です。単色のボトルを増やしていきましょう。", "Nice pour! Keep sorting the colors.");
    }
  };

  const undo = () => {
    const previous = history.length > 0 ? history[history.length - 1] : undefined;

    if (!previous || status !== "playing") {
      return;
    }

    if (previous.moves === 0) safeStorage.removeItem(PROGRESS_KEY);

    setBottles(cloneBottles(previous.bottles));
    setMoves(previous.moves);
    setHistory(history.slice(0, -1));
    setSelectedBottle(null);
    setMessage("1手戻しました。", "Undid one move.");
  };

  const resetRecord = () => {
    if (!confirmRecordReset()) return;
    setRecord({});
    safeStorage.setItem(RECORD_KEY, JSON.stringify({}));
  };

  return (
    <section className="puzzle-shell watersort-shell" aria-labelledby="watersort-title" data-native-i18n>
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SORT PUZZLE / INTERNAL GAME</p>
          <h1 id="watersort-title">Water Sort Puzzle</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel watersort-score" aria-label={isEnglish ? "Water Sort Puzzle score" : "Water Sort Puzzleのスコア"}>
          <div>
            <span>Level</span>
            <strong>{level.name}</strong>
          </div>
          <div>
            <span>{isEnglish ? "Moves" : "Move"}</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Best</span>
            <strong>{bestMoves ?? "--"}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout watersort-layout">
        <div className="watersort-play-area">
          <div className="watersort-bottles" aria-label={isEnglish ? "colored water bottles" : "色水ボトル"}>
            {bottles.map((bottle, bottleIndex) => (
              <button
                className={`watersort-bottle${selectedBottle === bottleIndex ? " is-selected" : ""}${bottle.length === 0 ? " is-empty" : ""}`}
                key={bottleIndex}
                type="button"
                onClick={() => handleBottleClick(bottleIndex)}
                aria-label={isEnglish ? `Bottle ${bottleIndex + 1}: ${bottle.map((color) => colorLabelsEn[color]).join(", ") || "empty"}` : `${bottleIndex + 1}番のボトル ${bottle.map((color) => colorLabels[color]).join("、") || "空"}`}
              >
                <span className="watersort-neck" />
                <span className="watersort-glass">
                  <span className="watersort-liquid">
                    {bottle.map((color, layerIndex) => (
                      <span className={`watersort-layer is-${color}`} key={`${color}-${layerIndex}`} />
                    ))}
                  </span>
                </span>
                <span className="watersort-index">{bottleIndex + 1}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="puzzle-side watersort-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to play" : "遊び方"}</h2>
            <p>
              {isEnglish
                ? "Choose a bottle that contains water, then choose a destination bottle. You can pour only into an empty bottle or onto a bottle whose top color matches. Clear the puzzle by making every bottle either empty or filled with a single color."
                : "水が入ったボトルを選び、注ぎ先のボトルを選びます。空のボトル、または一番上が同じ色のボトルにだけ注げます。すべてのボトルを単色、または空にできればクリアです。"}
            </p>
          </div>

          <div className="watersort-levels" aria-label={isEnglish ? "stage select" : "ステージ選択"}>
            {levels.map((item, index) => (
              <button className={index === levelIndex ? "is-active" : ""} key={item.id} type="button" onClick={() => selectLevel(index)}>
                {item.name}
              </button>
            ))}
          </div>

          <div className="watersort-status">
            <div>
              <Trophy aria-hidden="true" />
              <span>{isEnglish ? "Completed bottles" : "完成ボトル"}</span>
              <strong>{filledBottleCount}</strong>
            </div>
            <div>
              <span>{isEnglish ? "Status" : "状態"}</span>
              <strong>{status === "cleared" ? (isEnglish ? "Cleared" : "クリア") : (isEnglish ? "Playing" : "挑戦中")}</strong>
            </div>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "cleared" ? { score: moves, display: isEnglish ? `${moves} moves` : `${moves}手`, meta: level.name } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startLevel()}>
              <Sparkles aria-hidden="true" />
              {isEnglish ? "Restart" : "やり直し"}
            </button>
            <button className="ghost-button" type="button" onClick={undo} disabled={history.length === 0 || status !== "playing"}>
              <Undo2 aria-hidden="true" />
              {isEnglish ? "Undo" : "1手戻す"}
            </button>
            <button className="ghost-button" type="button" onClick={resetRecord}>
              <RotateCcw aria-hidden="true" />
              {isEnglish ? "Reset record" : "記録リセット"}
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            {isEnglish ? "Back to shelf" : "棚へ戻る"}
          </button>
        </aside>
      </div>
    </section>
  );
}
