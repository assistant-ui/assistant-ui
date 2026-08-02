import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      ASSISTANT_UI_MCP_TELEMETRY: "false",
    },
  },
  resolve: {
    extensions: [".js", ".ts", ".json"],
  },
});
