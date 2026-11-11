import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// @ts-expect-error type error without @types/node package
import process from "node:process";
// @ts-expect-error type error without @types/node package
import { rmSync } from "node:fs";
const host = process.env.TAURI_DEV_HOST;

/**
 * public/downloads holds the Windows installer that the web serves for the landing's download button.
 * The desktop app must not ship a copy of its own installer, so Tauri builds drop it from dist.
 */
const excludeDownloadsFromDesktop = {
  name: "nexo-exclude-downloads-from-desktop",
  apply: "build" as const,
  closeBundle() {
    if (process.env.TAURI_ENV_PLATFORM) rmSync("dist/downloads", { recursive: true, force: true });
  },
};

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), excludeDownloadsFromDesktop],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
