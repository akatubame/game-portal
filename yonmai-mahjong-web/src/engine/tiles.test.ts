import { describe, expect, it } from "vitest";
import { allTileTypes, tileId, tileImagePath } from "./tiles";

describe("牌画像", () => {
  it("全34種の牌IDにPNG画像パスを割り当てる", () => {
    const paths = allTileTypes().map(tileImagePath);

    expect(paths).toHaveLength(34);
    expect(new Set(paths).size).toBe(34);
    expect(paths.every((path) => path.startsWith("/tiles/") && path.endsWith(".png"))).toBe(true);
  });

  it("牌IDとファイル名が一致する", () => {
    allTileTypes().forEach((tile) => {
      expect(tileImagePath(tile)).toBe(`/tiles/${tileId(tile)}.png`);
    });
  });
});
