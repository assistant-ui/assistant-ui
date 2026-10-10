import assert from "node:assert/strict";
import test from "node:test";
import { createGenerativeUISuite } from "./index.ts";
import { generatingModel, streamingModel, text } from "./mock-models.ts";

test("every model answers in every format", () => {
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
      "text:google/gemini-3.1-pro-preview",
      "present:google/gemini-3.1-pro-preview",
      "spec:google/gemini-3.1-pro-preview",
      "frame:google/gemini-3.1-pro-preview",
    ],
  );
  assert.equal(suite.cases.length, 6);
});

test("a trial answers, then a separate judge scores the answer", async () => {
  const suite = createGenerativeUISuite({
    models: [streamingModel(text("# Plan"))],
    judge: generatingModel(
      JSON.stringify({
        clarity: 5,
        usefulness: 4,
        completeness: 3,
        reason: "Useful.",
      }),
    ),
  });
  const candidate = suite.candidates.find((c) => c.format === "text");
  const task = suite.cases[0];
  assert.ok(candidate && task);
  const judged = await suite.run(task, candidate);
  assert.equal(judged.artifact, "# Plan");
  assert.deepEqual(judged.scores, {
    clarity: 5,
    usefulness: 4,
    completeness: 3,
  });
  assert.deepEqual(suite.view(judged), {
    mark: ".",
    verdict: "4.0, 0 repair round(s), 0 error(s) left: Useful.",
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
