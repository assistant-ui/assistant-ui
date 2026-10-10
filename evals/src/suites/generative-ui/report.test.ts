import assert from "node:assert/strict";
import test from "node:test";
import type { TrialResult } from "../../types.ts";
import { mean, renderReport } from "./report.ts";
import type { Candidate, Judged, Task } from "./types.ts";

const judged = (
  [clarity, usefulness, completeness]: [number, number, number],
  overrides: Partial<Judged> = {},
): TrialResult<Judged> => ({
  outcome: {
    artifact: "answer",
    errors: [],
    repairRounds: 0,
    inputTokens: 100,
    outputTokens: 50,
    firstOutputMs: 1000,
    totalMs: 2000,
    scores: { clarity, usefulness, completeness },
    reason: "",
    ...overrides,
  },
});
const errored: TrialResult<Judged> = { error: true, message: "timed out" };
const task = (id: string, computed: boolean): Task => ({
  id,
  description: "",
  prompt: "",
  computed,
});
const candidate = (format: Candidate["format"]): Candidate => ({
  label: `${format}:m`,
  format,
  model: "m",
  modelName: "m",
});

test("mean skips errored trials and missing values", () => {
  assert.equal(
    mean(
      [judged([4, 4, 4]), errored, judged([2, 2, 2])],
      (j) => j.scores.clarity,
    ),
    3,
  );
  assert.equal(
    mean(
      [judged([4, 4, 4], { firstOutputMs: undefined })],
      (j) => j.firstOutputMs,
    ),
    undefined,
  );
  assert.equal(
    mean([errored], (j) => j.totalMs),
    undefined,
  );
});

test("lists every distinct error a candidate left on a task", () => {
  const report = renderReport([
    {
      case: task("t1", true),
      variants: [
        {
          candidate: candidate("spec"),
          trials: [
            judged([1, 1, 1], { errors: ["a", "b"] }),
            judged([1, 1, 1], { errors: ["b", "c"] }),
          ],
        },
      ],
    },
  ]);
  assert.ok(report.endsWith("- `spec:m` on `t1`: a; b; c"), report);
});

test("renders each format's averages and each task's score per model", () => {
  const text = candidate("text");
  const spec = candidate("spec");
  const report = renderReport([
    {
      case: task("t1", true),
      variants: [
        { candidate: text, trials: [judged([4, 4, 4])] },
        {
          candidate: spec,
          trials: [
            judged([2, 1, 3], {
              errors: ["bad"],
              repairRounds: 2,
              inputTokens: 300,
              outputTokens: 150,
              firstOutputMs: 500,
              totalMs: 4000,
            }),
            errored,
          ],
        },
      ],
    },
    {
      case: task("t2", false),
      variants: [
        { candidate: text, trials: [judged([5, 5, 5])] },
        {
          candidate: spec,
          trials: [
            judged([3, 4, 5], {
              inputTokens: 200,
              outputTokens: 100,
              firstOutputMs: 1500,
              totalMs: 3000,
            }),
          ],
        },
      ],
    },
  ]);
  assert.equal(
    report,
    [
      "# Generative UI eval results",
      "",
      "## m",
      "",
      "| format | valid | repairs | clarity | usefulness | completeness | computed tasks | other tasks | input tokens | output tokens | first output | total |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
      "| text | 100% | 0.0 | 4.5 | 4.5 | 4.5 | 4.0 | 5.0 | 100 | 50 | 1.0 s | 2.0 s |",
      "| spec | 50% | 1.0 | 2.5 | 2.5 | 4.0 | 2.0 | 4.0 | 250 | 125 | 1.0 s | 3.5 s |",
      "",
      "| task | text | spec |",
      "| --- | ---: | ---: |",
      "| t1 | 4.0 | 2.0 |",
      "| t2 | 5.0 | 4.0 |",
      "",
      "## Validation errors left after repairs",
      "",
      "- `spec:m` on `t1`: bad",
    ].join("\n"),
  );
});
