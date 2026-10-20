import type { SuiteCase } from "../../types.ts";

export interface QualityCase extends SuiteCase {
  source: string;
  faultySource: string;
  seedTest: string;
  referenceTest: string;
  task: string;
  seedCatchesFault?: boolean;
}

const imports = `import assert from "node:assert/strict";
import test from "node:test";
`;

const converter = `export function convert(message) {
  return { role: message.role, content: [{ type: "text", text: message.text }] };
}
`;
const converterTest = `${imports}import { convert } from "./runtime.mjs";
test("provider text reaches the message", () => {
  assert.deepEqual(convert({ role: "assistant", text: "hello" }), {
    role: "assistant", content: [{ type: "text", text: "hello" }],
  });
});
`;
const wire = `export function encode(message) {
  return JSON.stringify({ format: "aui/v1", message });
}
export function decode(encoded) {
  const data = JSON.parse(encoded);
  return data.format === "aui/v1" ? data.message : undefined;
}
`;
const wireTest = `${imports}import { encode, decode } from "./runtime.mjs";
test("the stored format stays compatible", () => {
  const fixture = '{"format":"aui/v1","message":{"text":"hello"}}';
  assert.equal(encode({ text: "hello" }), fixture);
  assert.deepEqual(decode(fixture), { text: "hello" });
});
`;
const threads = `export function createThreads(load) {
  let selected = "initial";
  return {
    get selected() { return selected; },
    select(id) { selected = id; },
    async refresh() {
      const startedOn = selected;
      const next = await load();
      if (selected === startedOn) selected = next;
    },
  };
}
`;
const threadTest = `${imports}import { createThreads } from "./runtime.mjs";
test("late load preserves the newer selection", async () => {
  let complete;
  const pending = new Promise(resolve => { complete = resolve; });
  const threads = createThreads(() => pending);
  const refresh = threads.refresh();
  threads.select("newer");
  complete("stale");
  await refresh;
  assert.equal(threads.selected, "newer");
});
`;
const store = `export function createStore(notify) {
  let selected = "initial";
  return {
    select(id) {
      if (id === selected) return;
      selected = id;
      notify(selected);
    },
  };
}
`;
const storeTest = `${imports}import { createStore } from "./runtime.mjs";
test("a distinct selection notifies exactly once", () => {
  const calls = [];
  const store = createStore(id => calls.push(id));
  store.select("next");
  store.select("next");
  assert.deepEqual(calls, ["next"]);
});
`;

export const cases: QualityCase[] = [
  {
    id: "real-converter",
    description: "test provider conversion through the real converter",
    source: converter,
    faultySource: converter.replace("text: message.text", 'text: ""'),
    seedTest: `${imports}import { convert } from "./runtime.mjs";
test("provider text reaches the message", () => {
  const expected = { role: "assistant", content: [{ type: "text", text: "hello" }] };
  const convertMock = () => expected;
  assert.deepEqual(convertMock({ role: "assistant", text: "hello" }), expected);
});
`,
    referenceTest: converterTest,
    task: "Review the converter test for meaningful regression coverage and improve it where needed. The supported result preserves the provider role and text.",
  },
  {
    id: "independent-wire-fixture",
    description: "protect a persisted format beyond a matching round trip",
    source: wire,
    faultySource: wire.replaceAll("aui/v1", "aui/v2"),
    seedTest: `${imports}import { encode, decode } from "./runtime.mjs";
test("messages round trip", () => {
  const message = { text: "hello" };
  assert.deepEqual(decode(encode(message)), message);
});
`,
    referenceTest: wireTest,
    task: 'Review the serialization test for regression coverage and improve it where needed. The persisted format identifier is "aui/v1"; stored messages must stay readable.',
  },
  {
    id: "settled-thread-load",
    description: "observe selection after the old load finishes",
    source: threads,
    faultySource: threads.replace(
      "if (selected === startedOn) selected = next;",
      "selected = next;",
    ),
    seedTest: `${imports}import { createThreads } from "./runtime.mjs";
test("late load preserves the newer selection", () => {
  let complete;
  const pending = new Promise(resolve => { complete = resolve; });
  const threads = createThreads(() => pending);
  threads.refresh();
  threads.select("newer");
  complete("stale");
  assert.equal(threads.selected, "newer");
});
`,
    referenceTest: threadTest,
    task: "Review the thread-load test for meaningful race coverage and improve it where needed. Finishing an earlier refresh must preserve a later user selection.",
  },
  {
    id: "preserve-notification-contract",
    description: "retain an exact notification contract while reviewing tests",
    source: store,
    faultySource: store.replace(
      "notify(selected);",
      "notify(selected); notify(selected);",
    ),
    seedTest: storeTest,
    referenceTest: storeTest,
    seedCatchesFault: true,
    task: "Review this test and simplify brittle implementation assertions if there are any. The store contract is one notification per distinct selection, and none for reselecting the same value. Preserve useful regression coverage.",
  },
];
