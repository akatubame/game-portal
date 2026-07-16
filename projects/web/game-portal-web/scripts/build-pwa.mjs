import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const portalRoot = resolve(scriptDir, "..");
const webProjectsRoot = resolve(portalRoot, "..");
const stagingRoot = resolve(portalRoot, "public", "games");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const embeddedGames = [
  { label: "Random Shogi", directory: "random-shogi-web", route: "random-shogi" },
  { label: "Four-Tile Mahjong", directory: "yonmai-mahjong-web", route: "yonmai-mahjong" }
];

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
    stdio: "inherit"
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
}

try {
  rmSync(stagingRoot, { recursive: true, force: true });

  for (const game of embeddedGames) {
    const projectRoot = resolve(webProjectsRoot, game.directory);
    const sourceDist = resolve(projectRoot, "dist");
    const stagingDist = resolve(stagingRoot, game.route);
    const basePath = `/games/${game.route}/`;

    console.log(`\n> Building ${game.label} for ${basePath}`);
    run(npmCommand, ["run", "build"], projectRoot, {
      VITE_BASE_PATH: basePath,
      VITE_EMBEDDED_BUILD: "true"
    });

    if (!existsSync(sourceDist)) throw new Error(`${game.label} dist directory was not created.`);
    mkdirSync(stagingDist, { recursive: true });
    cpSync(sourceDist, stagingDist, { recursive: true });
  }

  console.log("\n> Generating sitemap");
  run(npmCommand, ["run", "seo:sitemap"], portalRoot);

  console.log("\n> Building portal and generating the root service worker");
  run(npmCommand, ["run", "build:portal"], portalRoot);

  console.log("\n> Generating static search landing pages");
  run(npmCommand, ["run", "seo:generate"], portalRoot);
} finally {
  rmSync(stagingRoot, { recursive: true, force: true });
}
