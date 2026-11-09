import react from "@vitejs/plugin-react";
import { remoteComponents } from "@assistant-ui/remote-components-vite";
import * as vite from "vite";
import { defineConfig } from "vite";
import { servePages } from "./serve-pages.js";

/**
 * Remote components: http://127.0.0.1:5181/<name>/ (each component as a
 * plain React page), plus arbitrary pages through the serving layer
 * (serve-pages.ts).
 */
export default defineConfig({
  plugins: [
    react(),
    servePages(vite),
    remoteComponents({
      components: "components",
      singleFile: { plugins: [react()] },
    }),
  ],
  server: { host: "127.0.0.1", port: 5181, strictPort: true },
  preview: { host: "127.0.0.1", port: 5181, strictPort: true },
  build: { outDir: "dist-remote", emptyOutDir: true, target: "es2022" },
  logLevel: "warn",
  clearScreen: false,
});
