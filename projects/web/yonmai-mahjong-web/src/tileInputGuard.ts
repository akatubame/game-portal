export const TILE_INPUT_GUARD_MS = 450;

export const canAcceptTileInput = (
  lastAcceptedAt: number | null,
  currentAt: number,
  guardMs = TILE_INPUT_GUARD_MS
): boolean => lastAcceptedAt === null || currentAt - lastAcceptedAt >= guardMs;
