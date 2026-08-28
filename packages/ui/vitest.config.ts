import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
  },
  resolve: {
    alias: {
      "@/components/assistant-ui": resolve(
        __dirname,
        "src/components/react/assistant-ui",
      ),
      "@/components/ui/radix": resolve(
        __dirname,
        "src/components/react/ui/radix",
      ),
      "@/components/ui": resolve(__dirname, "src/components/react/ui/base"),
      "@": resolve(__dirname, "src"),
    },
  },
});
