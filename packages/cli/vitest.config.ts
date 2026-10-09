import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      thresholds: {
        lines: 80,
        functions: 83,
        branches: 70,
        statements: 78,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/codemods/**"],
    },
  },
});
