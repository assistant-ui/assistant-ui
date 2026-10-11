import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  rowMatchedExpectation,
  validateEvalReport,
} from "@icodenet/eval-dashboards";
import { createDashboardArtifact } from "./eval-report-adapter.ts";
import type { CaseResult } from "./types.ts";
import type {
  Candidate,
  EvalCase,
  Judged,
} from "./suites/comment-hygiene/types.ts";

type CommentHygieneResult = CaseResult<EvalCase, Candidate, Judged>;

const fixture = (): CommentHygieneResult[] => [
  {
    case: {
      id: "comment-hygiene",
      description: "Remove obsolete comments",
      task: "Update configuration",
      rubric: "No stale comments",
      seed: [],
      inspect: ["config.ts"],
    },
    variants: [
      {
        candidate: { label: "baseline", prompt: "" },
        trials: [
          {
            outcome: {
              verdict: { pass: false, reason: "Stale comment remains" },
              artifact: "// old comment",
            },
          },
        ],
      },
      {
        candidate: { label: "guided", prompt: "Remove stale comments" },
        trials: [
          {
            outcome: {
              verdict: { pass: true, reason: "No stale comments" },
              artifact: "const timeout = 1000;",
            },
          },
        ],
      },
    ],
  },
];

test("invalidates the previous artifact before an invalid CLI invocation fails", () => {
  const temp = mkdtempSync(join(tmpdir(), "aui-eval-cli-"));
  const root = fileURLToPath(new URL("../", import.meta.url));
  try {
    cpSync(join(root, "src"), join(temp, "src"), { recursive: true });
    writeFileSync(join(temp, "package.json"), '{"type":"module"}');
    symlinkSync(join(root, "node_modules"), join(temp, "node_modules"), "dir");
    mkdirSync(join(temp, ".evals_output/live"), { recursive: true });
    const previous = join(temp, ".evals_output/live/latest.json");
    writeFileSync(previous, '{"stale":true}');
    const result = spawnSync(process.execPath, [join(temp, "src/cli.ts")], {
      env: { ...process.env, TRIALS: "0" },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /TRIALS must be a positive integer/);
    assert.equal(existsSync(previous), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("preserves scored trial evidence and baseline expectations", () => {
  const report = createDashboardArtifact(fixture());
  assert.equal(validateEvalReport(report).ok, true);
  assert.equal(report.rows.length, 2);
  assert.deepEqual(
    report.rows.map((row) => row.passed),
    [false, true],
  );
  assert.deepEqual(report.rows.map(rowMatchedExpectation), [true, true]);
  assert.equal(report.rows[0]?.judgeReasoning, "Stale comment remains");
  assert.deepEqual(report.suites[0], {
    ...report.suites[0],
    total: 2,
    passed: 1,
    failed: 1,
  });
});

test("does not count an errored baseline trial or empty candidate as expected success", () => {
  const results = fixture();
  results[0]!.variants[0]!.trials = [{ error: true, message: "CLI timeout" }];
  results[0]!.variants[1]!.trials = [];
  const report = createDashboardArtifact(results);
  assert.deepEqual(report.rows.map(rowMatchedExpectation), [false, false]);
  assert.ok(report.rows.every((row) => row.metadata?.executionError));
  assert.equal(report.rows[0]?.judgeVerdict, undefined);
});

test("keeps row identities stable and changes rubric hashes with evidence", () => {
  const original = createDashboardArtifact(fixture());
  const changed = fixture();
  changed[0]!.variants.reverse();
  changed[0]!.case.rubric = "A different rubric";
  const report = createDashboardArtifact(changed);
  assert.deepEqual(
    report.rows.map((row) => row.id).sort(),
    original.rows.map((row) => row.id).sort(),
  );
  assert.notEqual(
    report.suiteManifests?.[0]?.rubricVersion,
    original.suiteManifests?.[0]?.rubricVersion,
  );
  assert.equal(
    report.suiteManifests?.[0]?.datasetVersion,
    original.suiteManifests?.[0]?.datasetVersion,
  );
});

test("rejects empty selections", () => {
  assert.throws(() => createDashboardArtifact([]), /requires/);
  const results = fixture();
  results[0]!.variants = [];
  assert.throws(() => createDashboardArtifact(results), /requires/);
});
