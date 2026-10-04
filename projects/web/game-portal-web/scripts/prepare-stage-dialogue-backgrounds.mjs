import sharp from "sharp";
import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// 採用した生成原画を保存し、会話画面用に軽量な16:9のWebPを作る。
const ids = ["magic-forest", "moonlit-cave", "frozen-garden", "ancient-library", "spore-greenhouse", "black-mirror-tower"];
const sources = process.argv.slice(2);
if (sources.length !== ids.length) throw new Error("6舞台分の生成PNGを舞台順で指定してください。");
const referenceDir = resolve("design/color-chain/reference/stage-dialogue");
const runtimeDir = resolve("public/backgrounds/stage-dialogue");
await mkdir(referenceDir, { recursive: true });
await mkdir(runtimeDir, { recursive: true });
for (let i = 0; i < ids.length; i++) {
  const original = resolve(referenceDir, `${ids[i]}-v1-source.png`);
  const output = resolve(runtimeDir, `${ids[i]}-v1.webp`);
  if (resolve(sources[i]) !== original) await copyFile(sources[i], original);
  await sharp(original).resize(1600, 900, { fit: "cover", position: "centre" })
    .webp({ quality: 88 }).toFile(output);
  console.log(`${ids[i]}: 原画と1600×900のWebPを保存しました。`);
}
