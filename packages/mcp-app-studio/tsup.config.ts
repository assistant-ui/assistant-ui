import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/sdk.ts",
      "cli/index": "src/cli/index.ts",
      "core/index": "src/core/index.ts",
      "platforms/mcp/index": "src/platforms/mcp/index.ts",
    },
    format: ["esm"],
    dts: true,
    clean: true,
    external: ["react", "@modelcontextprotocol/ext-apps"],
  },
]);
