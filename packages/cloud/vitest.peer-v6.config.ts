import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^ai$/,
        replacement: fileURLToPath(
          new URL("./node_modules/ai-v6", import.meta.url),
        ),
      },
      {
        find: /^ai\/(.*)$/,
        replacement: fileURLToPath(
          new URL("./node_modules/ai-v6/$1", import.meta.url),
        ),
      },
    ],
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
});
