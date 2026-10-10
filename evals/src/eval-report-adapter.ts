import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  createEvalReportArtifact,
  type EvalReportV1,
  type EvalRow,
  type SuiteManifest,
} from "@icodenet/eval-dashboards";
import type { CaseResult } from "./types.ts";

const version = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

export function createDashboardArtifact(
  results: CaseResult[],
  options: {
    generatedAt?: string;
    agentModel?: string;
    judgeModel?: string;
  } = {},
): EvalReportV1 {
  if (!results.length || results.some((result) => !result.variants.length)) {
    throw new Error(
      "An eval dashboard requires at least one case and candidate per case.",
    );
  }
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const rows: EvalRow[] = [];
  const suiteManifests: SuiteManifest[] = [];
  for (const result of results) {
    const datasetVersion = version({
      task: result.case.task,
      seed: result.case.seed,
      inspect: result.case.inspect,
    });
    const rubricVersion = version(result.case.rubric);
    suiteManifests.push({
      name: result.case.id,
      target: "agent",
      datasetSource: "synthetic",
      datasetVersion,
      rubricVersion,
      riskArea: "response-quality",
      graders: ["llm-judge"],
      gate: { mode: "report-only", thresholds: {} },
      description: result.case.description,
    });
    for (const variant of result.variants) {
      const trials = variant.trials.length
        ? variant.trials
        : [
            {
              error: true as const,
              message: "No trials were recorded.",
              artifact: "" as const,
            },
          ];
      trials.forEach((trial, index) => {
        const baseline = variant.candidate.label === "baseline";
        const passed = !trial.error && trial.verdict.pass;
        rows.push({
          id: `${encodeURIComponent(result.case.id)}:${encodeURIComponent(variant.candidate.label)}:trial-${index + 1}`,
          suite: result.case.id,
          kind: "llm-judge",
          passed,
          // A failed invocation is not evidence that the baseline reproduced the behavior.
          expectedOutcome: baseline && !trial.error ? "fail" : "pass",
          category: trial.error
            ? "execution-error"
            : baseline
              ? "baseline-evidence"
              : "candidate-guidance",
          severity: trial.error ? "high" : "medium",
          datasetId: result.case.id,
          scenarioId: variant.candidate.label,
          rubricId: `${result.case.id}:${rubricVersion}`,
          promptVersion: version(variant.candidate.prompt),
          agentVersion: options.agentModel ?? "claude-cli-default-unrecorded",
          judgeModel: options.judgeModel ?? "claude-sonnet-5",
          ...(!trial.error ? { judgeVerdict: trial.verdict.pass } : {}),
          judgeReasoning: trial.error ? trial.message : trial.verdict.reason,
          input: result.case.task,
          output: trial.artifact,
          expected: result.case.rubric,
          reason: trial.error ? trial.message : trial.verdict.reason,
          metadata: {
            candidate: variant.candidate.label,
            trial: index + 1,
            executionError: Boolean(trial.error),
            provenance: {
              source: "synthetic",
              sourceRef: `evals/src/cases/${result.case.id}.ts`,
            },
            lifecycle: { status: "active" },
          },
        });
      });
    }
  }
  return createEvalReportArtifact(
    {
      run: {
        id: `prompt-evals-${generatedAt}`,
        generatedAt,
        project: "assistant-ui-prompt-evals",
      },
      cases: rows,
      suiteManifests,
    },
    { mapRow: (row) => row },
  );
}

export function writeDashboardArtifact(
  file: string,
  results: CaseResult[],
): EvalReportV1 {
  const report = createDashboardArtifact(results, {
    ...(process.env.AGENT_MODEL ? { agentModel: process.env.AGENT_MODEL } : {}),
    ...(process.env.JUDGE_MODEL ? { judgeModel: process.env.JUDGE_MODEL } : {}),
  });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
