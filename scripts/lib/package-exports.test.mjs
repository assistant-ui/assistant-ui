import assert from "node:assert/strict";
import test from "node:test";
import { collectTypeTargets } from "./package-exports.mjs";

test("collectTypeTargets preserves condition paths and export order", () => {
  assert.deepEqual(
    collectTypeTargets({
      import: { types: "./dist/import.d.ts", default: "./dist/import.js" },
      require: { node: { types: "./dist/require.d.cts" } },
    }),
    [
      { conditions: ["import"], typePath: "./dist/import.d.ts" },
      {
        conditions: ["require", "node"],
        typePath: "./dist/require.d.cts",
      },
    ],
  );
});

test("non-string types stop generation but declaration checks continue descending", () => {
  const value = {
    types: { nested: "ignored" },
    default: { types: "./dist/index.d.ts" },
  };
  assert.deepEqual(collectTypeTargets(value), []);
  assert.deepEqual(collectTypeTargets(value, [], { stopAtTypesKey: false }), [
    { conditions: ["default"], typePath: "./dist/index.d.ts" },
  ]);
  assert.deepEqual(collectTypeTargets(null), []);
});
