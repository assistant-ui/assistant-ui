import assert from "node:assert/strict";
import test from "node:test";
import type { TrialResult } from "../../types.ts";
import { mean, renderReport } from "./report.ts";
import type { Candidate, Judged, Task } from "./types.ts";

const judged = (
  [clarity, usefulness, completeness, presentation = 3]: [
    number,
    number,
    number,
    number?,
  ],
  overrides: Partial<Judged> = {},
): TrialResult<Judged> => ({
  outcome: {
    artifact: "answer",
    prose: { before: "", after: "" },
    answeredIn: "text",
    errors: [],
    repairRounds: 0,
    inputTokens: 100,
    outputTokens: 50,
    firstOutputMs: 1000,
    totalMs: 2000,
    runtimeErrors: [],
    screenshots: [],
    scores: { clarity, usefulness, completeness, presentation },
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

test("execution failures remain visible alongside scores from completed trials", () => {
  const report = renderReport([
    {
      case: task("t1", false),
      variants: [
        {
          candidate: candidate("text"),
          trials: [judged([5, 5, 5, 5]), errored, errored],
        },
      ],
    },
  ]);
  assert.match(report, /^\| text \| 1 \| 2 \| 100% \| 0% \| 0\.0 \| 5\.0 \|/m);
});

test("a candidate with no completed trials reports errors and unavailable scores", () => {
  const report = renderReport([
    {
      case: task("t1", false),
      variants: [
        { candidate: candidate("text"), trials: [errored, errored, errored] },
      ],
    },
  ]);
  assert.match(
    report,
    /^\| text \| 0 \| 3 \| N\/A \| N\/A \| N\/A \| N\/A \|/m,
  );
});

test("lists every distinct error a candidate left on a task, then every error raised while rendering", () => {
  const report = renderReport([
    {
      case: task("t1", true),
      variants: [
        {
          candidate: candidate("spec"),
          trials: [
            judged([1, 1, 1], { errors: ["a", "b"], runtimeErrors: ["x"] }),
            judged([1, 1, 1], { errors: ["b", "c"], runtimeErrors: ["x"] }),
          ],
        },
      ],
    },
  ]);
  assert.ok(
    report.endsWith(
      [
        "## Validation errors left after repairs",
        "",
        "- `spec:m` on `t1`: a; b; c",
        "",
        "## Errors while rendering",
        "",
        "- `spec:m` on `t1`: x",
      ].join("\n"),
    ),
    report,
  );
});

test("counts which format auto chose on each task", () => {
  const auto = candidate("auto");
  const report = renderReport([
    {
      case: task("t1", true),
      variants: [
        {
          candidate: auto,
          trials: [
            judged([4, 4, 4], { answeredIn: "frame" }),
            judged([3, 3, 3], { answeredIn: "spec" }),
            errored,
          ],
        },
      ],
    },
    {
      case: task("t2", false),
      variants: [
        {
          candidate: auto,
          trials: [
            judged([5, 5, 5]),
            judged([4, 4, 4], { answeredIn: "spec" }),
            judged([1, 1, 1], { answeredIn: "text", attempted: "spec" }),
          ],
        },
      ],
    },
  ]);
  assert.ok(
    report.includes(
      [
        "| task | auto chose text | auto chose spec | auto chose frame |",
        "| --- | ---: | ---: | ---: |",
        "| t1 | 0 | 1 | 1 |",
        "| t2 | 1 | 2 | 0 |",
        "| all tasks | 1 | 3 | 1 |",
      ].join("\n"),
    ),
    report,
  );
});

test("renders each format's averages and each task's score per model", () => {
  const text = candidate("text");
  const spec = candidate("spec");
  const report = renderReport([
    {
      case: task("t1", true),
      variants: [
        { candidate: text, trials: [judged([4, 4, 4, 5])] },
        {
          candidate: spec,
          trials: [
            judged([2, 1, 3, 1], {
              errors: ["bad"],
              runtimeErrors: ["script: boom"],
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
        { candidate: text, trials: [judged([5, 5, 5, 4])] },
        {
          candidate: spec,
          trials: [
            judged([3, 4, 5, 4], {
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
      "Scores and percentages use completed trials only; execution errors are counted separately.",
      "",
      "## m",
      "",
      "| format | completed | execution errors | valid | render errors | repairs | clarity | usefulness | completeness | presentation | computed tasks | other tasks | input tokens | output tokens | first output | total |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
      "| text | 2 | 0 | 100% | 0% | 0.0 | 4.5 | 4.5 | 4.5 | 4.5 | 4.0 | 5.0 | 100 | 50 | 1.0 s | 2.0 s |",
      "| spec | 2 | 1 | 50% | 50% | 1.0 | 2.5 | 2.5 | 4.0 | 2.5 | 2.0 | 4.0 | 250 | 125 | 1.0 s | 3.5 s |",
      "",
      "| task | text | spec |",
      "| --- | ---: | ---: |",
      "| t1 | 4.0 | 2.0 |",
      "| t2 | 5.0 | 4.0 |",
      "",
      "| task, presentation | text | spec |",
      "| --- | ---: | ---: |",
      "| t1 | 5.0 | 1.0 |",
      "| t2 | 4.0 | 4.0 |",
      "",
      "## Validation errors left after repairs",
      "",
      "- `spec:m` on `t1`: bad",
      "",
      "## Errors while rendering",
      "",
      "- `spec:m` on `t1`: script: boom",
    ].join("\n"),
  );
});
