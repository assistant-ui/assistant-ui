import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

export default mergeConfig(
  base,
  defineConfig({
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
  }),
);
