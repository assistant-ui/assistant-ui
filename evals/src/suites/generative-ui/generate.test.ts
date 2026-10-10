import assert from "node:assert/strict";
import test from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import { generateAnswer } from "./generate.ts";
import { call, streamingModel, text } from "./mock-models.ts";
import type { Task } from "./types.ts";

const task: Task = {
  id: "task",
  description: "a task",
  prompt: "Help me plan a party.",
  computed: false,
};
const greeting = { $type: "Text", value: "Hello" };

test("a text answer is its Markdown", async () => {
  const answer = await generateAnswer(
    streamingModel(text("# Plan")),
    task,
    "text",
    2,
  );
  assert.equal(answer.artifact, "# Plan");
  assert.deepEqual(answer.errors, []);
  assert.equal(answer.repairRounds, 0);
  assert.equal(answer.inputTokens, 10);
  assert.equal(answer.outputTokens, 5);
  assert.equal(typeof answer.firstOutputMs, "number");
});

test("a present answer gets its validation errors back and repairs them", async () => {
  const model = streamingModel(
    call("present", { $type: "Nope" }),
    call("present", greeting),
  );
  const answer = await generateAnswer(model, task, "present", 2);
  assert.deepEqual(answer.errors, []);
  assert.equal(answer.repairRounds, 1);
  assert.deepEqual(JSON.parse(answer.artifact), greeting);
  assert.equal(answer.inputTokens, 20);
  assert.ok(
    JSON.stringify(model.doStreamCalls[1]?.prompt).includes(
      "Unknown component",
    ),
  );
});

test("an answer still invalid after the last repair round keeps its errors", async () => {
  const model = streamingModel(
    call("present", { $type: "Nope" }),
    call("present", { $type: "Nope" }),
    call("present", greeting),
  );
  const answer = await generateAnswer(model, task, "present", 1);
  assert.deepEqual(answer.errors, ['Unknown component "Nope".']);
  assert.equal(answer.repairRounds, 1);
  assert.equal(model.doStreamCalls.length, 2);
});

test("a frame answer that never shows a widget is an error", async () => {
  const readMe = () => call("read_me", { modules: ["interactive"] });
  const model = streamingModel(readMe(), readMe(), readMe(), readMe());
  const answer = await generateAnswer(model, task, "frame", 0);
  assert.deepEqual(answer.errors, ["The model never called `show_widget`."]);
  assert.equal(answer.firstOutputMs, undefined);
  assert.equal(model.doStreamCalls.length, 3);
});

test("a tool format answered in prose fails the trial", async () => {
  await assert.rejects(
    generateAnswer(streamingModel(text("Sure.")), task, "present", 2),
    /did not contain a tool call/,
  );
});

test("a spec answer is the spec its patches build", async () => {
  const patches = [
    { op: "add", path: "/root", value: "main" },
    {
      op: "add",
      path: "/elements/main",
      value: { type: "Text", props: { value: "Hi" } },
    },
  ]
    .map((patch) => JSON.stringify(patch))
    .join("\n");
  const answer = await generateAnswer(
    streamingModel(call("render_spec", { title: "Greeting", patches })),
    task,
    "spec",
    2,
  );
  assert.deepEqual(answer.errors, []);
  assert.deepEqual(JSON.parse(answer.artifact), {
    root: "main",
    elements: { main: { type: "Text", props: { value: "Hi" } } },
    state: {},
  });
});

test("a spec answer with an unknown component is an error", async () => {
  const patches = [
    { op: "add", path: "/root", value: "main" },
    { op: "add", path: "/elements/main", value: { type: "Nope" } },
  ]
    .map((patch) => JSON.stringify(patch))
    .join("\n");
  const answer = await generateAnswer(
    streamingModel(
      call("render_spec", { title: "Greeting", patches }),
      call("render_spec", { title: "Greeting", patches }),
    ),
    task,
    "spec",
    1,
  );
  assert.equal(answer.repairRounds, 1);
  assert.ok(answer.errors.some((error) => error.includes("Nope")));
});

test("a frame answer may read the guidance before showing its widget", async () => {
  const model = streamingModel(
    call("read_me", { modules: ["interactive"] }),
    call("show_widget", { title: "Hello", widget_code: "<p>Hello</p>" }),
  );
  const answer = await generateAnswer(model, task, "frame", 2);
  assert.equal(answer.artifact, "<p>Hello</p>");
  assert.deepEqual(answer.errors, []);
  assert.equal(answer.repairRounds, 0);
  assert.equal(model.doStreamCalls.length, 2);
});

test("an empty widget is an error the model can repair", async () => {
  const answer = await generateAnswer(
    streamingModel(
      call("show_widget", { title: "Hello", widget_code: " " }),
      call("show_widget", { title: "Hello", widget_code: "<p>Hello</p>" }),
    ),
    task,
    "frame",
    2,
  );
  assert.equal(answer.artifact, "<p>Hello</p>");
  assert.deepEqual(answer.errors, []);
  assert.equal(answer.repairRounds, 1);
});

test("a model error fails the trial instead of scoring it", async () => {
  const model = new MockLanguageModelV4({
    doStream: async () => {
      throw new Error("rate limited");
    },
  });
  await assert.rejects(generateAnswer(model, task, "text", 2), /rate limited/);
});
