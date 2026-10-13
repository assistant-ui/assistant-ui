import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  // Templates share this harness without installing their own SDK copies.
  resolve: {
    alias: {
      ai: require.resolve("ai"),
      "@ai-sdk/openai": require.resolve("@ai-sdk/openai"),
      "@assistant-ui/ai-sdk": require.resolve("@assistant-ui/ai-sdk"),
      "assistant-stream/resumable":
        require.resolve("assistant-stream/resumable"),
      "@/lib/resumable-context": fileURLToPath(
        new URL(
          "./templates/ai-sdk-backend-resumable/lib/resumable-context.ts",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    include: ["app/**/*.test.ts"],
    clearMocks: true,
  },
});
