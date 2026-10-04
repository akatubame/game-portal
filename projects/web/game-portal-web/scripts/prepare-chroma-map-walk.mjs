import sharp from "sharp";
import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// 生成済みの透明原画を均等に切り出し、足元の高さとセル寸法だけ整える。
const input = process.argv[2];
if (!input) throw new Error("歩行原画のPNGファイルを指定してください。");
const source = resolve("design/color-chain/reference/chroma-map-walk-v1-source.png");
await mkdir(resolve("design/color-chain/reference"), { recursive: true });
if (resolve(input) !== source) await copyFile(input, source);
const { width, height, hasAlpha } = await sharp(source).metadata();
if (!hasAlpha) throw new Error("背景透過の原画が必要です。");
const cell = 256, composites = [];
for (let row = 0; row < 4; row++) {
  for (let column = 0; column < 4; column++) {
    const left = Math.round(column * width / 4), top = Math.round(row * height / 4);
    const tile = await sharp(source).extract({ left, top,
      width: Math.round((column + 1) * width / 4) - left,
      height: Math.round((row + 1) * height / 4) - top }).resize(232, 232).ensureAlpha().raw().toBuffer();
    let bottom = 0;
    for (let y = 0; y < 232; y++) {
      for (let x = 0; x < 232; x++) if (tile[(y * 232 + x) * 4 + 3] > 32) bottom = y;
    }
    const png = await sharp(tile, { raw: { width: 232, height: 232, channels: 4 } }).png().toBuffer();
    composites.push({ input: png, left: column * cell + 12, top: row * cell + 238 - bottom });
  }
}
await sharp({ create: { width: cell * 4, height: cell * 4, channels: 4, background: "#00000000" } })
  .composite(composites).webp({ quality: 88, alphaQuality: 100 }).toFile("public/characters/chroma/chroma-map-walk-v1.webp");
console.log("上下左右×4コマの歩行シートを1024×1024で保存しました。");
