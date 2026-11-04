import { test } from "node:test";
import { assertBuildCacheRestores } from "../../scripts/lib/turbo-build-cache-fixture.mjs";

test("SvelteKit cache hits restore production output without generated development state", (t) => {
  assertBuildCacheRestores(
    t,
    "examples/with-sveltekit",
    [
      ".svelte-kit/output/server/index.js",
      ".svelte-kit/output/server/manifest.js",
      ".svelte-kit/output/client/_app/immutable/start.js",
      "build/inherited.js",
    ],
    [".svelte-kit/generated/client/app.js"],
  );
});
