// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
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
  plugins: [
    embeddedGamesDevServer(),
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "pwa-192.png", "pwa-512.png", "pwa-maskable-512.png"],
      manifest: {
        name: "Game Shelf - Browser Game Collection",
        short_name: "Game Shelf",
        description: "A growing collection of browser games you can play instantly.",
        theme_color: "#101516",
        background_color: "#101516",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        categories: ["games", "entertainment"],
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        shortcuts: [
          { name: "Random Shogi", short_name: "Shogi", url: "/games/random-shogi/", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
          { name: "Four-Tile Mahjong", short_name: "Mahjong", url: "/games/yonmai-mahjong/", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
          { name: "2048", url: "/play/2048/", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] }
        ]
      },
      workbox: {
        clientsClaim: false,
        skipWaiting: false,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{html,js,css,json,png,svg,webp,wasm,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/games\//,
          /^\/privacy\.html$/,
          /^\/sitemap\.xml$/,
          /^\/robots\.txt$/
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.googletagmanager\.com\//,
            handler: "NetworkOnly"
          },
          {
            urlPattern: /^https:\/\/www\.google-analytics\.com\//,
            handler: "NetworkOnly"
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ]
});
