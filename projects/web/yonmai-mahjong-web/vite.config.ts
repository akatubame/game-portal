import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

declare const process: { env: Record<string, string | undefined> };

const isEmbeddedBuild = process.env.VITE_EMBEDDED_BUILD === "true";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [
    react(),
    ...(!isEmbeddedBuild ? [VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "tiles/*.png"],
      manifest: {
        name: "四枚麻雀",
        short_name: "四枚麻雀",
        description: "四枚の手牌で遊ぶ一人用麻雀ゲーム",
        theme_color: "#123f35",
        background_color: "#071d1a",
        lang: "ja",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
        ]
      }
    })] : [])
  ]
});
