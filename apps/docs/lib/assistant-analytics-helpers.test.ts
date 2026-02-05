import assert from "node:assert/strict";
import test from "node:test";
import {
  consumeRunStartedAt,
  getComposerMessageMetrics,
  pruneStaleRunStarts,
  queueMicrotaskSafe,
  recordRunStartedAt,
} from "./assistant-analytics-helpers";

test("getComposerMessageMetrics returns undefined for empty composer", () => {
  const metrics = getComposerMessageMetrics({
    isEmpty: true,
    text: "ignored",
    attachments: [{}, {}],
  });

  assert.equal(metrics, undefined);
});

test("getComposerMessageMetrics returns message and attachment sizes", () => {
  const metrics = getComposerMessageMetrics({
    isEmpty: false,
    text: "Hello",
    attachments: [{ id: "a" }, { id: "b" }],
  });

  assert.deepEqual(metrics, {
    messageLength: 5,
    attachmentsCount: 2,
  });
});

test("getComposerMessageMetrics keeps attachment-only sends", () => {
  const metrics = getComposerMessageMetrics({
    isEmpty: false,
    text: "",
    attachments: [{ id: "attachment" }],
  });

  assert.deepEqual(metrics, {
    messageLength: 0,
    attachmentsCount: 1,
  });
});

test("queueMicrotaskSafe reads state after synchronous updates", async () => {
  let value = 1;

  const captured = await new Promise<number>((resolve) => {
    queueMicrotaskSafe(() => resolve(value));
    value = 2;
  });

  assert.equal(captured, 2);
});

test("run-start tracking keeps separate start times per thread run", () => {
  const runStarts = new Map<string, number[]>();

  recordRunStartedAt(runStarts, "thread-1", 100);
  recordRunStartedAt(runStarts, "thread-1", 200);

  assert.equal(consumeRunStartedAt(runStarts, "thread-1"), 100);
  assert.equal(consumeRunStartedAt(runStarts, "thread-1"), 200);
  assert.equal(consumeRunStartedAt(runStarts, "thread-1"), undefined);
});

test("run-start cleanup removes only stale entries", () => {
  const runStarts = new Map<string, number[]>();

  recordRunStartedAt(runStarts, "thread-1", 100);
  recordRunStartedAt(runStarts, "thread-1", 300);
  recordRunStartedAt(runStarts, "thread-2", 350);

  pruneStaleRunStarts(runStarts, 400, 150);

  assert.deepEqual(runStarts.get("thread-1"), [300]);
  assert.deepEqual(runStarts.get("thread-2"), [350]);
});
