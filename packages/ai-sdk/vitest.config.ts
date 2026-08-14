import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));
const mcpStdioNode = resolve(packageRoot, "src/tools/mcp-stdio.node.ts");
const standaloneShim = resolve(
  packageRoot,
  "../tap/dist/standalone-shim/index.js",
);

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "#mcp-stdio": mcpStdioNode,
          },
        },
        test: {
          name: "default",
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      {
        // Proves the react-less path: `react` resolves to the standalone shim
        // for the whole graph, including the react-shim rewrites inside the
        // core and store dists.
        resolve: {
          alias: [
            { find: "#mcp-stdio", replacement: mcpStdioNode },
            {
              find: /^react\/compiler-runtime$/,
              replacement: resolve(
                packageRoot,
                "../tap/dist/standalone-shim/compiler-runtime.js",
              ),
            },
            {
              find: /^react\/jsx-runtime$/,
              replacement: resolve(
                packageRoot,
                "../tap/dist/standalone-shim/jsx-runtime.js",
              ),
            },
            {
              find: /^react\/jsx-dev-runtime$/,
              replacement: resolve(
                packageRoot,
                "../tap/dist/standalone-shim/jsx-dev-runtime.js",
              ),
            },
            { find: /^react$/, replacement: standaloneShim },
          ],
        },
        test: {
          name: "standalone",
          environment: "node",
          include: ["src/__tests__/**/*.e2e.ts"],
          server: {
            deps: {
              // @ai-sdk/react resolves natively as an external dep by default,
              // which would bypass the react alias; inline it so its hooks
              // route to the shim like the rest of the graph.
              inline: [/@ai-sdk\/react/],
            },
          },
        },
      },
    ],
  },
});
