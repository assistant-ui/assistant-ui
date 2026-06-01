import type { CaseResult } from "./types.ts";

/** Render a pass-rate matrix (candidates × cases) plus baseline evidence. */
export function renderReport(results: CaseResult[]): string {
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
      return cell(`${Math.round((v?.passRate ?? 0) * 100)}%`);
    });
    lines.push(`${label.padEnd(labelW)}  ${cells.join("  ")}`);
  }

  lines.push("");
  lines.push("## Reproduced failure (baseline)");
  for (const r of results) {
    const base = r.variants.find((v) => v.candidate.label === "baseline");
    const fail = base?.trials.find((t) => !t.error && !t.verdict.pass);
    if (fail && !fail.error) {
      lines.push(`- ${r.case.id}: ${fail.verdict.reason}`);
    }
  }

  return lines.join("\n");
}
