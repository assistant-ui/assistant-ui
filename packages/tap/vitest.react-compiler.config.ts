import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const compiledCompilerRuntime = fileURLToPath(
  new URL("./dist/react-shim/compiler-runtime.js", import.meta.url),
);
const compiledIndex = fileURLToPath(
  new URL("./dist/index.js", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^\.\/compiler-runtime$/,
        replacement: compiledCompilerRuntime,
      },
      {
        find: /^\.\.\/index$/,
        replacement: compiledIndex,
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/react-shim/compiler-runtime.react-compiler.test.tsx"],
  },
});
