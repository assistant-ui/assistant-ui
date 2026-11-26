import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@/lib": fileURLToPath(new URL("./lib", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
    coverage: {
      include: ["app/**/*.ts", "lib/**/*.ts"],
    },
  },
});
