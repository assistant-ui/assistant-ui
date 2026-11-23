import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "lib/**/*.e2e.test.tsx"],
  },
});
