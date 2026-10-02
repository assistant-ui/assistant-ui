import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
    },
    globals: true,
    environment: "node",
  },
  resolve: {
    extensions: [".js", ".ts", ".json"],
  },
});
