import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/ui",
  cacheDir: "../../node_modules/.vite/flue-ui",
  plugins: [tailwindcss()],
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom", "@assistant-ui/react"],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8791",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
});
