export type ColorChainEvaluationMode = "falling" | "rotation";

export type ColorChainEvaluation = {
  cleared: number;
  completed: boolean;
  invalidMoves: number;
  maxChain: number;
  mode?: ColorChainEvaluationMode;
  playedSeconds: number;
  recordedAt?: string;
  score: number;
  shuffles: number;
  specialActivations: number;
  successfulMoves: number;
};

export type ColorChainEvaluationSummary = {
  averageChain: number;
  averageCleared: number;
  averageShuffles: number;
  averageSpecials: number;
  averageTime: number;
  clearRate: number;
  invalidRate: number | null;
  plays: number;
};

export const FALLING_EVALUATION_KEY =
  "game-shelf-color-chain-falling-v1-evaluation";
export const ROTATION_EVALUATION_KEY =
  "game-shelf-color-chain-rotate-v1-evaluation";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isEvaluation(value: unknown): value is ColorChainEvaluation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ColorChainEvaluation>;
  return (
    typeof item.completed === "boolean"
    && isFiniteNumber(item.cleared)
    && isFiniteNumber(item.invalidMoves)
    && isFiniteNumber(item.maxChain)
    && isFiniteNumber(item.playedSeconds)
    && isFiniteNumber(item.score)
    && isFiniteNumber(item.shuffles)
    && isFiniteNumber(item.specialActivations)
    && isFiniteNumber(item.successfulMoves)
  );
}

export function readColorChainEvaluations(key: string): ColorChainEvaluation[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter(isEvaluation).slice(-20)
      : [];
  } catch {
    return [];
  }
}

export function appendColorChainEvaluation(
  key: string,
  evaluation: ColorChainEvaluation
) {
  const next = [...readColorChainEvaluations(key), evaluation].slice(-20);
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Evaluation data is optional when storage is unavailable.
  }
  return next;
}

export function summarizeColorChainEvaluations(
  evaluations: ColorChainEvaluation[]
): ColorChainEvaluationSummary | null {
  if (evaluations.length === 0) return null;
  const plays = evaluations.length;
  const moves = evaluations.reduce(
    (sum, item) => sum + item.successfulMoves + item.invalidMoves,
    0
  );
  const average = (selector: (item: ColorChainEvaluation) => number) => (
    evaluations.reduce((sum, item) => sum + selector(item), 0) / plays
  );

  return {
    averageChain: Math.round(average((item) => item.maxChain) * 10) / 10,
    averageCleared: Math.round(average((item) => item.cleared) * 10) / 10,
    averageShuffles: Math.round(average((item) => item.shuffles) * 10) / 10,
    averageSpecials: Math.round(average((item) => item.specialActivations) * 10) / 10,
    averageTime: Math.round(average((item) => item.playedSeconds)),
    clearRate: Math.round(
      (evaluations.filter((item) => item.completed).length / plays) * 100
    ),
    invalidRate: moves > 0
      ? Math.round(
          (
            evaluations.reduce((sum, item) => sum + item.invalidMoves, 0)
            / moves
          ) * 100
        )
      : null,
    plays
  };
}
