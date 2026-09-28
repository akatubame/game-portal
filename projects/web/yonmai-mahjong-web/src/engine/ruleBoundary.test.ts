import { describe, expect, it, vi } from "vitest";
import { advanceUntilHuman, initialState, nextRound, playerAnkan, playerDiscard, playerTsumo, recoverPlayableState, skipRon } from "./game";
import { findWinningHands, waitingTiles } from "./hand";
import { drawDead } from "./tiles";
import type { GameState, Tile } from "./types";

const man = (value: number): Tile => ({ kind: "number", suit: "man", value });
const pin = (value: number): Tile => ({ kind: "number", suit: "pin", value });
const haku: Tile = { kind: "dragon", dragon: "haku" };
const kanState = (): GameState => {
  const state = initialState();
  return {
    ...state, phase: "waiting", turnCount: 10, drawnTile: pin(2),
    wall: { liveTiles: [pin(9)], deadWall: [pin(2), man(9), man(9)], doraIndicators: [man(9)], uraDoraIndicators: [man(9)] },
    players: state.players.map((p, i) => i === 0 ? { ...p, hand: [man(1), man(1), man(1), man(1), pin(2)] } : p),
    pendingAction: { type: "discard", canTsumo: false, canRiichi: false, canAnkan: true, ankanTiles: [man(1)] }
  };
};
const ronState = (discarder = 3): GameState => {
  const state = initialState();
  return {
    ...state, phase: "waiting", turnCount: 10, lastDiscard: pin(2), lastDiscardPlayer: discarder,
    pendingAction: { type: "ronCheck", canTsumo: false, canRiichi: false, canAnkan: false, ankanTiles: [] },
    players: state.players.map((p) => ({ ...p, hand: [haku, haku, haku, pin(2)] }))
  };
};

describe("Android版と共通のルール境界", () => {
  it("同じ牌の5枚目を和了・待ちに含めない", () => {
    expect(findWinningHands(Array(5).fill(man(1)))).toEqual([]);
    expect(waitingTiles(Array(4).fill(man(1)))).toEqual([]);
    expect(findWinningHands([man(1), man(1)], [man(1)])).toEqual([]);
    expect(findWinningHands([pin(2), pin(2)], [man(1)])).toHaveLength(1);
  });
  it("嶺上牌取得で通常山が1枚減り、補充できなければ山を変更しない", () => {
    const wall = kanState().wall;
    expect(drawDead(wall)[1].liveTiles).toHaveLength(0);
    for (const invalid of [{ ...wall, liveTiles: [] }, { ...wall, deadWall: [pin(2)] }]) {
      expect(drawDead(invalid)).toEqual([null, invalid]);
    }
  });
  it("嶺上補充不能の暗槓で手牌を失わない", () => {
    const state = kanState();
    state.wall.liveTiles = [];
    expect(playerAnkan(state, man(1))).toBe(state);
  });
  it("暗槓4枚をドラと和了牌に含め、嶺上に海底を重複させない", () => {
    const state = playerTsumo(playerAnkan(kanState(), man(1)));
    expect(state.roundResult?.winTiles).toHaveLength(6);
    expect(state.roundResult?.yaku.find((y) => y.id === "dora")?.han).toBe(8);
    expect(state.roundResult?.yaku.some((y) => y.id === "rinshan")).toBe(true);
    expect(state.roundResult?.yaku.some((y) => ["haitei", "chinitsu", "tanyao"].includes(y.id))).toBe(false);
    expect(state.roundResult?.pointChanges.reduce((a, b) => a + b, 0)).toBe(0);
  });
  it("暗槓を含む清一色を正しく判定する", () => {
    const state = kanState();
    state.players[0].hand[4] = man(2);
    state.wall.deadWall[0] = man(2);
    expect(playerTsumo(playerAnkan(state, man(1))).roundResult?.yaku.some((y) => y.id === "chinitsu")).toBe(true);
  });
  it("人間のロン見送り後に後順位のCOMがロンできる", () => {
    expect(skipRon(ronState()).roundResult?.winnerId).toBe(1);
  });
  it("見送り後、フリテンCOMを飛ばし前順位のCOMを再確認しない", () => {
    const state = ronState();
    state.players[1].temporaryFuriten = true;
    expect(skipRon(state).roundResult?.winnerId).toBe(2);
    const last = ronState(1);
    last.wall.liveTiles = [];
    expect(skipRon(last).roundResult?.isDraw).toBe(true);
  });
  it("ロン確認中に打牌できない", () => {
    const state = ronState();
    expect(playerDiscard(state, haku)).toBe(state);
  });
  it("立直中は人間もCOMもツモ牌以外を捨てない", () => {
    const state = kanState();
    state.players[0].isRiichi = true;
    expect(playerDiscard(state, man(1))).toBe(state);
    const com = initialState();
    com.phase = "playing";
    com.currentPlayerIdx = 1;
    com.turnCount = 10;
    com.wall.liveTiles = [pin(9)];
    com.players[1] = { ...com.players[1], hand: [man(1), man(1), man(2), man(3)], isRiichi: true };
    expect(advanceUntilHuman(com).players[1].discards).toEqual([pin(9)]);
  });
  it("初級COMは立直も暗槓もしない", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.9);
    try {
      const state = initialState("beginner");
      state.phase = "playing";
      state.currentPlayerIdx = 1;
      state.turnCount = 10;
      state.wall.liveTiles = [pin(9)];
      state.players[1].hand = [man(1), man(1), man(2), man(3)];
      expect(advanceUntilHuman(state).players[1].isRiichi).toBe(false);
    } finally { random.mockRestore(); }
  });
  it("暗槓後2枚の手牌の旧セーブも入力待ちに修復する", () => {
    const state = playerAnkan(kanState(), man(1));
    expect(recoverPlayableState({ ...state, phase: "playing", pendingAction: null }).pendingAction?.canTsumo).toBe(true);
  });
  it("東4局終了時に架空の東5局や次の親を表示しない", () => {
    const state = playerTsumo(playerAnkan(kanState(), man(1)));
    state.roundNumber = 3;
    state.dealerIdx = 1;
    const result = nextRound(state);
    expect(result.phase).toBe("gameResult");
    expect(result.roundNumber).toBe(3);
    expect(result.dealerIdx).toBe(1);
  });
});
