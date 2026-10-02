import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**", "components/**", "lib/**"],
    },
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
