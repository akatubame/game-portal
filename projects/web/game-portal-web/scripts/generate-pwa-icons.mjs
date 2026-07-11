import sharp from "sharp";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const portalRoot = resolve(scriptDir, "..");
const source = resolve(portalRoot, "public", "favicon.svg");

await sharp(source).resize(192, 192).png().toFile(resolve(portalRoot, "public", "pwa-192.png"));
await sharp(source).resize(512, 512).png().toFile(resolve(portalRoot, "public", "pwa-512.png"));
await sharp(source)
  .resize(384, 384)
  .extend({ top: 64, bottom: 64, left: 64, right: 64, background: "#101516" })
  .png()
  .toFile(resolve(portalRoot, "public", "pwa-maskable-512.png"));

console.log("PWA icons generated.");
