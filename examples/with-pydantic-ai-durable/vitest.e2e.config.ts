import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.e2e.test.tsx"],
  },
});
