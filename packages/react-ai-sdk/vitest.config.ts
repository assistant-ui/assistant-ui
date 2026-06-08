import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "#mcp-stdio": fileURLToPath(
        new URL("./src/mcp-stdio.node.ts", import.meta.url),
      ),
    },
  },
});
