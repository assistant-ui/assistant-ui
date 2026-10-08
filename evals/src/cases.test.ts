import { describe, expect, it } from "vitest";
import { cases } from "./cases/index.ts";
import { candidates } from "./candidates.ts";

describe("prompt eval case registry", () => {
  it("registers five distinct cases with complete definitions", () => {
    expect(cases.map((item) => item.id)).toEqual([
      "pr-review-comments",
      "bugfix-comments",
      "registry-source-of-truth",
      "optional-host-sdk-dependency",
      "verbose-new-code",
    ]);
    expect(new Set(cases.map((item) => item.id)).size).toBe(cases.length);

    for (const item of cases) {
      expect(item.description.trim()).not.toBe("");
      expect(item.task.trim()).not.toBe("");
      expect(item.rubric).toContain("PASS");
      expect(item.rubric).toContain("FAIL");
      expect(item.seed.length).toBeGreaterThan(0);
      expect(item.inspect.length).toBeGreaterThan(0);
      const applicable = candidates.filter(
        (candidate) =>
          !candidate.caseIds || candidate.caseIds.includes(item.id),
      );
      expect(applicable.map((candidate) => candidate.label)).toContain(
        "baseline",
      );
      expect(applicable.length).toBeGreaterThanOrEqual(2);
    }
  });
});
