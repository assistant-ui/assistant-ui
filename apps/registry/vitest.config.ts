import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  // Template routes must share SDK module identities with the test's mocks.
  resolve: {
    alias: {
      "ai/test": require.resolve("ai/test"),
      ai: require.resolve("ai"),
      "@ai-sdk/openai": require.resolve("@ai-sdk/openai"),
      "@assistant-ui/ai-sdk": require.resolve("@assistant-ui/ai-sdk"),
      "assistant-stream/resumable":
        require.resolve("assistant-stream/resumable"),
      // The google-adk example's server helper, read from source so the
      // example test does not need that package built.
      "@assistant-ui/react-google-adk/server": fileURLToPath(
        new URL(
          "../../packages/react-google-adk/src/server/index.ts",
          import.meta.url,
        ),
      ),
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
