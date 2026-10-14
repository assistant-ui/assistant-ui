import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      thresholds: {
        lines: 78,
        functions: 82,
        branches: 69,
        statements: 76,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/codemods/**"],
    },
  },
});
