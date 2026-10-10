import { describe, expect, it } from "vitest";
import { renderReport } from "./report.ts";
import type { CaseResult } from "./types.ts";

const result = (
  caseId: string,
  variants: Array<{ label: string; passRate: number }>,
): CaseResult => ({
  case: {
    id: caseId,
    description: caseId,
    seed: [],
    task: "task",
    rubric: "rubric",
    inspect: [],
  },
  variants: variants.map(({ label, passRate }) => ({
    candidate: { label, prompt: "" },
    passRate,
    trials: [],
  })),
});

describe("renderReport", () => {
  it("shows scoped candidates and marks non-applicable cells without inventing failures", () => {
    const report = renderReport([
      result("comments", [
        { label: "baseline", passRate: 0 },
        { label: "delete-stale", passRate: 1 },
      ]),
      result("packaging", [
        { label: "baseline", passRate: 0 },
        { label: "optional-peer", passRate: 1 },
      ]),
    ]);

    expect(report).toContain("delete-stale");
    expect(report).toContain("optional-peer");
    expect(report).toMatch(/delete-stale\s+100%\s+—/);
    expect(report).toMatch(/optional-peer\s+—\s+100%/);
  });
});
