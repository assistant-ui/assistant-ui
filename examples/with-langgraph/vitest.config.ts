import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/components/assistant-ui/": new URL(
        "../../packages/ui/src/components/assistant-ui/",
        import.meta.url,
      ).pathname,
      "@/components/ui/": new URL(
        "../../packages/ui/src/components/ui/",
        import.meta.url,
      ).pathname,
      "@/lib/utils": new URL(
        "../../packages/ui/src/lib/utils.ts",
        import.meta.url,
      ).pathname,
      "@": new URL("./", import.meta.url).pathname,
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["app/**/*.test.{ts,tsx}"],
  },
});
