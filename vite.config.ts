/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  clearScreen: false,
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
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;

          const reactPackages = [
            "node_modules/react/",
            "node_modules/react-dom/",
            "node_modules/scheduler/",
          ];
          if (reactPackages.some((pkg) => id.includes(pkg))) {
            return "vendor-react";
          }

          if (id.includes("node_modules/react-router/") || id.includes("node_modules/@remix-run/")) {
            return "vendor-router";
          }

          if (id.includes("@videojs") || id.includes("video.js") || id.includes("@videojs/react")) {
            return "vendor-video";
          }

          if (
            id.includes("radix-ui") ||
            id.includes("lucide-react") ||
            id.includes("class-variance-authority") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge") ||
            id.includes("tw-animate-css")
          ) {
            return "vendor-ui";
          }

          if (id.includes("@tauri-apps")) {
            return "vendor-tauri";
          }

          if (id.includes("i18next")) {
            return "vendor-i18n";
          }

          return "vendor-common";
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
