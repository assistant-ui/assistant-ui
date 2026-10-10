import assert from "node:assert/strict";
import test from "node:test";
import { judgeAnswer } from "./judge.ts";
import { generatingModel } from "./mock-models.ts";
import type { Answer, Task } from "./types.ts";

const task: Task = {
  id: "task",
  description: "a task",
  prompt: "Split a $120 bill four ways.",
  computed: true,
};
const answer: Answer = {
  artifact: '{"root":"main"}',
  errors: [],
  repairRounds: 0,
  inputTokens: 10,
  outputTokens: 5,
  firstOutputMs: 120,
  totalMs: 900,
};
const verdict = JSON.stringify({
  clarity: 4,
  usefulness: 3,
  completeness: 5,
  reason: "Clear, but the tip does not update the shares.",
});

test("the judge's structured reply becomes scores and a reason", async () => {
  assert.deepEqual(
    await judgeAnswer(generatingModel(verdict), task, "spec", answer),
    {
      scores: { clarity: 4, usefulness: 3, completeness: 5 },
      reason: "Clear, but the tip does not update the shares.",
    },
  );
});

test("a verdict outside the 1 to 5 scale fails the trial", async () => {
  await assert.rejects(
    judgeAnswer(
      generatingModel(
        JSON.stringify({
          clarity: "5",
          usefulness: 9,
          completeness: 3,
          reason: "Great.",
        }),
      ),
      task,
      "spec",
      answer,
    ),
  );
});

test("the judge sees the request, the format, the source, and what failed to render", async () => {
  const model = generatingModel(verdict);
  await judgeAnswer(model, task, "spec", {
    ...answer,
    errors: ["/elements/main/type: Unknown component"],
  });
  const prompt = JSON.stringify(model.doGenerateCalls[0]?.prompt);
  for (const expected of [
    "Split a $120 bill four ways.",
    "render_spec",
    '{\\"root\\":\\"main\\"}',
    "/elements/main/type: Unknown component",
  ]) {
    assert.ok(prompt.includes(expected), expected);
  }
});
