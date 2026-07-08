import { Dice5, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { RankingPanel, useRanking } from "../ranking";
import type { YachtBest, YachtCategoryId, YachtScoreSheet, YachtStatus } from "./types";

type YachtDiceProps = {
  onBack: () => void;
};

type YachtCategory = {
  id: YachtCategoryId;
  label: string;
  description: string;
  score: (dice: number[]) => number;
};

const BEST_KEY = "game-shelf-yacht-dice-best";
const DICE_COUNT = 5;
const MAX_ROLLS = 3;

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function createDice() {
  return Array.from({ length: DICE_COUNT }, () => 1);
}

function countByFace(dice: number[]) {
  return dice.reduce<Record<number, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function sumDice(dice: number[]) {
  return dice.reduce((total, value) => total + value, 0);
}

function hasStraight(dice: number[], required: number) {
  const unique = [...new Set(dice)].sort((a, b) => a - b);
  const patterns = required === 5 ? [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]] : [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
  return patterns.some((pattern) => pattern.every((value) => unique.includes(value)));
}

const categories: YachtCategory[] = [
  {
    id: "ones",
    label: "エース",
    description: "1の目の合計。",
    score: (dice) => dice.filter((value) => value === 1).length
  },
  {
    id: "twos",
    label: "デュース",
    description: "2の目の合計。",
    score: (dice) => dice.filter((value) => value === 2).length * 2
  },
  {
    id: "threes",
    label: "トレイ",
    description: "3の目の合計。",
    score: (dice) => dice.filter((value) => value === 3).length * 3
  },
  {
    id: "fours",
    label: "フォー",
    description: "4の目の合計。",
    score: (dice) => dice.filter((value) => value === 4).length * 4
  },
  {
    id: "fives",
    label: "ファイブ",
    description: "5の目の合計。",
    score: (dice) => dice.filter((value) => value === 5).length * 5
  },
  {
    id: "sixes",
    label: "シックス",
    description: "6の目の合計。",
    score: (dice) => dice.filter((value) => value === 6).length * 6
  },
  {
    id: "threeKind",
    label: "スリーカード",
    description: "同じ目が3個以上なら全サイコロ合計。",
    score: (dice) => (Object.values(countByFace(dice)).some((count) => count >= 3) ? sumDice(dice) : 0)
  },
  {
    id: "fourKind",
    label: "フォーカード",
    description: "同じ目が4個以上なら全サイコロ合計。",
    score: (dice) => (Object.values(countByFace(dice)).some((count) => count >= 4) ? sumDice(dice) : 0)
  },
  {
    id: "fullHouse",
    label: "フルハウス",
    description: "3個組と2個組で25点。",
    score: (dice) => {
      const counts = Object.values(countByFace(dice)).sort((a, b) => a - b);
      return counts.length === 2 && counts[0] === 2 && counts[1] === 3 ? 25 : 0;
    }
  },
  {
    id: "smallStraight",
    label: "Sストレート",
    description: "4連番で30点。",
    score: (dice) => (hasStraight(dice, 4) ? 30 : 0)
  },
  {
    id: "largeStraight",
    label: "Lストレート",
    description: "5連番で40点。",
    score: (dice) => (hasStraight(dice, 5) ? 40 : 0)
  },
  {
    id: "yacht",
    label: "ヨット",
    description: "5個すべて同じ目で50点。",
    score: (dice) => (Object.values(countByFace(dice)).some((count) => count === 5) ? 50 : 0)
  },
  {
    id: "chance",
    label: "チャンス",
    description: "全サイコロの合計。",
    score: sumDice
  }
];

const categoryEnglishText: Record<YachtCategoryId, { label: string; description: string }> = {
  ones: { label: "Aces", description: "Total of ones." },
  twos: { label: "Twos", description: "Total of twos." },
  threes: { label: "Threes", description: "Total of threes." },
  fours: { label: "Fours", description: "Total of fours." },
  fives: { label: "Fives", description: "Total of fives." },
  sixes: { label: "Sixes", description: "Total of sixes." },
  threeKind: { label: "Three of a Kind", description: "If at least three dice show the same face, score the total of all dice." },
  fourKind: { label: "Four of a Kind", description: "If at least four dice show the same face, score the total of all dice." },
  fullHouse: { label: "Full House", description: "Three of one face and two of another scores 25 points." },
  smallStraight: { label: "Small Straight", description: "Four in sequence scores 30 points." },
  largeStraight: { label: "Large Straight", description: "Five in sequence scores 40 points." },
  yacht: { label: "Yacht", description: "Five dice showing the same face scores 50 points." },
  chance: { label: "Chance", description: "Total of all dice." }
};

function translateYachtMessage(message: string) {
  const scoredMatch = message.match(/^(.+)に(\d+)点を記録しました。次のラウンドです。$/);
  if (scoredMatch) {
    return `Scored ${scoredMatch[2]} points in ${scoredMatch[1]}. Next round.`;
  }
  const finishedMatch = message.match(/^ゲーム終了！合計(\d+)点でした。$/);
  if (finishedMatch) {
    return `Game over! Total score: ${finishedMatch[1]} points.`;
  }
  const exact: Record<string, string> = {
    "サイコロを最大3回振り、狙う役にスコアを記録していきましょう。": "Roll the dice up to three times and record scores in the categories you aim for.",
    "まずはロール。残したいサイコロはクリックでホールドできます。": "Roll first. Click dice you want to hold.",
    "残したい目をホールドして、もう一度振るか役を選びましょう。": "Hold the dice you want to keep, then roll again or choose a category.",
    "ロール終了です。スコアを入れる役を選んでください。": "No rolls left. Choose a category to score."
  };
  return exact[message] ?? message;
}

function readBest(): YachtBest | null {
  const stored = window.localStorage.getItem(BEST_KEY);
  return stored ? (JSON.parse(stored) as YachtBest) : null;
}

function getTotal(scores: YachtScoreSheet) {
  return Object.values(scores).reduce((total, score) => total + (score ?? 0), 0);
}

function formatDie(value: number) {
  return ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][value] ?? String(value);
}

export function YachtDice({ onBack }: YachtDiceProps) {
  const { language } = useI18n();
  const isEnglish = language === "en";
  const [status, setStatus] = useState<YachtStatus>("idle");
  const [dice, setDice] = useState<number[]>(() => createDice());
  const [held, setHeld] = useState<boolean[]>(() => Array.from({ length: DICE_COUNT }, () => false));
  const [rollsLeft, setRollsLeft] = useState(MAX_ROLLS);
  const [scores, setScores] = useState<YachtScoreSheet>({});
  const [best, setBest] = useState<YachtBest | null>(() => readBest());
  const [message, setMessage] = useState("サイコロを最大3回振り、狙う役にスコアを記録していきましょう。");

  const total = useMemo(() => getTotal(scores), [scores]);
  const ranking = useRanking({ gameId: "yacht-dice-score", metricLabel: "Score", mode: "higher" });
  const round = Object.keys(scores).length + 1;
  const hasRolled = status === "playing" && rollsLeft < MAX_ROLLS;
  const isComplete = Object.keys(scores).length >= categories.length;
  const visibleMessage = isEnglish ? translateYachtMessage(message) : message;

  const startGame = () => {
    setStatus("playing");
    setDice(createDice());
    setHeld(Array.from({ length: DICE_COUNT }, () => false));
    setRollsLeft(MAX_ROLLS);
    setScores({});
    setMessage("まずはロール。残したいサイコロはクリックでホールドできます。");
  };

  const rollDice = () => {
    if (status !== "playing" || rollsLeft <= 0) {
      return;
    }

    const nextDice = dice.map((value, index) => (held[index] ? value : rollDie()));
    const nextRollsLeft = rollsLeft - 1;
    setDice(nextDice);
    setRollsLeft(nextRollsLeft);
    setMessage(nextRollsLeft > 0 ? "残したい目をホールドして、もう一度振るか役を選びましょう。" : "ロール終了です。スコアを入れる役を選んでください。");
  };

  const toggleHold = (index: number) => {
    if (!hasRolled || rollsLeft <= 0) {
      return;
    }

    setHeld((current) => current.map((value, currentIndex) => (currentIndex === index ? !value : value)));
  };

  const chooseCategory = (category: YachtCategory) => {
    if (!hasRolled || scores[category.id] !== undefined || status !== "playing") {
      return;
    }

    const score = category.score(dice);
    const nextScores = { ...scores, [category.id]: score };
    const nextTotal = getTotal(nextScores);
    setScores(nextScores);

    if (Object.keys(nextScores).length >= categories.length) {
      const nextBest = !best || nextTotal > best.score ? { score: nextTotal, recordedAt: new Date().toISOString() } : best;
      if (nextBest !== best) {
        setBest(nextBest);
        window.localStorage.setItem(BEST_KEY, JSON.stringify(nextBest));
      }

      setStatus("finished");
      setMessage(`ゲーム終了！合計${nextTotal}点でした。`);
      return;
    }

    setDice(createDice());
    setHeld(Array.from({ length: DICE_COUNT }, () => false));
    setRollsLeft(MAX_ROLLS);
    setMessage(`${category.label}に${score}点を記録しました。次のラウンドです。`);
  };

  const resetBest = () => {
    window.localStorage.removeItem(BEST_KEY);
    setBest(null);
  };

  return (
    <section className="puzzle-shell yacht-shell" aria-labelledby="yacht-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">DICE / INTERNAL GAME</p>
          <h1 id="yacht-title">{isEnglish ? "Yacht Dice" : "ヨットダイス"}</h1>
          <p className="lead">{visibleMessage}</p>
        </div>
        <div className="score-panel yacht-score" aria-label={isEnglish ? "Yacht Dice status" : "ヨットダイスの状態"}>
          <div>
            <span>Total</span>
            <strong>{total}</strong>
          </div>
          <div>
            <span>Round</span>
            <strong>{isComplete ? categories.length : round}</strong>
          </div>
          <div>
            <span>Rolls</span>
            <strong>{rollsLeft}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout yacht-layout">
        <div className="yacht-play-area">
          <div className="yacht-dice-row" aria-label={isEnglish ? "Dice" : "サイコロ"}>
            {dice.map((value, index) => (
              <button
                className={held[index] ? "is-held" : ""}
                disabled={!hasRolled || rollsLeft <= 0}
                key={index}
                type="button"
                onClick={() => toggleHold(index)}
                aria-label={isEnglish ? `die ${index + 1}: ${value}${held[index] ? " held" : ""}` : `${index + 1}番目のサイコロ ${value}${held[index] ? " ホールド中" : ""}`}
              >
                <span>{formatDie(value)}</span>
                <small>{held[index] ? "HOLD" : "FREE"}</small>
              </button>
            ))}
          </div>

          <div className="yacht-controls">
            <button className="primary-button" type="button" onClick={rollDice} disabled={status !== "playing" || rollsLeft <= 0}>
              <Dice5 aria-hidden="true" />
              {isEnglish ? "Roll" : "ロール"}
            </button>
            <button className="ghost-button" type="button" onClick={startGame}>
              <Sparkles aria-hidden="true" />
              新しく始める
            </button>
          </div>

          <div className="yacht-sheet" aria-label={isEnglish ? "Score sheet" : "スコアシート"}>
            {categories.map((category) => {
              const usedScore = scores[category.id];
              const preview = category.score(dice);

              return (
                <button
                  className={usedScore !== undefined ? "is-used" : ""}
                  disabled={!hasRolled || usedScore !== undefined || status !== "playing"}
                  key={category.id}
                  type="button"
                  onClick={() => chooseCategory(category)}
                >
                  <span>
                    <strong>{isEnglish ? categoryEnglishText[category.id].label : category.label}</strong>
                    <small>{isEnglish ? categoryEnglishText[category.id].description : category.description}</small>
                  </span>
                  <b>{usedScore !== undefined ? usedScore : preview}</b>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="puzzle-side yacht-side">
          <div className="rule-card">
            <h2>{isEnglish ? "How to play" : "遊び方"}</h2>
            <p>
              {isEnglish
                ? "In each round, roll the dice up to three times. Hold dice you want to keep, then record the score in one category. Your final record is the total after all categories are filled."
                : "各ラウンドで最大3回サイコロを振れます。残したいサイコロをホールドし、最後に1つの役へスコアを記録します。すべての役を埋めた合計点が記録です。"}
            </p>
          </div>

          <div className="yacht-progress">
            <span>{isEnglish ? "Current" : "現在"}: {isEnglish ? (status === "playing" ? "Playing" : status === "finished" ? "Finished" : "Idle") : (status === "playing" ? "プレイ中" : status === "finished" ? "終了" : "待機中")}</span>
            <span>{isEnglish ? "Scored" : "記録済み"}: {Object.keys(scores).length}/{categories.length}</span>
            <span>{isEnglish ? "Best" : "ベスト"}: {best ? (isEnglish ? `${best.score} pts` : `${best.score}点`) : (isEnglish ? "No record yet" : "まだ記録なし")}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "finished" ? { score: total, display: isEnglish ? `${total} pts` : `${total}点`, meta: isEnglish ? `Scored ${Object.keys(scores).length}/${categories.length}` : `記録済み ${Object.keys(scores).length}/${categories.length}` } : null}
          />

          <div className="yacht-hint">
            <Dice5 aria-hidden="true" />
            {isEnglish ? "Chasing only high-scoring hands can leave you empty-handed. Sometimes it is smarter to safely score Chance or upper-section categories." : "高得点役を狙いすぎると空振りもあります。チャンスや上段役で堅く拾う判断も大事です。"}
          </div>

          <div className="control-row">
            <button className="ghost-button" type="button" onClick={resetBest}>
              <RotateCcw aria-hidden="true" />
              {isEnglish ? "Clear best" : "ベスト削除"}
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
