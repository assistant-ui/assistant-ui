import { test } from "node:test";
import { assertBuildCacheRestores } from "../../scripts/lib/turbo-build-cache-fixture.mjs";

test("MCP cache hits restore the nested Next production build without dev or cache files", (t) => {
  assertBuildCacheRestores(
    t,
    "examples/with-mcp",
    [
      "app/.next/BUILD_ID",
      "app/.next/server/app/index.html",
      "app/.next/static/chunks/app.js",
      "dist/inherited.js",
    ],
    ["app/.next/cache/webpack/data", "app/.next/dev/server.js"],
  );
});
