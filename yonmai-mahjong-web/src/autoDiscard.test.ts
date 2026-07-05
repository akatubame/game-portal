import { describe, expect, it } from "vitest";
import { autoDiscardTriggerKey } from "./autoDiscard";
import { initialState } from "./engine/game";
import type { GameState, Tile } from "./engine/types";

const man = (value: number): Tile => ({ kind: "number", suit: "man", value });

const autoDiscardState = (turnCount: number, drawnTile: Tile): GameState => ({
  ...initialState("normal"),
  phase: "waiting",
  roundNumber: 2,
  turnCount,
  drawnTile,
  pendingAction: {
    type: "autoDiscard",
    canTsumo: false,
    canRiichi: false,
    canAnkan: false,
    ankanTiles: []
  }
});

describe("リーチ中の自動ツモ切り", () => {
  it("連続する巡目では異なる実行キーを返す", () => {
    const first = autoDiscardTriggerKey(autoDiscardState(20, man(2)));
    const next = autoDiscardTriggerKey(autoDiscardState(24, man(2)));

    expect(first).not.toBe(next);
  });

  it("自動ツモ切り状態以外では実行しない", () => {
    expect(autoDiscardTriggerKey(initialState("normal"))).toBeNull();
  });
});
