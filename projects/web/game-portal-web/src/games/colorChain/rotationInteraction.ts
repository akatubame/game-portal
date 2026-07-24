import {
  ROTATION_COLUMNS,
  ROTATION_ROWS,
  type RotationDirection,
  type RotationPoint
} from "./rotationLogic";
import type { Board } from "./tokens";

export const ROTATION_TAP_DISTANCE = 12;
export const ROTATION_TAP_DURATION = 320;
export const ROTATION_SWIPE_DISTANCE = 24;
export const ROTATION_HORIZONTAL_BIAS = 1.2;

export type RotationGestureInput = {
  deltaX: number;
  deltaY: number;
  durationMs: number;
};

export function classifyRotationGesture({
  deltaX,
  deltaY,
  durationMs
}: RotationGestureInput): RotationDirection | null {
  const distance = Math.hypot(deltaX, deltaY);
  if (durationMs <= ROTATION_TAP_DURATION && distance <= ROTATION_TAP_DISTANCE) {
    return "clockwise";
  }

  if (
    Math.abs(deltaX) >= ROTATION_SWIPE_DISTANCE
    && Math.abs(deltaX) >= Math.abs(deltaY) * ROTATION_HORIZONTAL_BIAS
  ) {
    return deltaX > 0 ? "clockwise" : "counterclockwise";
  }

  return null;
}

export function moveRotationPoint(
  point: RotationPoint,
  key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"
): RotationPoint {
  const rowDelta = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
  const columnDelta = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
  return {
    row: Math.max(0, Math.min(ROTATION_ROWS - 2, point.row + rowDelta)),
    column: Math.max(0, Math.min(ROTATION_COLUMNS - 2, point.column + columnDelta))
  };
}

export function findChangedOccupiedCells(before: Board, after: Board) {
  const cells = new Set<string>();
  for (let row = 0; row < after.length; row += 1) {
    for (let column = 0; column < after[row].length; column += 1) {
      if (after[row][column] !== null && before[row]?.[column] !== after[row][column]) {
        cells.add(`${row}:${column}`);
      }
    }
  }
  return cells;
}

export function findRefilledCells(before: Board, after: Board) {
  const cells = new Set<string>();
  for (let row = 0; row < after.length; row += 1) {
    for (let column = 0; column < after[row].length; column += 1) {
      if (before[row]?.[column] === null && after[row][column] !== null) {
        cells.add(`${row}:${column}`);
      }
    }
  }
  return cells;
}
