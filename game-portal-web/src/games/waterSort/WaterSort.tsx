import { RotateCcw, Sparkles, Trophy, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
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
const CAPACITY = 4;

const colorLabels: Record<WaterColor, string> = {
  red: "赤",
  blue: "青",
  green: "緑",
  yellow: "黄",
  purple: "紫",
  orange: "橙"
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

function cloneBottles(bottles: WaterBottle[]) {
  return bottles.map((bottle) => [...bottle]);
}

function readRecord(): WaterSortRecord {
  const stored = window.localStorage.getItem(RECORD_KEY);
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
  const [levelIndex, setLevelIndex] = useState(0);
  const [bottles, setBottles] = useState<WaterBottle[]>(() => cloneBottles(levels[0].bottles));
  const [selectedBottle, setSelectedBottle] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<WaterSortHistory[]>([]);
  const [status, setStatus] = useState<WaterSortStatus>("playing");
  const [record, setRecord] = useState<WaterSortRecord>(() => readRecord());
  const [message, setMessage] = useState("同じ色の水だけを重ねられます。ボトルを選んで、注ぎ先を選びましょう。");

  const level = levels[levelIndex];
  const bestMoves = record[level.id] ?? null;
  const filledBottleCount = useMemo(() => bottles.filter((bottle) => bottle.length === CAPACITY && bottle.every((color) => color === bottle[0])).length, [bottles]);

  const startLevel = (nextLevelIndex = levelIndex) => {
    const nextLevel = levels[nextLevelIndex];

    setLevelIndex(nextLevelIndex);
    setBottles(cloneBottles(nextLevel.bottles));
    setSelectedBottle(null);
    setMoves(0);
    setHistory([]);
    setStatus("playing");
    setMessage(`${nextLevel.name}を開始しました。上にある同色の水はまとめて注がれます。`);
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
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus("cleared");
    setMessage(`クリア！ ${nextMoves}手で全ボトルを整理できました。`);

    return true;
  };

  const handleBottleClick = (bottleIndex: number) => {
    if (status !== "playing") {
      return;
    }

    const bottle = bottles[bottleIndex];

    if (selectedBottle === null) {
      if (bottle.length === 0) {
        setMessage("空のボトルからは注げません。水が入っているボトルを選びましょう。");
        return;
      }

      setSelectedBottle(bottleIndex);
      setMessage(`${bottleIndex + 1}番のボトルを選択中。注ぎ先を選んでください。`);
      return;
    }

    if (selectedBottle === bottleIndex) {
      setSelectedBottle(null);
      setMessage("選択を解除しました。");
      return;
    }

    const nextBottles = pour(bottles, selectedBottle, bottleIndex);

    if (!nextBottles) {
      if (bottle.length > 0) {
        setSelectedBottle(bottleIndex);
        setMessage("そのボトルには注げません。選択を切り替えました。");
      } else {
        setMessage("そのボトルには注げません。色か空き容量を確認してください。");
      }
      return;
    }

    const nextMoves = moves + 1;

    setHistory([...history, { bottles: cloneBottles(bottles), moves }]);
    setBottles(nextBottles);
    setMoves(nextMoves);
    setSelectedBottle(null);

    if (!completeIfSolved(nextBottles, nextMoves)) {
      setMessage("いい注ぎ方です。単色のボトルを増やしていきましょう。");
    }
  };

  const undo = () => {
    const previous = history.length > 0 ? history[history.length - 1] : undefined;

    if (!previous || status !== "playing") {
      return;
    }

    setBottles(cloneBottles(previous.bottles));
    setMoves(previous.moves);
    setHistory(history.slice(0, -1));
    setSelectedBottle(null);
    setMessage("1手戻しました。");
  };

  const resetRecord = () => {
    setRecord({});
    window.localStorage.setItem(RECORD_KEY, JSON.stringify({}));
  };

  return (
    <section className="puzzle-shell watersort-shell" aria-labelledby="watersort-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">SORT PUZZLE / INTERNAL GAME</p>
          <h1 id="watersort-title">Water Sort Puzzle</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel watersort-score" aria-label="Water Sort Puzzleのスコア">
          <div>
            <span>Level</span>
            <strong>{level.name}</strong>
          </div>
          <div>
            <span>Move</span>
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
          <div className="watersort-bottles" aria-label="色水ボトル">
            {bottles.map((bottle, bottleIndex) => (
              <button
                className={`watersort-bottle${selectedBottle === bottleIndex ? " is-selected" : ""}${bottle.length === 0 ? " is-empty" : ""}`}
                key={bottleIndex}
                type="button"
                onClick={() => handleBottleClick(bottleIndex)}
                aria-label={`${bottleIndex + 1}番のボトル ${bottle.map((color) => colorLabels[color]).join("、") || "空"}`}
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
            <h2>遊び方</h2>
            <p>
              水が入ったボトルを選び、注ぎ先のボトルを選びます。空のボトル、または一番上が同じ色のボトルにだけ注げます。
              すべてのボトルを単色、または空にできればクリアです。
            </p>
          </div>

          <div className="watersort-levels" aria-label="ステージ選択">
            {levels.map((item, index) => (
              <button className={index === levelIndex ? "is-active" : ""} key={item.id} type="button" onClick={() => selectLevel(index)}>
                {item.name}
              </button>
            ))}
          </div>

          <div className="watersort-status">
            <div>
              <Trophy aria-hidden="true" />
              <span>完成ボトル</span>
              <strong>{filledBottleCount}</strong>
            </div>
            <div>
              <span>状態</span>
              <strong>{status === "cleared" ? "クリア" : "挑戦中"}</strong>
            </div>
          </div>

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startLevel()}>
              <Sparkles aria-hidden="true" />
              やり直し
            </button>
            <button className="ghost-button" type="button" onClick={undo} disabled={history.length === 0 || status !== "playing"}>
              <Undo2 aria-hidden="true" />
              1手戻す
            </button>
            <button className="ghost-button" type="button" onClick={resetRecord}>
              <RotateCcw aria-hidden="true" />
              記録リセット
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
