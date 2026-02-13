/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: ["chrome105", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    outDir: "dist",
    rollupOptions: {
      output: {
        // Vendor chunks for better caching; Orb (three/drei) is unused so not in bundle
        manualChunks: (id) => {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) return "react";
          if (id.includes("node_modules/@tauri-apps/")) return "tauri";
          if (id.includes("node_modules/framer-motion")) return "framer-motion";
          if (id.includes("node_modules/lucide-react")) return "lucide";
        },
      },
    },
  },
});
