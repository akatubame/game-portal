import type { Difficulty, GamePhase, GameState, Tile } from "./engine/types";

const difficulties: Difficulty[] = ["beginner", "easy", "normal"];
const phases: GamePhase[] = ["title", "playing", "waiting", "roundResult", "gameResult"];

const isTile = (value: unknown): value is Tile => {
  if (!value || typeof value !== "object") return false;
  const tile = value as Partial<Tile>;
  if (tile.kind === "number") {
    return ["man", "pin", "sou"].includes(tile.suit ?? "") &&
      Number.isInteger(tile.value) && Number(tile.value) >= 1 && Number(tile.value) <= 9;
  }
  if (tile.kind === "wind") return ["east", "south", "west", "north"].includes(tile.wind ?? "");
  if (tile.kind === "dragon") return ["haku", "hatsu", "chun"].includes(tile.dragon ?? "");
  return false;
};

const isTileArray = (value: unknown): value is Tile[] =>
  Array.isArray(value) && value.every(isTile);

export const isSavedGameState = (value: unknown): value is GameState => {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<GameState>;
  if (game.version !== 1 || !phases.includes(game.phase as GamePhase)) return false;
  if (!difficulties.includes(game.difficulty as Difficulty)) return false;
  if (!Array.isArray(game.players) || game.players.length !== 4) return false;
  if (!game.players.every((player) =>
    player &&
    typeof player.id === "number" &&
    typeof player.points === "number" &&
    typeof player.isHuman === "boolean" &&
    isTileArray(player.hand) &&
    isTileArray(player.discards) &&
    isTileArray(player.ankan)
  )) return false;
  if (!game.wall || !isTileArray(game.wall.liveTiles) || !isTileArray(game.wall.deadWall) ||
    !isTileArray(game.wall.doraIndicators) || !isTileArray(game.wall.uraDoraIndicators)) return false;
  return Number.isInteger(game.currentPlayerIdx) &&
    Number.isInteger(game.roundNumber) &&
    Number.isInteger(game.dealerIdx) &&
    Number.isInteger(game.turnCount) &&
    Array.isArray(game.gameLog);
};

export const isResumableGame = (game: GameState): boolean =>
  game.players[0].hand.length > 0 &&
  game.phase !== "gameResult" &&
  game.roundNumber < 4 &&
  game.players.every((player) => player.points >= 0);
