import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    },
  },
});
