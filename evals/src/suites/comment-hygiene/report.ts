import type { CaseResult, TrialResult } from "../../types.ts";
import type { Candidate, EvalCase, Judged } from "./types.ts";

/** Share of the completed trials that passed, or undefined when none completed. */
export function passRate(trials: TrialResult<Judged>[]): number | undefined {
  const scored = trials.filter((t) => !t.error);
  if (scored.length === 0) return undefined;
  return (
    scored.filter((t) => !t.error && t.outcome.verdict.pass).length /
    scored.length
  );
}

export const formatPassRate = (rate: number | undefined): string =>
  rate === undefined ? "N/A" : `${Math.round(rate * 100)}%`;

/** Render a pass-rate matrix (candidates × cases) plus baseline evidence. */
export function renderReport(
  results: CaseResult<EvalCase, Candidate, Judged>[],
): string {
  const caseIds = results.map((r) => r.case.id);
  const labels = results[0]?.variants.map((v) => v.candidate.label) ?? [];
  const labelW = Math.max(9, ...labels.map((l) => l.length));
  const colW = Math.max(8, ...caseIds.map((c) => c.length));

  const cell = (s: string) => s.padStart(colW);
  const lines: string[] = [];

  lines.push("# Prompt eval results");
  lines.push("");
  lines.push(`${"candidate".padEnd(labelW)}  ${caseIds.map(cell).join("  ")}`);
  for (const label of labels) {
    const cells = results.map((r) => {
      const v = r.variants.find((x) => x.candidate.label === label);
      return cell(formatPassRate(v ? passRate(v.trials) : undefined));
    });
    lines.push(`${label.padEnd(labelW)}  ${cells.join("  ")}`);
  }

  lines.push("");
  lines.push("## Reproduced failure (baseline)");
  for (const r of results) {
    const base = r.variants.find((v) => v.candidate.label === "baseline");
    const fail = base?.trials.find((t) => !t.error && !t.outcome.verdict.pass);
    if (fail && !fail.error) {
      lines.push(`- ${r.case.id}: ${fail.outcome.verdict.reason}`);
    }
  }

  return lines.join("\n");
}
