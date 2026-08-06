import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^react\/compiler-runtime$/,
        replacement: resolve(
          packageRoot,
          "src/standalone-shim/compiler-runtime.ts",
        ),
      },
      {
        find: /^react$/,
        replacement: resolve(packageRoot, "src/standalone-shim/index.ts"),
      },
    ],
  },
  test: {
    name: "standalone",
    environment: "node",
    include: ["src/__tests__/**/*.e2e.ts"],
    globals: true,
  },
});
