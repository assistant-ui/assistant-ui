import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { reactCompiler } from "../x-buildutils/src/react-compiler.ts";

const compiledConverter = fileURLToPath(
  new URL(
    "./dist/react/runtimes/external-message-converter.js",
    import.meta.url,
  ),
);
const compiledInteractables = fileURLToPath(
  new URL("./dist/react/client/Interactables.js", import.meta.url),
);
const compiledRuntimeExtras = fileURLToPath(
  new URL("./dist/react/runtimes/createRuntimeExtras.js", import.meta.url),
);

export default defineConfig({
  plugins: [reactCompiler()],
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
      {
        find: /^\.\/createRuntimeExtras$/,
        replacement: compiledRuntimeExtras,
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "src/react/runtimes/**/external-message-converter.test.tsx",
      "src/react/client/Interactables.compiled.test.tsx",
      "src/react/runtimes/createRuntimeExtras.compiled.test.tsx",
    ],
  },
});
