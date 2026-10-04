import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/games/colorChain/worldMap.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { WORLD_REGIONS, worldMapRoute, mapPositionAt, mapFacingAt } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
assert.equal(new Set(WORLD_REGIONS.map(region => region.id)).size, 6);
for (let from = 0; from < WORLD_REGIONS.length; from++) {
  for (let to = 0; to < WORLD_REGIONS.length; to++) {
    const route = worldMapRoute(from, to);
    assert.deepEqual(route[0], WORLD_REGIONS[from].point);
    assert.deepEqual(route.at(-1), WORLD_REGIONS[to].point);
    assert.deepEqual(worldMapRoute(to, from), [...route].reverse(), "往復で同じ道を使う");
    assert.deepEqual(mapPositionAt(route, -1), WORLD_REGIONS[from].point);
    assert.deepEqual(mapPositionAt(route, 2), WORLD_REGIONS[to].point);
    for (let step = 0; step <= 20; step++) {
      const point = mapPositionAt(route, step / 20);
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
      assert.ok(point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100, "地図の外へ出ない");
      assert.ok(["down", "up", "left", "right"].includes(mapFacingAt(route, step / 20)));
    }
  }
}
assert.deepEqual(mapPositionAt([{x:0,y:0},{x:100,y:50}],.5), {x:50,y:25});
assert.throws(() => worldMapRoute(-1, 0), RangeError);
assert.throws(() => worldMapRoute(0, 6), RangeError);
assert.throws(() => worldMapRoute(.5, 0), RangeError);
assert.throws(() => mapPositionAt([], .5), RangeError);
assert.throws(() => mapFacingAt([], .5), RangeError);
assert.equal(mapFacingAt([{x:0,y:0},{x:0,y:10}], .5), "down");
assert.equal(mapFacingAt([{x:0,y:10},{x:0,y:0}], .5), "up");
assert.equal(mapFacingAt([{x:0,y:0},{x:10,y:0}], .5), "right");
assert.equal(mapFacingAt([{x:10,y:0},{x:0,y:0}], .5), "left");
const corner = [{x:0,y:10},{x:0,y:0},{x:10,y:0}];
assert.equal(mapFacingAt(corner, 0), "up");
assert.equal(mapFacingAt(corner, .8), "right");
assert.equal(mapFacingAt([...corner].reverse(), .8), "down");
assert.equal(mapFacingAt(corner, 1), "right");
assert.equal(mapFacingAt([{x:0,y:0},{x:0,y:0},{x:10,y:0}], 0), "right");
console.log("ワールドマップ: 全36経路・往復・補間・境界・4方向・曲がり角チェックに成功。");

