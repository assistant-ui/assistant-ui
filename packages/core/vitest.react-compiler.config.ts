import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const compiledConverter = fileURLToPath(
  new URL(
    "./dist/react/runtimes/external-message-converter.js",
    import.meta.url,
  ),
);
const compiledInteractables = fileURLToPath(
  new URL("./dist/react/client/Interactables.js", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^\.\/external-message-converter$/,
        replacement: compiledConverter,
      },
      {
        find: /^\.\/Interactables$/,
        replacement: compiledInteractables,
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "src/react/runtimes/**/external-message-converter.test.tsx",
      "src/react/client/Interactables.compiled.test.tsx",
    ],
  },
});
