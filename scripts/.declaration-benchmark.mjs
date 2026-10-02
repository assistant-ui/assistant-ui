import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const rows = [];
const testPath = "scripts/.declarations-baseline.test.mjs";
writeFileSync(
  testPath,
  readFileSync(testPath, "utf8").replace(
    'from "./check-built-declarations.mjs"',
    'from "./.declarations-baseline.mjs"',
  ),
);
for (const mode of ["baseline", "parallel", "parallel", "baseline"]) {
  const start = performance.now();
  const result = spawnSync(
    process.execPath,
    [
      mode === "baseline"
        ? "scripts/.declarations-baseline.mjs"
        : "scripts/check-built-declarations.mjs",
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const seconds = (performance.now() - start) / 1000;
  const suiteStart = performance.now();
  const tests = spawnSync(
    process.execPath,
    [
      "--test",
      mode === "baseline"
        ? testPath
        : "scripts/check-built-declarations.test.mjs",
    ],
    { encoding: "utf8" },
  );
  assert.equal(tests.status, 0, tests.stdout + tests.stderr);
  const testSeconds = (performance.now() - suiteStart) / 1000;
  rows.push({
    mode,
    seconds,
    testSeconds,
    totalSeconds: seconds + testSeconds,
    packages: result.stdout.split("Checking ").length - 1,
    hash: createHash("sha256")
      .update(result.stdout + result.stderr)
      .digest("hex"),
  });
}
assert.equal(new Set(rows.map((row) => row.hash)).size, 1);
const brokenPath = "packages/tap/dist/index.d.ts";
const original = readFileSync(brokenPath, "utf8");
try {
  writeFileSync(
    brokenPath,
    original +
      "\nexport declare const brokenDeclaration: MissingBenchmarkType;\n",
  );
  const failures = [
    "scripts/.declarations-baseline.mjs",
    "scripts/check-built-declarations.mjs",
  ].map((script) =>
    spawnSync(process.execPath, [script, "--filter=@assistant-ui/tap"], {
      encoding: "utf8",
    }),
  );
  for (const failure of failures) {
    assert.equal(failure.status, 1);
    assert.match(failure.stdout, /MissingBenchmarkType/);
  }
  assert.equal(failures[0].stdout, failures[1].stdout);
  assert.equal(failures[0].stderr, failures[1].stderr);
} finally {
  writeFileSync(brokenPath, original);
}
console.log(JSON.stringify(rows, null, 2));
writeFileSync(
  "declaration-benchmark.json",
  JSON.stringify(
    {
      repeat: process.env.REPEAT,
      node: process.version,
      rows,
      brokenDeclaration: "both rejected with identical diagnostics",
    },
    null,
    2,
  ),
);
