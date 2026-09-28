import type { Difficulty, GameState, PlayerState, RoundResult, Tile, Wind } from "./types";
import { ankanCandidates, bestDiscard, findWinningHands, isFuriten, waitingTiles } from "./hand";
import { buildWall, canDrawDead, countDora, drawDead, drawLive, removeTile, sortTiles, tileEqual, WINDS } from "./tiles";
import { bestYakuFor, score } from "./yaku";

export const INITIAL_POINTS = 60000;
export const newGameId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const makePlayers = (): PlayerState[] => ["あなた", "COM 1", "COM 2", "COM 3"].map((name, id) => ({
  id, name, hand: [], discards: [], points: INITIAL_POINTS, seatWind: WINDS[id],
  isRiichi: false, isDoubleRiichi: false, riichiDiscardIndex: -1, isIppatsu: false,
  ankan: [], isHuman: id === 0, temporaryFuriten: false, riichiFuriten: false
}));

export const initialState = (difficulty: Difficulty = "normal"): GameState => ({
  version: 1, gameId: newGameId(), roundSequence: 0, completed: false, phase: "title", players: makePlayers(), wall: buildWall(), currentPlayerIdx: 0,
  roundNumber: 0, dealerIdx: 0, roundWind: "east", turnCount: 0, drawnTile: null,
  isRinshanDraw: false, lastDiscard: null, lastDiscardPlayer: -1, roundResult: null,
  gameLog: [], riichiSticks: 0, honbaCount: 0, pendingAction: null, difficulty
});

export const startRound = (state: GameState, random: () => number = Math.random): GameState => {
  let wall = buildWall(random);
  const hands: Tile[][] = [[], [], [], []];
  for (let round = 0; round < 4; round++) {
    for (let offset = 0; offset < 4; offset++) {
      const player = (state.dealerIdx + offset) % 4;
      const [tile, next] = drawLive(wall);
      wall = next;
      if (tile) hands[player].push(tile);
    }
  }
  return {
    ...state, roundSequence: (state.roundSequence ?? 0) + 1, phase: "playing", wall, currentPlayerIdx: state.dealerIdx, turnCount: 0,
    drawnTile: null, isRinshanDraw: false, lastDiscard: null, lastDiscardPlayer: -1,
    roundResult: null, pendingAction: null, gameLog: [`東${state.roundNumber + 1}局 ${state.honbaCount}本場`],
    gameLogEvents: [{ type: 'round', round: state.roundNumber, honba: state.honbaCount }],
    players: state.players.map((player, index) => ({
      ...player, hand: sortTiles(hands[index]), discards: [], seatWind: WINDS[(index - state.dealerIdx + 4) % 4],
      isRiichi: false, isDoubleRiichi: false, riichiDiscardIndex: -1, isIppatsu: false,
      ankan: [], temporaryFuriten: false, riichiFuriten: false
    }))
  };
};

export const startGame = (difficulty: Difficulty, random: () => number = Math.random): GameState =>
  advanceUntilHuman(startRound({ ...initialState(difficulty), phase: "playing", dealerIdx: Math.floor(random() * 4) }, random));

const riichiDiscards = (player: PlayerState): Tile[] =>
  player.isRiichi || player.points < 1000 ? [] :
    player.hand.filter((tile) => waitingTiles(removeTile(player.hand, tile), player.ankan).length > 0);

const canWin = (state: GameState, player: PlayerState, winTile: Tile, tsumo: boolean) => {
  const full = tsumo ? player.hand : [...player.hand, winTile];
  const wins = findWinningHands(full, player.ankan);
  if (!wins.length) return null;
  const first = state.turnCount <= 4 && state.players.every((p) => p.ankan.length === 0);
  return bestYakuFor(wins, {
    allTiles: [...full, ...player.ankan.flatMap((tile) => [tile, tile, tile])], winTile, isTsumo: tsumo, isRiichi: player.isRiichi,
    isDoubleRiichi: player.isDoubleRiichi, isIppatsu: player.isIppatsu,
    isRinshan: state.isRinshanDraw && tsumo, isHaitei: state.wall.liveTiles.length === 0 && !(state.isRinshanDraw && tsumo),
    seatWind: player.seatWind, roundWind: state.roundWind,
    handTiles: tsumo ? removeTile(full, winTile) : player.hand,
    hasAnkan: player.ankan.length > 0, isFirstDraw: first,
    isDealerFirstDraw: first && player.id === state.dealerIdx && state.turnCount === 1,
    isPlayerFirstDraw: player.discards.length === 0,
    isRenhou: !tsumo && first && player.id !== state.dealerIdx && player.discards.length === 0
  });
};

const drawTurn = (state: GameState): GameState => {
  const index = state.currentPlayerIdx;
  let player = state.players[index];
  if (player.temporaryFuriten) player = { ...player, temporaryFuriten: false };
  const [tile, wall] = drawLive(state.wall);
  if (!tile) return drawResult(state);
  player = { ...player, hand: [...player.hand, tile] };
  let next: GameState = {
    ...state, wall, drawnTile: tile, isRinshanDraw: false, turnCount: state.turnCount + 1,
    players: state.players.map((p, i) => i === index ? player : p)
  };
  const win = canWin(next, player, tile, true);
  if (player.isHuman) {
    if (player.isRiichi) {
      return { ...next, phase: "waiting", pendingAction: {
        type: win?.yaku.length ? "tsumoOrDiscard" : "autoDiscard", canTsumo: !!win?.yaku.length,
        canRiichi: false, canAnkan: false, ankanTiles: []
      }};
    }
    const kans = canDrawDead(next.wall) ? ankanCandidates(player.hand) : [];
    const riichi = riichiDiscards(player);
    return { ...next, phase: "waiting", pendingAction: {
      type: win?.yaku.length ? "tsumoOrDiscard" : "discard", canTsumo: !!win?.yaku.length,
      canRiichi: riichi.length > 0, canAnkan: kans.length > 0, ankanTiles: kans
    }};
  }
  if (win?.yaku.length) return winResult(next, index, null, tile, true);
  if (player.isRiichi) return discardTile(next, index, tile);
  const kans = canDrawDead(next.wall) ? ankanCandidates(player.hand) : [];
  if (kans.length && (state.difficulty === "normal" || (state.difficulty === "easy" && Math.random() >= 0.5))) return applyAnkan(next, index, kans[0]);
  const canRiichi = riichiDiscards(player);
  if (canRiichi.length && (state.difficulty === "normal" || (state.difficulty === "easy" && Math.random() >= 0.5))) {
    const declared = declareRiichi(next, index, canRiichi[0]);
    return declared;
  }
  const discard = Math.random() < (state.difficulty === "beginner" ? 0.8 : state.difficulty === "easy" ? 0.5 : 0)
    ? player.hand[Math.floor(Math.random() * player.hand.length)]
    : bestDiscard(player.hand, player.ankan);
  return discardTile(next, index, discard);
};

const discardTile = (state: GameState, index: number, tile: Tile): GameState => {
  let player = state.players[index];
  if (player.isIppatsu && player.discards.length > player.riichiDiscardIndex) player = { ...player, isIppatsu: false };
  player = { ...player, hand: sortTiles(removeTile(player.hand, tile)), discards: [...player.discards, tile] };
  let next: GameState = {
    ...state, phase: "playing", players: state.players.map((p, i) => i === index ? player : p),
    lastDiscard: tile, lastDiscardPlayer: index, drawnTile: null, isRinshanDraw: false, pendingAction: null
  };
  return resolveDiscardRon(next);
};

// 見送り後は人間より後の席だけを確認し、頭ハネの順序を保つ。
const resolveDiscardRon = (next: GameState, startOffset = 1): GameState => {
  const index = next.lastDiscardPlayer;
  const tile = next.lastDiscard;
  if (!tile) return next;
  for (let offset = startOffset; offset <= 3; offset++) {
    const target = (index + offset) % 4;
    const candidate = next.players[target];
    const win = canWin(next, candidate, tile, false);
    if (!win?.yaku.length) continue;
    if (isFuriten(candidate.hand, candidate.ankan, candidate.discards) || candidate.temporaryFuriten || candidate.riichiFuriten) continue;
    if (candidate.isHuman) {
      return { ...next, phase: "waiting", pendingAction: { type: "ronCheck", canTsumo: false, canRiichi: false, canAnkan: false, ankanTiles: [] } };
    }
    return winResult(next, target, index, tile, false);
  }
  return { ...next, currentPlayerIdx: (index + 1) % 4 };
};

const declareRiichi = (state: GameState, index: number, tile: Tile): GameState => {
  const player = state.players[index];
  if (!riichiDiscards(player).some((candidate) => tileEqual(candidate, tile))) return state;
  const updated = {
    ...player, isRiichi: true, isDoubleRiichi: player.discards.length === 0 && state.players.every((p) => p.ankan.length === 0),
    riichiDiscardIndex: player.discards.length, isIppatsu: true, points: player.points - 1000
  };
  return discardTile({
    ...state, riichiSticks: state.riichiSticks + 1,
    players: state.players.map((p, i) => i === index ? updated : p),
    gameLog: [...state.gameLog, `${player.name} が立直！`],
    gameLogEvents: state.gameLogEvents && [...state.gameLogEvents, { type: 'riichi', playerId: index }]
  }, index, tile);
};

const applyAnkan = (state: GameState, index: number, tile: Tile): GameState => {
  if (state.players[index].isRiichi || !canDrawDead(state.wall) ||
      !ankanCandidates(state.players[index].hand).some((candidate) => tileEqual(candidate, tile))) return state;
  let hand = state.players[index].hand;
  for (let i = 0; i < 4; i++) hand = removeTile(hand, tile);
  let player = { ...state.players[index], hand, ankan: [...state.players[index].ankan, tile] };
  let next: GameState = {
    ...state, players: state.players.map((p, i) => ({ ...(i === index ? player : p), isIppatsu: false })),
    gameLog: [...state.gameLog, `${player.name} が暗槓！`],
    gameLogEvents: state.gameLogEvents && [...state.gameLogEvents, { type: 'ankan', playerId: index }]
  };
  const [rinshan, wall] = drawDead(next.wall);
  if (!rinshan) return drawResult(next);
  player = { ...player, hand: [...player.hand, rinshan] };
  next = {
    ...next, wall, drawnTile: rinshan, isRinshanDraw: true,
    players: next.players.map((p, i) => i === index ? player : p)
  };
  const win = canWin(next, player, rinshan, true);
  if (!player.isHuman && win?.yaku.length) return winResult(next, index, null, rinshan, true);
  if (player.isHuman) {
    const riichi = riichiDiscards(player);
    return { ...next, phase: "waiting", pendingAction: {
      type: win?.yaku.length ? "tsumoOrDiscard" : "discard", canTsumo: !!win?.yaku.length,
      canRiichi: riichi.length > 0, canAnkan: ankanCandidates(player.hand).length > 0,
      ankanTiles: ankanCandidates(player.hand)
    }};
  }
  const riichi = riichiDiscards(player);
  if (riichi.length && (state.difficulty === "normal" || (state.difficulty === "easy" && Math.random() >= 0.5))) {
    return declareRiichi(next, index, riichi[0]);
  }
  return discardTile(next, index, bestDiscard(player.hand, player.ankan));
};

const winResult = (state: GameState, winnerId: number, loserId: number | null, tile: Tile, tsumo: boolean): GameState => {
  const player = state.players[winnerId];
  const full = [...(tsumo ? player.hand : [...player.hand, tile]), ...player.ankan.flatMap((tile) => [tile, tile, tile, tile])];
  const best = canWin(state, player, tile, tsumo);
  if (!best?.yaku.length) return state;
  const yaku = [...best.yaku];
  const dora = countDora(full, state.wall.doraIndicators);
  if (dora) yaku.push({ id: "dora", name: `ドラ ${dora}`, han: dora });
  const ura = player.isRiichi ? countDora(full, state.wall.uraDoraIndicators) : 0;
  if (ura) yaku.push({ id: "uradora", name: `裏ドラ ${ura}`, han: ura });
  const calculated = score(yaku, winnerId === state.dealerIdx, tsumo);
  const changes = [0, 0, 0, 0];
  if (tsumo) {
    if (winnerId === state.dealerIdx) {
      for (let i = 0; i < 4; i++) changes[i] = i === winnerId ? calculated.fromEach * 3 : -calculated.fromEach;
    } else {
      for (let i = 0; i < 4; i++) changes[i] = i === winnerId ? calculated.fromDealer + calculated.fromNonDealer * 2 :
        i === state.dealerIdx ? -calculated.fromDealer : -calculated.fromNonDealer;
    }
  } else if (loserId !== null) {
    changes[winnerId] = calculated.fromLoser;
    changes[loserId] = -calculated.fromLoser;
  }
  const honba = state.honbaCount * 300;
  if (tsumo) {
    for (let i = 0; i < 4; i++) if (i !== winnerId) changes[i] -= honba / 3;
    changes[winnerId] += honba;
  } else if (loserId !== null) {
    changes[winnerId] += honba;
    changes[loserId] -= honba;
  }
  changes[winnerId] += state.riichiSticks * 1000;
  const result: RoundResult = {
    winnerId, loserId, yaku, totalHan: calculated.han, rankName: calculated.rankName,
    basePoints: calculated.basePoints, isTsumo: tsumo, isDraw: false, winTile: tile,
    winTiles: sortTiles(full), pointChanges: changes
  };
  return {
    ...state, phase: "roundResult", riichiSticks: 0, roundResult: result, pendingAction: null,
    players: state.players.map((p, i) => ({ ...p, points: p.points + changes[i] })),
    gameLog: [...state.gameLog, `${player.name} が${tsumo ? "ツモ" : "ロン"}！`],
    gameLogEvents: state.gameLogEvents && [...state.gameLogEvents, { type: tsumo ? 'tsumo' : 'ron', playerId: winnerId }]
  };
};

const drawResult = (state: GameState): GameState => {
  const tenpai = state.players.map((p, i) => waitingTiles(p.hand, p.ankan).length ? i : -1).filter((i) => i >= 0);
  const changes = [0, 0, 0, 0];
  if (tenpai.length > 0 && tenpai.length < 4) {
    for (let i = 0; i < 4; i++) changes[i] = tenpai.includes(i) ? 3000 / tenpai.length : -3000 / (4 - tenpai.length);
  }
  return {
    ...state, phase: "roundResult", pendingAction: null,
    players: state.players.map((p, i) => ({ ...p, points: p.points + changes[i] })),
    roundResult: { winnerId: null, loserId: null, yaku: [], totalHan: 0, rankName: "流局", basePoints: 0,
      isTsumo: false, isDraw: true, winTile: null, winTiles: [], pointChanges: changes },
    gameLog: [...state.gameLog, "流局"],
    gameLogEvents: state.gameLogEvents && [...state.gameLogEvents, { type: 'draw' }]
  };
};

export const advanceUntilHuman = (state: GameState): GameState => {
  let next = state;
  let guard = 0;

  while (
    next.phase === "playing" &&
    !next.players[next.currentPlayerIdx].isHuman &&
    guard++ < 100
  ) {
    next = drawTurn(next);
  }

  if (
    next.phase === "playing" &&
    next.players[next.currentPlayerIdx].isHuman
  ) {
    next = drawTurn(next);
  }

  return next;
};

export const recoverPlayableState = (state: GameState): GameState => {
  if (state.phase !== "playing" && !(state.phase === "waiting" && !state.pendingAction)) {
    return state;
  }

  const human = state.players.find((player) => player.isHuman);
  if (human && human.hand.length === 5 - human.ankan.length * 3) {
    const drawnTile = state.drawnTile ?? human.hand[human.hand.length - 1];
    const humanTurnState = {
      ...state,
      currentPlayerIdx: human.id
    };
    const win = canWin(humanTurnState, human, drawnTile, true);

    if (human.isRiichi) {
      return {
        ...humanTurnState,
        phase: "waiting",
        drawnTile,
        pendingAction: {
          type: win?.yaku.length ? "tsumoOrDiscard" : "autoDiscard",
          canTsumo: !!win?.yaku.length,
          canRiichi: false,
          canAnkan: false,
          ankanTiles: []
        }
      };
    }

    const kans = canDrawDead(state.wall) ? ankanCandidates(human.hand) : [];
    return {
      ...humanTurnState,
      phase: "waiting",
      drawnTile,
      pendingAction: {
        type: win?.yaku.length ? "tsumoOrDiscard" : "discard",
        canTsumo: !!win?.yaku.length,
        canRiichi: riichiDiscards(human).length > 0,
        canAnkan: kans.length > 0,
        ankanTiles: kans
      }
    };
  }

  return advanceUntilHuman({
    ...state,
    phase: "playing",
    pendingAction: null
  });
};

export const playerDiscard = (state: GameState, tile: Tile): GameState =>
  state.phase === "waiting" && state.currentPlayerIdx === 0 &&
    ["discard", "tsumoOrDiscard", "autoDiscard"].includes(state.pendingAction?.type ?? "") &&
    (!state.players[0].isRiichi || (!!state.drawnTile && tileEqual(state.drawnTile, tile))) &&
    state.players[0].hand.some((candidate) => tileEqual(candidate, tile))
    ? advanceUntilHuman(discardTile(state, 0, tile)) : state;

export const playerRiichi = (state: GameState, tile: Tile): GameState =>
  state.phase === "waiting" && state.currentPlayerIdx === 0 && state.pendingAction?.type !== "ronCheck" && state.pendingAction?.canRiichi
    ? advanceUntilHuman(declareRiichi(state, 0, tile)) : state;

export const playerAnkan = (state: GameState, tile: Tile): GameState =>
  state.phase === "waiting" && state.currentPlayerIdx === 0 && state.pendingAction?.canAnkan && state.pendingAction.ankanTiles.some((candidate) => tileEqual(candidate, tile))
    ? applyAnkan(state, 0, tile) : state;

export const playerTsumo = (state: GameState): GameState =>
  state.phase === "waiting" && state.currentPlayerIdx === 0 && state.pendingAction?.canTsumo && state.drawnTile
    ? winResult(state, 0, null, state.drawnTile, true) : state;

export const playerRon = (state: GameState): GameState =>
  state.phase === "waiting" && state.pendingAction?.type === "ronCheck" && state.lastDiscard
    ? winResult(state, 0, state.lastDiscardPlayer, state.lastDiscard, false) : state;

export const skipRon = (state: GameState): GameState => {
  if (state.phase !== "waiting" || state.pendingAction?.type !== "ronCheck") return state;
  const player = state.players[0];
  return advanceUntilHuman(resolveDiscardRon({
    ...state, phase: "playing", pendingAction: null, currentPlayerIdx: (state.lastDiscardPlayer + 1) % 4,
    players: state.players.map((p, i) => i === 0 ? {
      ...player, riichiFuriten: player.riichiFuriten || player.isRiichi, temporaryFuriten: !player.isRiichi
    } : p)
  }, (4 - state.lastDiscardPlayer) % 4 + 1));
};

export const autoDiscard = (state: GameState): GameState =>
  state.pendingAction?.type === "autoDiscard" && state.drawnTile ? playerDiscard(state, state.drawnTile) : state;

export const nextRound = (state: GameState): GameState => {
  const result = state.roundResult;
  if (state.phase !== "roundResult" || !result) return state;
  let next = { ...state };
  if (result.isDraw) {
    const dealerTenpai = waitingTiles(state.players[state.dealerIdx].hand, state.players[state.dealerIdx].ankan).length > 0;
    next = dealerTenpai ? { ...next, honbaCount: next.honbaCount + 1 } :
      { ...next, dealerIdx: (next.dealerIdx + 1) % 4, roundNumber: next.roundNumber + 1, honbaCount: next.honbaCount + 1 };
  } else if (result.winnerId === state.dealerIdx) next.honbaCount++;
  else next = { ...next, dealerIdx: (next.dealerIdx + 1) % 4, roundNumber: next.roundNumber + 1, honbaCount: 0 };
  if (next.roundNumber >= 4 || next.players.some((p) => p.points < 0)) return { ...state, phase: "gameResult", completed: true };
  return advanceUntilHuman(startRound(next));
};

export const ranking = (state: GameState) => [...state.players].sort((a, b) => b.points - a.points);
export const validRiichiDiscards = (state: GameState) => riichiDiscards(state.players[0]);
export const windName = (wind: Wind) => ({ east: "東", south: "南", west: "西", north: "北" })[wind];
