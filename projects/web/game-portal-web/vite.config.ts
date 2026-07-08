// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, statSync, createReadStream } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const portalRoot = dirname(fileURLToPath(import.meta.url));
const webProjectsRoot = resolve(portalRoot, "..");

const embeddedDevRoutes = [
  {
    route: "/games/random-shogi/",
    distDir: resolve(webProjectsRoot, "random-shogi-web", "dist")
  },
  {
    route: "/games/yonmai-mahjong/",
    distDir: resolve(webProjectsRoot, "yonmai-mahjong-web", "dist")
  }
];

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function embeddedGamesDevServer() {
  return {
    name: "embedded-games-dev-server",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestUrl = req.url?.split("?")[0] ?? "/";
        const route = embeddedDevRoutes.find((entry) => requestUrl === entry.route.slice(0, -1) || requestUrl.startsWith(entry.route));

        if (!route) {
          next();
          return;
        }

        if (!existsSync(route.distDir)) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(`<!doctype html><meta charset="utf-8"><title>Embedded game is not built</title><body><h1>Embedded game is not built</h1><p>Run <code>npm run build:embedded-games</code> before opening this route in the local dev server.</p></body>`);
          return;
        }

        const relativePath = requestUrl === route.route.slice(0, -1)
          ? "index.html"
          : decodeURIComponent(requestUrl.slice(route.route.length)) || "index.html";
        const safeRelativePath = relativePath.replace(/^[/\\]+/, "");
        let filePath = resolve(join(route.distDir, safeRelativePath));

        if (!filePath.startsWith(route.distDir)) {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }

        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          filePath = join(route.distDir, "index.html");
        }

        if (!existsSync(filePath)) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }

        res.setHeader("Content-Type", mimeTypes[extname(filePath)] ?? "application/octet-stream");
        createReadStream(filePath).pipe(res);
      });
    }
  };
}

export default defineConfig({
  plugins: [embeddedGamesDevServer(), react()]
});
