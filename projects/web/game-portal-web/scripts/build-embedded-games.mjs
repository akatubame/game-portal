import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const portalRoot = resolve(scriptDir, "..");
const workspaceRoot = resolve(portalRoot, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const embeddedGames = [
  {
    label: "ランダム将棋",
    projectDir: resolve(workspaceRoot, "random-shogi-web"),
    basePath: "/games/random-shogi/",
    outputDir: resolve(portalRoot, "dist", "games", "random-shogi")
  },
  {
    label: "四枚麻雀",
    projectDir: resolve(workspaceRoot, "yonmai-mahjong-web"),
    basePath: "/games/yonmai-mahjong/",
    outputDir: resolve(portalRoot, "dist", "games", "yonmai-mahjong")
  }
];

function runBuild(game) {
  if (!existsSync(game.projectDir)) {
    throw new Error(`${game.label} のプロジェクトが見つかりません: ${game.projectDir}`);
  }

  console.log(`\n> ${game.label} を ${game.basePath} 向けにビルドします`);

  const result = spawnSync(npmCommand, ["run", "build"], {
    cwd: game.projectDir,
    env: {
      ...process.env,
      VITE_BASE_PATH: game.basePath
    },
    shell: process.platform === "win32",
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${game.label} のビルドに失敗しました`);
  }
}

function copyDist(game) {
  const sourceDir = resolve(game.projectDir, "dist");

  if (!existsSync(sourceDir)) {
    throw new Error(`${game.label} の dist が見つかりません: ${sourceDir}`);
  }

  rmSync(game.outputDir, { recursive: true, force: true });
  mkdirSync(game.outputDir, { recursive: true });
  cpSync(sourceDir, game.outputDir, { recursive: true });
  console.log(`> ${game.label} を ${game.outputDir} に内包しました`);
}

for (const game of embeddedGames) {
  runBuild(game);
  copyDist(game);
}
