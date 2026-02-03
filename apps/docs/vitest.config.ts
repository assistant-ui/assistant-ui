import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: [
      {
        find: "@/components/assistant-ui",
        replacement: path.resolve(
          __dirname,
          "../../packages/ui/src/components/assistant-ui",
        ),
      },
      {
        find: "@/components/ui",
        replacement: path.resolve(
          __dirname,
          "../../packages/ui/src/components/ui",
        ),
      },
      { find: "@", replacement: path.resolve(__dirname, ".") },
    ],
  },
});
