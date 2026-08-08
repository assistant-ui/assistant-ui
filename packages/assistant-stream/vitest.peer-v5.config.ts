import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

// Runs the same suite against the ioredis 5 leg of the peer union, so both
// advertised majors get runtime coverage rather than only a type check.
export default mergeConfig(
  base,
  defineConfig({
    resolve: {
      alias: [
        {
          find: /^ioredis$/,
          replacement: fileURLToPath(
            new URL("./node_modules/ioredis-v5", import.meta.url),
          ),
        },
        {
          find: /^ioredis\/(.*)$/,
          replacement: fileURLToPath(
            new URL("./node_modules/ioredis-v5/$1", import.meta.url),
          ),
        },
      ],
    },
  }),
);
