import type { CaseResult, TrialResult } from "../../types.ts";
import type { Candidate, Judged, Scores, Task } from "./types.ts";

export const overall = (scores: Scores) =>
  (scores.clarity + scores.usefulness + scores.completeness) / 3;

/** Mean over the completed trials, or undefined when none completed. */
export function mean(
  trials: TrialResult<Judged>[],
  pick: (judged: Judged) => number | undefined,
): number | undefined {
  const values = trials.flatMap((trial) => {
    if (trial.error) return [];
    const value = pick(trial.outcome);
    return value === undefined ? [] : [value];
  });
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : undefined;
}

export const formatScore = (value: number | undefined) =>
  value === undefined ? "N/A" : value.toFixed(1);

const formatShare = (value: number | undefined) =>
  value === undefined ? "N/A" : `${Math.round(value * 100)}%`;

const formatCount = (value: number | undefined) =>
  value === undefined ? "N/A" : String(Math.round(value));

const formatSeconds = (value: number | undefined) =>
  value === undefined ? "N/A" : `${(value / 1000).toFixed(1)} s`;

/** Per model: each format's averages, then each task's overall score by format. */
export function renderReport(
  results: CaseResult<Task, Candidate, Judged>[],
): string {
  const candidates = results[0]?.variants.map((v) => v.candidate) ?? [];
  const trialsOf = (candidate: Candidate, tasks = results) =>
    tasks.flatMap(
      (r) =>
        r.variants.find((v) => v.candidate.label === candidate.label)?.trials ??
        [],
    );
  const computed = results.filter((r) => r.case.computed);
  const other = results.filter((r) => !r.case.computed);

  const lines = ["# Generative UI eval results"];
  for (const model of new Set(candidates.map((c) => c.modelName))) {
    const formats = candidates.filter((c) => c.modelName === model);
    lines.push(
      "",
      `## ${model}`,
      "",
      "| format | valid | repairs | clarity | usefulness | completeness | computed tasks | other tasks | input tokens | output tokens | first output | total |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    );
    for (const candidate of formats) {
      const trials = trialsOf(candidate);
      const cells = [
        formatShare(mean(trials, (j) => (j.errors.length ? 0 : 1))),
        formatScore(mean(trials, (j) => j.repairRounds)),
        formatScore(mean(trials, (j) => j.scores.clarity)),
        formatScore(mean(trials, (j) => j.scores.usefulness)),
        formatScore(mean(trials, (j) => j.scores.completeness)),
        formatScore(
          mean(trialsOf(candidate, computed), (j) => overall(j.scores)),
        ),
        formatScore(mean(trialsOf(candidate, other), (j) => overall(j.scores))),
        formatCount(mean(trials, (j) => j.inputTokens)),
        formatCount(mean(trials, (j) => j.outputTokens)),
        formatSeconds(mean(trials, (j) => j.firstOutputMs)),
        formatSeconds(mean(trials, (j) => j.totalMs)),
      ];
      lines.push(`| ${candidate.format} | ${cells.join(" | ")} |`);
    }
    lines.push(
      "",
      `| task | ${formats.map((c) => c.format).join(" | ")} |`,
      `| --- | ${formats.map(() => "---:").join(" | ")} |`,
    );
    for (const r of results) {
      const cells = formats.map((candidate) =>
        formatScore(mean(trialsOf(candidate, [r]), (j) => overall(j.scores))),
      );
      lines.push(`| ${r.case.id} | ${cells.join(" | ")} |`);
    }
  }

  const failures = results.flatMap((r) =>
    r.variants.flatMap((v) => {
      const failed = v.trials.find((t) => !t.error && t.outcome.errors.length);
      return failed && !failed.error
        ? [
            `- \`${v.candidate.label}\` on \`${r.case.id}\`: ${failed.outcome.errors[0]}`,
          ]
        : [];
    }),
  );
  if (failures.length) {
    lines.push("", "## Validation errors left after repairs", "", ...failures);
  }
  return lines.join("\n");
}
