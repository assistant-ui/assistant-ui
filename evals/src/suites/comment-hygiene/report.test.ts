import assert from "node:assert/strict";
import test from "node:test";
import type { TrialResult } from "../../types.ts";
import { passRate, renderReport } from "./report.ts";
import type { EvalCase, Judged } from "./types.ts";

const judged = (pass: boolean, reason = ""): TrialResult<Judged> => ({
  outcome: { verdict: { pass, reason }, artifact: "" },
});
const errored: TrialResult<Judged> = { error: true, message: "timed out" };
const evalCase = (id: string): EvalCase => ({
  id,
  description: "",
  seed: [],
  task: "",
  rubric: "",
  inspect: [],
});
const baseline = { label: "baseline", prompt: "" };
const deleteStale = { label: "delete-stale", prompt: "Delete it." };

test("passRate leaves errored trials out", () => {
  assert.equal(passRate([judged(true), judged(false), errored]), 0.5);
  assert.equal(passRate([errored]), undefined);
});

test("renders each candidate's pass rate per case and the baseline failure", () => {
  assert.equal(
    renderReport([
      {
        case: evalCase("pr-review-comments"),
        variants: [
          {
            candidate: baseline,
            trials: [judged(true), judged(false, "kept the history comment")],
          },
          { candidate: deleteStale, trials: [judged(true), errored] },
        ],
      },
      {
        case: evalCase("bugfix-comments"),
        variants: [
          { candidate: baseline, trials: [judged(true)] },
          { candidate: deleteStale, trials: [errored] },
        ],
      },
    ]),
    [
      "# Prompt eval results",
      "",
      "candidate     pr-review-comments     bugfix-comments",
      "baseline                     50%                100%",
      "delete-stale                100%                 N/A",
      "",
      "## Reproduced failure (baseline)",
      "- pr-review-comments: kept the history comment",
    ].join("\n"),
  );
});

test("shows scoped candidates without inventing failures for other cases", () => {
  const result = (
    caseId: string,
    variants: Array<{ label: string; pass: boolean }>,
  ) => ({
    case: evalCase(caseId),
    variants: variants.map(({ label, pass }) => ({
      candidate: { label, prompt: "" },
      trials: [judged(pass)],
    })),
  });
  const report = renderReport([
    result("comments", [
      { label: "baseline", pass: false },
      { label: "delete-stale", pass: true },
    ]),
    result("packaging", [
      { label: "baseline", pass: false },
      { label: "optional-peer", pass: true },
    ]),
  ]);
  assert.match(report, /delete-stale\s+100%\s+—/);
  assert.match(report, /optional-peer\s+—\s+100%/);
});
