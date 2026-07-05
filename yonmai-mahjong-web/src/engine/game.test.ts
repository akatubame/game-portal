import { describe, expect, it } from "vitest";
import { initialState, nextRound, playerAnkan, playerRiichi, playerTsumo, recoverPlayableState, startGame } from "./game";
import type { GameState, Tile, Wall } from "./types";

const man = (value: number): Tile => ({ kind: "number", suit: "man", value });
const pin = (value: number): Tile => ({ kind: "number", suit: "pin", value });

const ankanState = (lastTile: Tile, rinshan: Tile): GameState => {
  const kan = man(1);
  const base = initialState("normal");
  const wall: Wall = {
    liveTiles: Array.from({ length: 20 }, () => pin(9)),
    deadWall: [rinshan, pin(1), pin(2)],
    doraIndicators: [pin(3)],
    uraDoraIndicators: [pin(4)]
  };
  return {
    ...base,
    phase: "waiting",
    wall,
    currentPlayerIdx: 0,
    drawnTile: lastTile,
    players: base.players.map((player, index) => index === 0
      ? { ...player, hand: [kan, kan, kan, kan, lastTile] }
      : player),
    pendingAction: {
      type: "discard",
      canTsumo: false,
      canRiichi: false,
      canAnkan: true,
      ankanTiles: [kan]
    }
  };
};

describe("ゲーム進行", () => {
  it("開始すると人間の打牌待ちまで進む", () => {
    const game = startGame("normal", () => 0.42);
    expect(game.phase).toBe("waiting");
    expect(game.players[0].hand).toHaveLength(5);
  });

  it("暗槓後に立直できる", () => {
    const game = playerAnkan(ankanState(man(2), man(3)), man(1));
    expect(game.pendingAction?.canRiichi).toBe(true);
    const declared = playerRiichi(game, man(2));
    expect(declared.players[0].isRiichi).toBe(true);
  });

  it("暗槓後の補充牌で嶺上和了できる", () => {
    const game = playerAnkan(ankanState(man(2), man(2)), man(1));
    expect(game.pendingAction?.canTsumo).toBe(true);
    const result = playerTsumo(game);
    expect(result.phase).toBe("roundResult");
    expect(result.roundResult?.yaku.some((item) => item.id === "rinshan")).toBe(true);
  });

  it("東2局で親がCOMに移っても人間の入力待ちまで進む", () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const eastOneResult: GameState = {
        ...initialState("normal"),
        phase: "roundResult",
        dealerIdx: 0,
        roundNumber: 0,
        roundResult: {
          winnerId: 1,
          loserId: 0,
          yaku: [{ id: "riichi", name: "立直", han: 1 }],
          totalHan: 1,
          rankName: "1翻",
          basePoints: 1000,
          isTsumo: false,
          isDraw: false,
          winTile: man(2),
          winTiles: [man(1), man(1), man(2), man(3), man(4)],
          pointChanges: [-1000, 1000, 0, 0]
        }
      };

      const eastTwo = nextRound(eastOneResult);

      expect(eastTwo.roundNumber).toBe(1);
      expect(eastTwo.dealerIdx).toBe(1);
      expect(["waiting", "roundResult"]).toContain(eastTwo.phase);
      if (eastTwo.phase === "waiting") {
        expect(eastTwo.pendingAction).not.toBeNull();
        if (eastTwo.pendingAction?.type === "ronCheck") {
          expect(eastTwo.lastDiscardPlayer).not.toBe(0);
        } else {
          expect(eastTwo.currentPlayerIdx).toBe(0);
          expect(eastTwo.players[0].hand).toHaveLength(5);
        }
      }
    }
  });

  it("5枚配られたまま停止した旧セーブを入力待ちへ修復する", () => {
    const base = initialState("normal");
    const stopped: GameState = {
      ...base,
      phase: "playing",
      roundNumber: 1,
      dealerIdx: 1,
      currentPlayerIdx: 0,
      drawnTile: man(5),
      players: base.players.map((player, index) => index === 0
        ? { ...player, hand: [man(1), man(3), man(6), man(9), man(5)] }
        : player),
      pendingAction: null
    };

    const recovered = recoverPlayableState(stopped);

    expect(recovered.phase).toBe("waiting");
    expect(recovered.pendingAction).not.toBeNull();
    expect(recovered.players[0].hand).toHaveLength(5);
  });

  it("手牌5枚なのにcurrentPlayerIdxがCOMを指す不整合も修復する", () => {
    const base = initialState("normal");
    const stopped: GameState = {
      ...base,
      phase: "playing",
      roundNumber: 1,
      dealerIdx: 1,
      currentPlayerIdx: 2,
      drawnTile: man(5),
      players: base.players.map((player, index) => index === 0
        ? { ...player, hand: [man(1), man(3), man(6), man(9), man(5)] }
        : player),
      pendingAction: null
    };

    const recovered = recoverPlayableState(stopped);

    expect(recovered.phase).toBe("waiting");
    expect(recovered.currentPlayerIdx).toBe(0);
    expect(recovered.pendingAction).not.toBeNull();
  });
});
