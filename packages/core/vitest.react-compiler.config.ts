import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const compiledConverter = fileURLToPath(
  new URL(
    "./dist/react/runtimes/external-message-converter.js",
    import.meta.url,
  ),
);

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^\.\/external-message-converter$/,
        replacement: compiledConverter,
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/react/runtimes/**/external-message-converter.test.tsx"],
  },
});
