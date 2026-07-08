import { describe, expect, it } from "vitest";
import { findWinningHands, waitingTiles } from "./hand";
import type { Tile } from "./types";

const man = (value: number): Tile => ({ kind: "number", suit: "man", value });

describe("手牌判定", () => {
  it("順子と雀頭の和了形を判定する", () => {
    const wins = findWinningHands([man(2), man(3), man(4), man(7), man(7)]);
    expect(wins.some((hand) => hand.mentsu.type === "shuntsu")).toBe(true);
  });

  it("両面待ちを列挙する", () => {
    const waits = waitingTiles([man(2), man(3), man(7), man(7)]);
    expect(waits).toEqual(expect.arrayContaining([man(1), man(4)]));
  });

  it("暗槓後の単騎待ちを判定する", () => {
    const waits = waitingTiles([man(2)], [man(1)]);
    expect(waits).toContainEqual(man(2));
  });
});
