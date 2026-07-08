import type { GameState } from "./engine/types";
import { tileId } from "./engine/tiles";

export const autoDiscardTriggerKey = (game: GameState): string | null => {
  if (game.pendingAction?.type !== "autoDiscard" || !game.drawnTile) {
    return null;
  }
  return `${game.roundNumber}:${game.turnCount}:${tileId(game.drawnTile)}`;
};
