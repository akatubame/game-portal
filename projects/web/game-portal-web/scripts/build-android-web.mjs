import { build } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const outDir = resolve(root, "../../android/chroma-magical-chain/app/src/main/assets/www");
await build({ root, configFile: false, plugins: [react()], base: "/assets/www/", publicDir: false,
  build: { outDir, emptyOutDir: true, rollupOptions: { input: resolve(root, "android.html") } } });
renameSync(resolve(outDir, "android.html"), resolve(outDir, "index.html"));
for (const path of ["characters/chroma", "characters/moko", "audio/color-chain", "effects/color-chain", "backgrounds/color-chain-battle-v2.webp", "backgrounds/chroma-world-map-v1.webp", "backgrounds/stage-dialogue/magic-forest-v1.webp"]) {
  const source = resolve(root, "public", path);
  if (!existsSync(source)) throw new Error(`素材が見つかりません: ${path}`);
  cpSync(source, resolve(outDir, path), { recursive: true });
}
console.log(`Android用ゲームを書き出しました: ${outDir}`);
