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
      {
        find: /^@ai-sdk\/react$/,
        replacement: fileURLToPath(
          new URL("./node_modules/@ai-sdk/react-v3", import.meta.url),
        ),
      },
      {
        find: /^@ai-sdk\/react\/(.*)$/,
        replacement: fileURLToPath(
          new URL("./node_modules/@ai-sdk/react-v3/$1", import.meta.url),
        ),
      },
    ],
  },
});
