import { defineConfig } from "vitest/config";
import { aui } from "@assistant-ui/vite";

export default defineConfig({
  plugins: [aui()],
  test: {
    coverage: {
      include: ["src/**"],
      exclude: ["src/tests/**"],
    },
    environment: "node",
    globals: true,
    passWithNoTests: true,
  },
});
