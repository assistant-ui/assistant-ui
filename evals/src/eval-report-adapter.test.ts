import { describe, expect, it } from "vitest";
import {
  validateEvalReport,
  rowMatchedExpectation,
} from "@icodenet/eval-dashboards";
import { createDashboardArtifact } from "./eval-report-adapter.ts";
import type { CaseResult } from "./types.ts";
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
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const fixture = (): CaseResult[] => [
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
        passRate: 0,
        trials: [
          {
            verdict: { pass: false, reason: "Stale comment remains" },
            artifact: "// old comment",
          },
        ],
      },
      {
        candidate: { label: "guided", prompt: "Remove stale comments" },
        passRate: 1,
        trials: [
          {
            verdict: { pass: true, reason: "No stale comments" },
            artifact: "const timeout = 1000;",
          },
        ],
      },
    ],
  },
];

describe("dashboard artifact", () => {
  it("invalidates the previous artifact before an invalid CLI invocation fails", () => {
    const temp = mkdtempSync(join(tmpdir(), "aui-eval-cli-"));
    const root = fileURLToPath(new URL("../", import.meta.url));
    try {
      cpSync(join(root, "src"), join(temp, "src"), { recursive: true });
      writeFileSync(join(temp, "package.json"), '{"type":"module"}');
      symlinkSync(
        join(root, "node_modules"),
        join(temp, "node_modules"),
        "dir",
      );
      mkdirSync(join(temp, ".evals_output/live"), { recursive: true });
      const previous = join(temp, ".evals_output/live/latest.json");
      writeFileSync(previous, '{"stale":true}');
      const result = spawnSync(process.execPath, [join(temp, "src/cli.ts")], {
        env: { ...process.env, TRIALS: "0" },
        encoding: "utf8",
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("TRIALS must be a positive integer");
      expect(existsSync(previous)).toBe(false);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
  it("preserves scored trial evidence and baseline expectations in a valid artifact", () => {
    const report = createDashboardArtifact(fixture());
    expect(validateEvalReport(report).ok).toBe(true);
    expect(report.rows).toHaveLength(2);
    expect(report.rows.map((row) => row.passed)).toEqual([false, true]);
    expect(report.rows.map(rowMatchedExpectation)).toEqual([true, true]);
    expect(report.rows[0]?.judgeReasoning).toBe("Stale comment remains");
    expect(report.suites[0]).toMatchObject({ total: 2, passed: 1, failed: 1 });
  });
  it("does not count an errored baseline trial or an empty candidate as expected success", () => {
    const results = fixture();
    results[0]!.variants[0]!.trials = [
      { error: true, message: "CLI timeout", artifact: "" },
    ];
    results[0]!.variants[1]!.trials = [];
    const report = createDashboardArtifact(results);
    expect(report.rows.map(rowMatchedExpectation)).toEqual([false, false]);
    expect(report.rows.every((row) => row.metadata?.executionError)).toBe(true);
    expect(report.rows[0]?.judgeVerdict).toBeUndefined();
  });
  it("keeps row identities stable across input order and changes version hashes when evidence changes", () => {
    const original = createDashboardArtifact(fixture());
    const changed = fixture();
    changed[0]!.variants.reverse();
    changed[0]!.case.rubric = "A different rubric";
    const report = createDashboardArtifact(changed);
    expect(report.rows.map((row) => row.id).sort()).toEqual(
      original.rows.map((row) => row.id).sort(),
    );
    expect(report.suiteManifests?.[0]?.rubricVersion).not.toBe(
      original.suiteManifests?.[0]?.rubricVersion,
    );
    expect(report.suiteManifests?.[0]?.datasetVersion).toBe(
      original.suiteManifests?.[0]?.datasetVersion,
    );
  });
  it("rejects empty selections instead of producing an apparently successful empty report", () => {
    expect(() => createDashboardArtifact([])).toThrow(/requires/);
    const results = fixture();
    results[0]!.variants = [];
    expect(() => createDashboardArtifact(results)).toThrow(/requires/);
  });
});
