import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/templates/**", "**/smoke.test.ts"],
  },
});
