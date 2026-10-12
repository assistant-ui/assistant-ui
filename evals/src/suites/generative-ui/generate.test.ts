import assert from "node:assert/strict";
import test from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import { generateAnswer } from "./generate.ts";
import {
  call,
  malformedCall,
  parallelCalls,
  streamingModel,
  text,
  textThenCall,
} from "./mock-models.ts";
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
  assert.deepEqual(answer.prose, { before: "", after: "" });
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

test("a tool format answered in prose is an error", async () => {
  const answer = await generateAnswer(
    streamingModel(text("Sure.")),
    task,
    "present",
    2,
  );
  assert.equal(answer.artifact, "Sure.");
  assert.equal(answer.answeredIn, "text");
  assert.deepEqual(answer.errors, ["The model never called `present`."]);
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

test("a spec answer keeps text written before its tool call", async () => {
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
    streamingModel(
      textThenCall("Here is your plan.", "render_spec", {
        title: "Plan",
        patches,
      }),
    ),
    task,
    "spec",
    1,
  );
  assert.deepEqual(answer.errors, []);
  assert.deepEqual(answer.prose, {
    before: "Here is your plan.",
    after: "",
  });
});

test("a spec answer keeps text written after its last failed attempt", async () => {
  const patches = [
    { op: "add", path: "/root", value: "main" },
    { op: "add", path: "/elements/main", value: { type: "Nope" } },
  ]
    .map((patch) => JSON.stringify(patch))
    .join("\n");
  const answer = await generateAnswer(
    streamingModel(
      call("render_spec", { title: "Plan", patches }),
      text("Here is your plan in words."),
    ),
    task,
    "spec",
    1,
  );
  assert.equal(answer.answeredIn, "spec");
  assert.ok(answer.errors.some((error) => error.includes("Nope")));
  assert.deepEqual(answer.prose, {
    before: "",
    after: "Here is your plan in words.",
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
  assert.equal(typeof answer.firstOutputMs, "number");
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

test("an auto answer in prose is a valid text answer", async () => {
  const answer = await generateAnswer(
    streamingModel(text("Swap the tube.")),
    task,
    "auto",
    2,
  );
  assert.equal(answer.answeredIn, "text");
  assert.equal(answer.artifact, "Swap the tube.");
  assert.deepEqual(answer.errors, []);
  assert.equal(typeof answer.firstOutputMs, "number");
});

test("an auto answer is in the format of the tool it called", async () => {
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
  const spec = await generateAnswer(
    streamingModel(call("render_spec", { title: "Greeting", patches })),
    task,
    "auto",
    2,
  );
  assert.equal(spec.answeredIn, "spec");
  assert.deepEqual(spec.errors, []);
  assert.equal(JSON.parse(spec.artifact).root, "main");

  const frame = await generateAnswer(
    streamingModel(
      call("show_widget", { title: "Hello", widget_code: "<p>Hello</p>" }),
    ),
    task,
    "auto",
    2,
  );
  assert.equal(frame.answeredIn, "frame");
  assert.equal(frame.artifact, "<p>Hello</p>");
  assert.equal(typeof frame.firstOutputMs, "number");
});

test("an auto answer that gives up on a failing spec and answers in prose is that prose", async () => {
  const patches = [
    { op: "add", path: "/root", value: "main" },
    { op: "add", path: "/elements/main", value: { type: "Nope" } },
  ]
    .map((patch) => JSON.stringify(patch))
    .join("\n");
  const answer = await generateAnswer(
    streamingModel(
      call("render_spec", { title: "Plan", patches }),
      text("Here is the plan in words."),
    ),
    task,
    "auto",
    2,
  );
  assert.equal(answer.answeredIn, "text");
  assert.equal(answer.artifact, "Here is the plan in words.");
  assert.deepEqual(answer.errors, []);
  assert.equal(answer.repairRounds, 1);
});

test("an auto answer whose tool call fails before it runs is an error, not prose", async () => {
  const invalid = () => malformedCall("render_spec");
  const answer = await generateAnswer(
    streamingModel(invalid(), invalid(), invalid()),
    task,
    "auto",
    0,
  );
  assert.equal(answer.answeredIn, "text");
  assert.equal(answer.attempted, "spec");
  assert.equal(typeof answer.firstOutputMs, "number");
  assert.deepEqual(answer.errors, [
    "The model's answer tool call failed before it ran.",
  ]);
});

test("an auto answer that goes quiet after a call fails before it runs still counts that call's format", async () => {
  const answer = await generateAnswer(
    streamingModel(malformedCall("render_spec"), text("")),
    task,
    "auto",
    0,
  );
  assert.equal(answer.answeredIn, "text");
  assert.equal(answer.attempted, "spec");
  assert.equal(typeof answer.firstOutputMs, "number");
  assert.deepEqual(answer.errors, [
    "The model's answer tool call failed before it ran.",
  ]);
});

test("an auto answer whose failed calls use two formats at once is an error that counts the last call", async () => {
  const invalid = () => malformedCall("render_spec", "show_widget");
  const answer = await generateAnswer(
    streamingModel(invalid(), invalid(), invalid()),
    task,
    "auto",
    0,
  );
  assert.equal(answer.attempted, "frame");
  assert.deepEqual(answer.errors, [
    "The model's answer tool call failed before it ran.",
    "The model answered in more than one format at once.",
  ]);
});

test("a spec answer whose tool call fails before it runs says so", async () => {
  const invalid = () => malformedCall("render_spec");
  const answer = await generateAnswer(
    streamingModel(invalid(), invalid(), invalid()),
    task,
    "spec",
    0,
  );
  assert.equal(answer.answeredIn, "text");
  assert.equal(answer.attempted, "spec");
  assert.equal(typeof answer.firstOutputMs, "number");
  assert.deepEqual(answer.errors, [
    "The model's answer tool call failed before it ran.",
  ]);
});

test("an auto answer that calls a spec and a widget at once is an error", async () => {
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
    streamingModel(
      parallelCalls(
        ["render_spec", { title: "Greeting", patches }],
        ["show_widget", { title: "Hello", widget_code: "<p>Hello</p>" }],
      ),
    ),
    task,
    "auto",
    2,
  );
  assert.ok(
    answer.errors.includes(
      "The model answered in more than one format at once.",
    ),
  );
});

test("a model error fails the trial instead of scoring it", async () => {
  const model = new MockLanguageModelV4({
    doStream: async () => {
      throw new Error("rate limited");
    },
  });
  await assert.rejects(generateAnswer(model, task, "text", 2), /rate limited/);
});
