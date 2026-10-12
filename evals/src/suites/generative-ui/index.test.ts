import assert from "node:assert/strict";
import test from "node:test";
import { createGenerativeUISuite } from "./index.ts";
import { generatingModel, streamingModel, text } from "./mock-models.ts";

test("every model answers in every format and in one it chooses", () => {
  const suite = createGenerativeUISuite({
    models: ["openai/gpt-6-astra", "google/gemini-3.1-pro-preview"],
    judge: "anthropic/claude-sonnet-5.5",
  });
  assert.deepEqual(
    suite.candidates.map((c) => c.label),
    [
      "text:openai/gpt-6-astra",
      "present:openai/gpt-6-astra",
      "spec:openai/gpt-6-astra",
      "frame:openai/gpt-6-astra",
      "auto:openai/gpt-6-astra",
      "text:google/gemini-3.1-pro-preview",
      "present:google/gemini-3.1-pro-preview",
      "spec:google/gemini-3.1-pro-preview",
      "frame:google/gemini-3.1-pro-preview",
      "auto:google/gemini-3.1-pro-preview",
    ],
  );
  assert.equal(suite.cases.length, 6);
});

test("a trial answers, renders the answer, then a separate judge scores the screenshot", async () => {
  const rendered: [string, string, { before: string; after: string }][] = [];
  const judge = generatingModel(
    JSON.stringify({
      clarity: 5,
      usefulness: 4,
      completeness: 3,
      reason: "Useful.",
    }),
  );
  const suite = createGenerativeUISuite({
    models: [streamingModel(text("# Plan"))],
    judge,
    render: async (format, artifact, prose) => {
      rendered.push([format, artifact, prose]);
      return {
        screenshots: ["iVBORw0KGgo="],
        cutOff: false,
        runtimeErrors: ["slow font"],
      };
    },
  });
  const candidate = suite.candidates.find((c) => c.format === "text");
  const task = suite.cases[0];
  assert.ok(candidate && task);
  const judged = await suite.run(task, candidate);
  assert.equal(judged.artifact, "# Plan");
  assert.deepEqual(rendered, [["text", "# Plan", { before: "", after: "" }]]);
  assert.ok(
    JSON.stringify(judge.doGenerateCalls[0]?.prompt).includes("iVBORw0KGgo="),
    "the judge sees the rendered screenshot",
  );
  assert.deepEqual(judged.runtimeErrors, ["slow font"]);
  assert.deepEqual(judged.screenshots, []);
  assert.deepEqual(judged.scores, {
    clarity: 5,
    usefulness: 4,
    completeness: 3,
  });
  assert.deepEqual(suite.view(judged), {
    mark: "x",
    verdict:
      "4.0, 0 repair round(s), 0 error(s) left, 1 while rendering: Useful.",
    artifact: "# Plan",
  });
  assert.equal(
    suite.summarize([
      { outcome: judged },
      { error: true, message: "timed out" },
    ]),
    "4.0",
  );
});

test("a tool format answered in prose renders as the Markdown the user would see", async () => {
  const rendered: [string, string, { before: string; after: string }][] = [];
  const suite = createGenerativeUISuite({
    models: [streamingModel(text("Each pays $30."))],
    judge: generatingModel(
      JSON.stringify({
        clarity: 2,
        usefulness: 2,
        completeness: 2,
        reason: "No UI.",
      }),
    ),
    render: async (format, artifact, prose) => {
      rendered.push([format, artifact, prose]);
      return {
        screenshots: ["iVBORw0KGgo="],
        cutOff: false,
        runtimeErrors: [],
      };
    },
  });
  const candidate = suite.candidates.find((c) => c.format === "present");
  const task = suite.cases[0];
  assert.ok(candidate && task);
  const judged = await suite.run(task, candidate);
  assert.deepEqual(rendered, [
    ["text", "Each pays $30.", { before: "", after: "" }],
  ]);
  assert.deepEqual(judged.errors, ["The model never called `present`."]);
});
