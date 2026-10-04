export type MapPoint = { x: number; y: number };
export type MapFacing = "down" | "up" | "left" | "right";
type RegionText = { name: string; resident: string; description: string };
export type WorldRegion = {
  id: string;
  point: MapPoint;
  ja: RegionText;
  en: RegionText;
};

// 座標は生成した地図の広場中心（左上を0%、右下を100%）に合わせる。
export const WORLD_REGIONS: WorldRegion[] = [
  { id: "magic-forest", point: { x: 19, y: 51.5 },
    ja: { name: "魔法の森", resident: "モコスライム", description: "色の結晶がきらめく森。最初の結び目を整えよう。" },
    en: { name: "Magic Forest", resident: "Moko Slime", description: "A forest of colorful crystals. Restore the first magical knot." } },
  { id: "moonlit-cave", point: { x: 30.5, y: 23.5 },
    ja: { name: "月夜の洞窟", resident: "チェインバット", description: "月明かりと紫の霧に包まれた、鎖の響く洞窟。" },
    en: { name: "Moonlit Cave", resident: "Chain Bat", description: "Moonlight and violet mist surround a cave of echoing chains." } },
  { id: "frozen-garden", point: { x: 56.8, y: 27.1 },
    ja: { name: "氷結の庭園", resident: "フロストン", description: "氷の花が咲く白い庭。冷たい彩鎖が静かに光る。" },
    en: { name: "Frozen Garden", resident: "Froston", description: "Ice flowers bloom among softly glowing, frost-covered chains." } },
  { id: "ancient-library", point: { x: 73.6, y: 37.8 },
    ja: { name: "古書塔", resident: "ポンポンゴースト", description: "浮かぶ古書と不思議な気配。魔法の記憶が眠る塔。" },
    en: { name: "Ancient Library", resident: "Pompon Ghost", description: "Floating books guard forgotten magic in a mysterious old tower." } },
  { id: "spore-greenhouse", point: { x: 60, y: 65 },
    ja: { name: "胞子の温室", resident: "キノコノコ", description: "大きなキノコと虹色の胞子が彩る、にぎやかな温室。" },
    en: { name: "Spore Greenhouse", resident: "Kinokonoko", description: "Giant mushrooms and rainbow spores fill a lively glass garden." } },
  { id: "black-mirror-tower", point: { x: 87.5, y: 62.2 },
    ja: { name: "黒鏡の塔", resident: "ミラ", description: "夕焼け色の鏡が光る塔。ライバルのミラが待つ舞台。" },
    en: { name: "Black Mirror Tower", resident: "Mira", description: "Sunset glows in enchanted mirrors. Your rival Mira awaits." } }
];

const trailBends: MapPoint[][] = [
  [{ x: 21, y: 42 }, { x: 23, y: 35 }, { x: 27, y: 31 }, { x: 31.4, y: 28 }],
  [{ x: 31.4, y: 27 }, { x: 37, y: 29 }, { x: 42.5, y: 33 }, { x: 49, y: 29 }],
  [{ x: 58.5, y: 30 }, { x: 63, y: 33.3 }, { x: 69, y: 37.5 }],
  [{ x: 74, y: 43 }, { x: 76, y: 49 }, { x: 75, y: 56 }, { x: 70, y: 63 }, { x: 65, y: 66 }],
  [{ x: 65.5, y: 68 }, { x: 70, y: 67 }, { x: 76, y: 64 }, { x: 81.5, y: 62.5 }]
];

export function worldMapRoute(from: number, to: number): MapPoint[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || !WORLD_REGIONS[from] || !WORLD_REGIONS[to]) {
    throw new RangeError("地図の行き先が範囲外です。");
  }
  const points = [WORLD_REGIONS[from].point];
  const direction = Math.sign(to - from);
  for (let index = from; index !== to; index += direction) {
    const segment = direction > 0 ? trailBends[index] : [...trailBends[index - 1]].reverse();
    points.push(...segment, WORLD_REGIONS[index + direction].point);
  }
  return points;
}

export function mapDistance(a: MapPoint, b: MapPoint) {
  return Math.hypot((b.x - a.x) * 16 / 9, b.y - a.y);
}

// 画面の16:9比率を含めて、現在歩いている道の区間から向きを決める。
export function mapFacingAt(points: MapPoint[], progress: number): MapFacing {
  if (points.length === 0) throw new RangeError("移動経路がありません。");
  const distances = points.slice(1).map((point, index) => mapDistance(points[index], point));
  let remaining = Math.max(0, Math.min(1, progress)) * distances.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < distances.length; index++) {
    const distance = distances[index];
    if (distance > 0 && (remaining <= distance || index === distances.length - 1)) {
      const dx = (points[index + 1].x - points[index].x) * 16 / 9;
      const dy = points[index + 1].y - points[index].y;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    }
    remaining -= distance;
  }
  return "down";
}

export function mapPositionAt(points: MapPoint[], progress: number): MapPoint {
  if (points.length === 0) throw new RangeError("移動経路がありません。");
  if (progress <= 0) return points[0];
  if (progress >= 1) return points[points.length - 1];
  const distances = points.slice(1).map((point, index) => mapDistance(points[index], point));
  const total = distances.reduce((sum, distance) => sum + distance, 0);
  let remaining = Math.max(0, Math.min(1, progress)) * total;
  for (let index = 0; index < distances.length; index++) {
    const distance = distances[index];
    if (remaining <= distance && distance > 0) {
      const ratio = remaining / distance;
      return { x: points[index].x + (points[index + 1].x - points[index].x) * ratio,
        y: points[index].y + (points[index + 1].y - points[index].y) * ratio };
    }
    remaining -= distance;
  }
  return points[points.length - 1];
}

