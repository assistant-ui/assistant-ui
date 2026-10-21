import assert from "node:assert/strict";
import test from "node:test";
import { compareToBaseline, groupReport } from "./check-knip.mjs";

const emptyTypes = {
  owners: [],
  dependencies: [],
  duplicates: [],
  enumMembers: [],
  exports: [],
  types: [],
};

test("groups issues by type and file with stable names", () => {
  const report = {
    issues: [
      {
        ...emptyTypes,
        file: "packages/b/src/index.ts",
        owners: [{ name: "@team" }],
        exports: [
          { name: "zeta", line: 9 },
          { name: "alpha", line: 2 },
        ],
        duplicates: [[{ name: "hitl" }, { name: "hitlTool" }]],
        enumMembers: [{ namespace: "Mode", name: "Legacy" }],
      },
      {
        ...emptyTypes,
        file: "packages/a/package.json",
        dependencies: [{ name: "left-pad" }],
      },
    ],
  };

  assert.deepEqual(groupReport(report), {
    dependencies: { "packages/a/package.json": ["left-pad"] },
    duplicates: { "packages/b/src/index.ts": ["hitl | hitlTool"] },
    enumMembers: { "packages/b/src/index.ts": ["Mode.Legacy"] },
    exports: { "packages/b/src/index.ts": ["alpha", "zeta"] },
  });
});

test("line moves do not change the grouped report", () => {
  const at = (line) => ({
    issues: [{ ...emptyTypes, file: "a.ts", exports: [{ name: "x", line }] }],
  });
  assert.deepEqual(compareToBaseline(groupReport(at(3)), groupReport(at(40))), {
    added: [],
    removed: [],
  });
});

test("reports new and resolved entries against the baseline", () => {
  const baseline = {
    exports: { "a.ts": ["kept", "gone"] },
    types: { "b.ts": ["Old"] },
  };
  const current = {
    exports: { "a.ts": ["kept", "fresh"] },
    unlisted: { "c.ts": ["react"] },
  };
  assert.deepEqual(compareToBaseline(current, baseline), {
    added: ["exports: a.ts: fresh", "unlisted: c.ts: react"],
    removed: ["exports: a.ts: gone", "types: b.ts: Old"],
  });
});
