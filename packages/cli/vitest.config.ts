import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      thresholds: {
        lines: 79,
        functions: 88,
        branches: 70,
        statements: 77,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/codemods/**"],
    },
  },
});
