import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// 先にローカルサーバーを起動する。接続先はPORTAL_TEST_URL（既定: 4180番）。
const scripts = [
  "test-portal-core.mjs",
  "test-color-chain.mjs",
  "test-color-chain-rotation.mjs",
  "test-color-chain-map.mjs",
  "test-portal-browser.mjs",
  ...Array.from({ length: 12 }, (_, i) => `test-portal-phase${i + 2}.mjs`)
];
if (process.argv.includes("--list")) {
  console.log(scripts.join("\n"));
} else {
  for (const script of scripts) {
    console.log(`検証開始: ${script}`);
    const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      stdio: "inherit"
    });
    if (result.error || result.status !== 0) {
      console.error(`検証失敗: ${script}`, result.error?.message ?? result.signal ?? result.status);
      process.exit(result.status ?? 1);
    }
  }
  console.log("全回帰テストに成功しました。");
}
