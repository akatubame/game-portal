import { describe, expect, it } from "vitest";
import { isRiichiSelectionActive } from "./riichiSelection";

describe("立直牌選択モード", () => {
  it("立直可能な手番だけ選択モードを有効にする", () => {
    expect(isRiichiSelectionActive(true, true)).toBe(true);
  });

  it("局や手番が変わり立直不可なら古い選択状態を無効化する", () => {
    expect(isRiichiSelectionActive(true, false)).toBe(false);
  });
});
