import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 部署在 /WoT/ 子路徑;舊版《南方祖記》(Phaser)保留在 /WoT/legacy/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/WoT/" : "/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        legacy: resolve(import.meta.dirname, "legacy/index.html"),
      },
    },
  },
}));
