import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      ASSISTANT_UI_MCP_TELEMETRY: "false",
      ASSISTANT_UI_MCP_SERVER_VERSION: "0.2.0",
    },
  },
  resolve: {
    extensions: [".js", ".ts", ".json"],
  },
});
