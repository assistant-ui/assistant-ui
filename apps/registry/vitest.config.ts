import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  // Template routes must share SDK module identities with the test's mocks.
  resolve: {
    alias: {
      ai: require.resolve("ai"),
      "@ai-sdk/openai": require.resolve("@ai-sdk/openai"),
      "@assistant-ui/ai-sdk": require.resolve("@assistant-ui/ai-sdk"),
      "assistant-stream/resumable":
        require.resolve("assistant-stream/resumable"),
      "@/lib/document-editor": fileURLToPath(
        new URL(
          "./blocks/agent-document-editor/lib/document-editor",
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
    include: ["app/**/*.test.ts", "blocks/**/*.test.ts"],
    clearMocks: true,
  },
});
