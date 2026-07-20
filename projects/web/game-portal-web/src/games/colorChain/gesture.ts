export type GestureAxis = "none" | "horizontal" | "vertical";

export const GESTURE_CONFIG = {
  axisLockDistance: 12,
  axisBias: 1.14,
  tapMaxDistance: 12,
  tapMaxDuration: 320,
  horizontalStepRatio: 0.72,
  softDropStepRatio: 0.72,
  flickMinDistanceRatio: 1.8,
  flickMaxDuration: 260,
  flickMinVelocity: 0.68,
  slowGestureDelay: 140
} as const;

export function detectGestureAxis(
  deltaX: number,
  deltaY: number,
  currentAxis: GestureAxis = "none"
): GestureAxis {
  if (currentAxis !== "none") return currentAxis;
  if (Math.hypot(deltaX, deltaY) < GESTURE_CONFIG.axisLockDistance) return "none";

  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);
  if (horizontalDistance > verticalDistance * GESTURE_CONFIG.axisBias) return "horizontal";
  if (deltaY > 0 && verticalDistance > horizontalDistance * GESTURE_CONFIG.axisBias) return "vertical";
  return "none";
}

export function gestureStepCount(distance: number, stepDistance: number) {
  if (!Number.isFinite(distance) || !Number.isFinite(stepDistance) || stepDistance <= 0) return 0;
  return Math.trunc(distance / stepDistance);
}

export function isTapGesture(deltaX: number, deltaY: number, duration: number) {
  return duration >= 0
    && duration <= GESTURE_CONFIG.tapMaxDuration
    && Math.hypot(deltaX, deltaY) <= GESTURE_CONFIG.tapMaxDistance;
}

export function isHardDropGesture(
  deltaX: number,
  deltaY: number,
  duration: number,
  cellHeight: number
) {
  if (duration <= 0 || duration > GESTURE_CONFIG.flickMaxDuration || cellHeight <= 0) return false;
  const velocity = deltaY / duration;
  return deltaY >= cellHeight * GESTURE_CONFIG.flickMinDistanceRatio
    && deltaY > Math.abs(deltaX) * GESTURE_CONFIG.axisBias
    && velocity >= GESTURE_CONFIG.flickMinVelocity;
}

export function shouldDeferSoftDrop(deltaY: number, duration: number) {
  if (duration <= 0 || duration >= GESTURE_CONFIG.slowGestureDelay) return false;
  return deltaY / duration >= GESTURE_CONFIG.flickMinVelocity;
}
