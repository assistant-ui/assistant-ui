import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { PROBES } from "../src/readiness/probes.ts";

const passing = PROBES.map((probe) => ({ ...probe, state: "pass" }));
const [first, ...rest] = passing;
const missing = `Missing probes: ${first.id}`;
const duplicate = `Duplicate probes: ${first.id}`;

test("probe runner verdict", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "probe-runner-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(import.meta.dirname, path.join(root, "test"), { recursive: true });
  await cp(new URL("../src", import.meta.url), path.join(root, "src"), {
    recursive: true,
  });
  const launcher = path.join(root, "node_modules", "@vscode", "test-electron");
  await mkdir(launcher, { recursive: true });
  await writeFile(
    path.join(launcher, "index.js"),
    `
    const fs = require("node:fs/promises");
    exports.runTests = async ({ extensionTestsEnv }) => {
      await fs.writeFile(extensionTestsEnv.AUI_TESTBED_REPORT, process.env.REPORT);
      if (process.env.LAUNCH_FAILURE) throw new Error("launcher failed");
    };
  `,
  );

  const cases = [
    {
      name: "empty",
      results: [],
      diagnostics: [`Missing probes: ${passing.map((p) => p.id).join(", ")}`],
    },
    { name: "partial", results: rest, diagnostics: [missing] },
    {
      name: "duplicate",
      results: [...passing, first],
      diagnostics: [duplicate],
    },
    {
      name: "duplicate replacing a missing probe",
      results: [...rest, rest[0]],
      diagnostics: [missing, `Duplicate probes: ${rest[0].id}`],
    },
    {
      name: "unknown",
      results: [...passing, { ...first, id: "unlisted" }],
      diagnostics: ["Unknown probes: unlisted"],
    },
    { name: "complete", results: passing.toReversed(), pass: true },
    {
      name: "pass on retry",
      results: [
        { ...first, firstAttempt: { state: "fail", detail: "first failure" } },
        ...rest,
      ],
      pass: true,
      stdout: "first failure",
    },
    {
      name: "explicit failure",
      results: [{ ...first, state: "fail" }, ...rest],
      stderr: "probe(s) are not passing",
    },
    {
      name: "launch failure after complete report",
      results: passing,
      launchFailure: true,
      stderr: "launcher failed",
    },
  ];
  for (const c of cases) {
    await t.test(c.name, async () => {
      const summaryPath = path.join(root, "summary");
      await writeFile(summaryPath, "");
      const result = { webviewReady: true, results: c.results };
      const { status, stdout, stderr } = spawnSync(
        process.execPath,
        ["test/run.mts"],
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            REPORT: JSON.stringify({ finished: true, result }),
            GITHUB_STEP_SUMMARY: summaryPath,
            LAUNCH_FAILURE: c.launchFailure ? "1" : "",
          },
        },
      );
      assert.equal(status, c.pass ? 0 : 1, stderr || stdout);
      const artifact = JSON.parse(
        await readFile(
          path.join(root, "test-results/probe-report.json"),
          "utf8",
        ),
      );
      assert.equal(artifact.failed, !c.pass);
      assert.deepEqual(artifact.result, result);
      const summary = await readFile(summaryPath, "utf8");
      for (const message of c.diagnostics ?? []) {
        assert.ok(stderr.includes(message), stderr);
        assert.ok(summary.includes(message), summary);
      }
      if (c.stdout) assert.ok(stdout.includes(c.stdout), stdout);
      if (c.stderr) assert.ok(stderr.includes(c.stderr), stderr);
    });
  }
});
