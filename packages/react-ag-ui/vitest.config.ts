import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
    },
    pool: "threads",
    fsModuleCache: true,
  },
});
