import assert from "node:assert/strict";
import test from "node:test";
import { judgeAnswer } from "./judge.ts";
import { generatingModel } from "./mock-models.ts";
import type { Answer, Rendered, Task } from "./types.ts";

const task: Task = {
  id: "task",
  description: "a task",
  prompt: "Split a $120 bill four ways.",
  computed: true,
};
const answer: Answer = {
  artifact: '{"root":"main"}',
  prose: { before: "", after: "" },
  answeredIn: "spec",
  errors: [],
  repairRounds: 0,
  inputTokens: 10,
  outputTokens: 5,
  firstOutputMs: 120,
  totalMs: 900,
};
const rendered: Rendered = {
  screenshots: ["iVBORw0KGgo="],
  cutOff: false,
  runtimeErrors: [],
};
const verdict = JSON.stringify({
  clarity: 4,
  usefulness: 3,
  completeness: 5,
  presentation: 2,
  reason: "Clear, but the tip does not update the shares.",
});

test("the judge's structured reply becomes scores and a reason", async () => {
  assert.deepEqual(
    await judgeAnswer(generatingModel(verdict), task, "spec", answer, rendered),
    {
      scores: { clarity: 4, usefulness: 3, completeness: 5, presentation: 2 },
      reason: "Clear, but the tip does not update the shares.",
    },
  );
});

test("a verdict outside the 1 to 5 scale fails the trial", async () => {
  await assert.rejects(
    judgeAnswer(
      generatingModel(
        JSON.stringify({
          clarity: 5,
          usefulness: 9,
          completeness: 3,
          presentation: 4,
          reason: "Great.",
        }),
      ),
      task,
      "spec",
      answer,
      rendered,
    ),
  );
});

test("the judge sees the request, the format, every screenshot, the source, and what went wrong", async () => {
  const model = generatingModel(verdict);
  await judgeAnswer(
    model,
    task,
    "spec",
    { ...answer, errors: ["/elements/main/type: Unknown component"] },
    {
      screenshots: ["iVBORw0KGgo=", "iVBORw0KGgp="],
      cutOff: true,
      runtimeErrors: ["The answer rendered blank."],
    },
  );
  const prompt = model.doGenerateCalls[0]?.prompt ?? [];
  const content = prompt.find((message) => message.role === "user")?.content;
  assert.ok(Array.isArray(content));
  assert.equal(
    content.filter(
      (part) => part.type === "file" && part.mediaType === "image/png",
    ).length,
    2,
  );
  const serialized = JSON.stringify(prompt);
  for (const expected of [
    "Split a $120 bill four ways.",
    "render_spec",
    '{\\"root\\":\\"main\\"}',
    "/elements/main/type: Unknown component",
    "The answer rendered blank.",
    "continues below the last screenshot",
  ]) {
    assert.ok(serialized.includes(expected), expected);
  }
});

test("a Markdown answer has no controls, so the judge gets no source", async () => {
  const model = generatingModel(verdict);
  await judgeAnswer(
    model,
    task,
    "text",
    { ...answer, answeredIn: "text", artifact: "# Bill" },
    rendered,
  );
  const serialized = JSON.stringify(model.doGenerateCalls[0]?.prompt);
  assert.ok(!serialized.includes("<source>"));
  assert.ok(!serialized.includes("# Bill"));
});

test("the judge sees that screenshots include prose around a tool answer", async () => {
  const model = generatingModel(verdict);
  await judgeAnswer(
    model,
    task,
    "spec",
    { ...answer, prose: { before: "Here is your plan.", after: "" } },
    rendered,
  );
  const serialized = JSON.stringify(model.doGenerateCalls[0]?.prompt);
  assert.ok(
    serialized.includes(
      "The assistant answered with a flat spec of native components with state, bindings, and conditions that the host app renders (`render_spec` tool), with text it wrote above or below it. These screenshots show both from top to bottom, the way the user first sees them, 680 px wide:",
    ),
  );
});
