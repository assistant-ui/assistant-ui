import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { coverageRuntimes } from "./coverage-runtimes.mjs";

const workspaces = new Map([
  ["a", "packages/a"],
  ["b", "packages/b"],
]);

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
  assert.deepEqual(coverageRuntimes([first, second, cached], workspaces), {
    a: 3000,
    b: 125,
  });
  assert.deepEqual(coverageRuntimes([second, cached, first], workspaces), {
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
  assert.deepEqual(coverageRuntimes([log], workspaces), { a: 1000 });
});

test("rejects cached-only, missing and incomplete measurements", () => {
  for (const logs of [
    [],
    [group("a", ["Duration 2s (tests 100%)"], "hit, replaying logs")],
  ]) {
    assert.throws(
      () => coverageRuntimes(logs, workspaces),
      /No uncached coverage runtimes/,
    );
  }
  for (const output of [[], ["Duration 0ms (tests 100%)"]]) {
    assert.throws(
      () => coverageRuntimes([group("a", output)], workspaces),
      /no positive runtime summary/,
    );
  }
});

test("a runner directory disambiguates masked coverage tasks", () => {
  const workspaces = new Map([
    ["@assistant-ui/docs-site", "apps/docs"],
    ["@other/docs-site", "apps/other"],
  ]);
  const masked = group("@***/docs-site", [
    " RUN  v5.0.5 /home/runner/work/***/***/apps/docs",
    "Duration 1s (tests 100%)",
  ]);
  const unmasked = group("@assistant-ui/docs-site", ["# duration_ms 3000"]);
  assert.deepEqual(coverageRuntimes([masked, unmasked], workspaces), {
    "@assistant-ui/docs-site": 2000,
  });
});

test("rejects ambiguous or unknown fresh task names and ignores cache replays", () => {
  const sample = (name) => group(name, ["# duration_ms 500"]);
  for (const name of ["***", "unknown"]) {
    assert.throws(
      () => coverageRuntimes([sample(name)], workspaces),
      /workspace/,
    );
  }
  const root = " RUN  v5.0.5 /home/runner/work/***/***/packages/a";
  const identified = group("***", [root, "# duration_ms 500"]);
  const nextGroupHasNoRoot = [identified, sample("***")].join("\n");
  assert.throws(
    () => coverageRuntimes([nextGroupHasNoRoot], workspaces),
    /workspace/,
  );
  assert.deepEqual(
    coverageRuntimes(
      [group("***", [], "hit, replaying logs"), sample("a")],
      workspaces,
    ),
    { a: 500 },
  );
});

test("the CLI refreshes the masked docs-site weight and retains unsampled workspaces", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "coverage-runtimes-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const log = path.join(dir, "coverage.log");
  writeFileSync(
    log,
    group("@***/docs-site", [
      " RUN  v5.0.5 /home/runner/work/***/***/apps/docs",
      "Duration 1.25s (tests 100%)",
    ]),
  );
  const script = fileURLToPath(
    new URL("./coverage-runtimes.mjs", import.meta.url),
  );
  const previous = JSON.parse(
    readFileSync(new URL("./coverage-runtimes.json", import.meta.url)),
  );
  const profile = JSON.parse(
    execFileSync(process.execPath, [script, log], { encoding: "utf8" }),
  );
  assert.equal(profile["@assistant-ui/docs-site"], 1250);
  assert.equal(profile["@assistant-ui/react"], previous["@assistant-ui/react"]);
  assert.ok(!Object.hasOwn(profile, "@***/docs-site"));
  assert.throws(
    () => execFileSync(process.execPath, [script], { stdio: "pipe" }),
    /Supply coverage job log paths/,
  );
});
