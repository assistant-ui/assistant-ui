import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
    },
    globals: true,
    environment: "node",
  },
  resolve: {
    extensions: [".js", ".ts", ".json"],
  },
});
