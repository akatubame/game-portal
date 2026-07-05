import { describe, expect, it } from "vitest";
import { canAcceptTileInput, TILE_INPUT_GUARD_MS } from "./tileInputGuard";

describe("牌クリックの入力ガード", () => {
  it("最初のクリックは受理する", () => {
    expect(canAcceptTileInput(null, 10)).toBe(true);
  });

  it("短時間に重複したクリックは拒否する", () => {
    expect(canAcceptTileInput(1000, 1000 + TILE_INPUT_GUARD_MS - 1)).toBe(false);
  });

  it("ガード時間経過後のクリックは受理する", () => {
    expect(canAcceptTileInput(1000, 1000 + TILE_INPUT_GUARD_MS)).toBe(true);
  });
});
