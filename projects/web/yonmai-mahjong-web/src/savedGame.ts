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

export const isTileArray = (value: unknown): value is Tile[] =>
  Array.isArray(value) && value.every(isTile);

export const isSavedGameState = (value: unknown): value is GameState => {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<GameState>;
  if (game.version !== 1 || !phases.includes(game.phase as GamePhase)) return false;
  if (!difficulties.includes(game.difficulty as Difficulty)) return false;
  if (!Array.isArray(game.players) || game.players.length !== 4) return false;
  if (!game.players.every((player) =>
    player &&
    game.players!.indexOf(player) === player.id &&
    Number.isFinite(player.points) &&
    typeof player.name === "string" &&
    ["east", "south", "west", "north"].includes(player.seatWind) &&
    [player.isRiichi, player.isDoubleRiichi, player.isIppatsu, player.temporaryFuriten, player.riichiFuriten].every((flag) => typeof flag === "boolean") &&
    Number.isInteger(player.riichiDiscardIndex) &&
    typeof player.isHuman === "boolean" &&
    player.isHuman === (player.id === 0) &&
    isTileArray(player.hand) &&
    isTileArray(player.discards) &&
    isTileArray(player.ankan)
  )) return false;
  if (!game.wall || !isTileArray(game.wall.liveTiles) || !isTileArray(game.wall.deadWall) ||
    !isTileArray(game.wall.doraIndicators) || !isTileArray(game.wall.uraDoraIndicators)) return false;
  if (game.gameId !== undefined && (typeof game.gameId !== "string" || !game.gameId)) return false;
  if (game.roundSequence !== undefined && (!Number.isInteger(game.roundSequence) || game.roundSequence < 0)) return false;
  if (game.completed !== undefined && typeof game.completed !== "boolean") return false;
  if (game.gameLogEvents !== undefined && (!Array.isArray(game.gameLogEvents) || !game.gameLogEvents.every((event) => {
    if (!event || typeof event !== 'object') return false;
    if (event.type === 'draw') return true;
    if (event.type === 'round') return Number.isInteger(event.round) && event.round >= 0 && event.round < 4 && Number.isInteger(event.honba) && event.honba >= 0;
    return ['riichi', 'ankan', 'tsumo', 'ron'].includes(event.type) && 'playerId' in event && Number.isInteger(event.playerId) && event.playerId >= 0 && event.playerId < 4;
  }))) return false;
  if (game.drawnTile !== null && !isTile(game.drawnTile)) return false;
  if (game.lastDiscard !== null && !isTile(game.lastDiscard)) return false;
  if (!Number.isInteger(game.lastDiscardPlayer) || game.lastDiscardPlayer! < -1 || game.lastDiscardPlayer! > 3) return false;
  if (typeof game.isRinshanDraw !== "boolean" || !["east", "south", "west", "north"].includes(game.roundWind ?? "")) return false;
  if (!Number.isInteger(game.riichiSticks) || game.riichiSticks! < 0 || !Number.isInteger(game.honbaCount) || game.honbaCount! < 0) return false;
  const action = game.pendingAction;
  if (action !== null && (!action || !["discard", "tsumoOrDiscard", "ronCheck", "autoDiscard"].includes(action.type) ||
      ![action.canTsumo, action.canRiichi, action.canAnkan].every((flag) => typeof flag === "boolean") || !isTileArray(action.ankanTiles))) return false;
  const result = game.roundResult;
  if (result !== null && (!result || !Array.isArray(result.yaku) ||
      !result.yaku.every((y) => y && typeof y.id === "string" && typeof y.name === "string" && Number.isFinite(y.han)) ||
      ![result.winnerId, result.loserId].every((id) => id === null || (Number.isInteger(id) && id >= 0 && id < 4)) ||
      typeof result.isDraw !== "boolean" || typeof result.isTsumo !== "boolean" || typeof result.rankName !== "string" ||
      !Number.isFinite(result.totalHan) || !Number.isFinite(result.basePoints) ||
      (result.winTile !== null && !isTile(result.winTile)) || !isTileArray(result.winTiles) ||
      !Array.isArray(result.pointChanges) || result.pointChanges.length !== 4 || !result.pointChanges.every(Number.isFinite))) return false;
  if (["roundResult", "gameResult"].includes(game.phase!) && !result) return false;
  return Number.isInteger(game.currentPlayerIdx) && game.currentPlayerIdx! >= 0 && game.currentPlayerIdx! < 4 &&
    Number.isInteger(game.roundNumber) &&
    game.roundNumber! >= 0 && game.roundNumber! <= 4 &&
    Number.isInteger(game.dealerIdx) && game.dealerIdx! >= 0 && game.dealerIdx! < 4 &&
    Number.isInteger(game.turnCount) && game.turnCount! >= 0 &&
    Array.isArray(game.gameLog) && game.gameLog.every((line) => typeof line === "string");
};

export const isResumableGame = (game: GameState): boolean =>
  game.players[0].hand.length > 0 &&
  !game.completed &&
  game.phase !== "gameResult" &&
  game.roundNumber < 4 &&
  game.players.every((player) => player.points >= 0);
