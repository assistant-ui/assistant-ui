import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { coverageRuntimes } from "./coverage-runtimes.mjs";

const group = (name, output, cache = "miss, executing") =>
  [
    `##[group]${name}:test:coverage`,
    `cache ${cache} 1234`,
    ...output,
    "##[endgroup]",
  ]
    .map((line) => `2026-11-05T05:50:00.000Z ${line}`)
    .join("\n");

test("combines sequential runners per task before taking the uncached median", () => {
  const first = [
    group("a", [
      "\u001b[2m   Duration \u001b[22m 1.20s (tests 50%, import 50%)",
      "Duration 300ms (tests 100%)",
      "ℹ duration_ms 500",
    ]),
    group("b", ["# duration_ms 125"]),
  ].join("\n");
  const second = group("a", ["Duration 4.00s (tests 100%)"]);
  const cached = group(
    "a",
    ["Duration 999.00s (tests 100%)"],
    "hit, replaying logs",
  );
  assert.deepEqual(coverageRuntimes([first, second, cached]), {
    a: 3000,
    b: 125,
  });
  assert.deepEqual(coverageRuntimes([second, cached, first]), {
    a: 3000,
    b: 125,
  });
});

test("ignores build groups and keeps test names mentioning cache hits", () => {
  const log = [
    "##[group]a:build",
    "cache miss, executing 1234",
    "Duration 999s (tests 100%)",
    "##[endgroup]",
    group("a", ["✔ cache hits restore build output", "ℹ duration_ms 1500"]),
    group("a", ["ℹ duration_ms 500"]),
    group("a", ["ℹ duration_ms 1000"]),
  ].join("\n");
  assert.deepEqual(coverageRuntimes([log]), { a: 1000 });
});

test("rejects cached-only, missing and incomplete measurements", () => {
  for (const logs of [
    [],
    [group("a", ["Duration 2s (tests 100%)"], "hit, replaying logs")],
  ]) {
    assert.throws(
      () => coverageRuntimes(logs),
      /No uncached coverage runtimes/,
    );
  }
  for (const output of [[], ["Duration 0ms (tests 100%)"]]) {
    assert.throws(
      () => coverageRuntimes([group("a", output)]),
      /no positive runtime summary/,
    );
  }
});

test("the CLI reads log files and emits the runtime profile", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "coverage-runtimes-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const log = path.join(dir, "coverage.log");
  writeFileSync(log, group("a", ["Duration 1.25s (tests 100%)"]));
  const script = fileURLToPath(
    new URL("./coverage-runtimes.mjs", import.meta.url),
  );
  assert.deepEqual(
    JSON.parse(
      execFileSync(process.execPath, [script, log], { encoding: "utf8" }),
    ),
    { a: 1250 },
  );
  assert.throws(
    () => execFileSync(process.execPath, [script], { stdio: "pipe" }),
    /Supply coverage job log paths/,
  );
});
