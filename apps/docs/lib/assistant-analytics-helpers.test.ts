import { expect, it } from "vitest";
import {
  consumeRunStartedAt,
  getComposerMessageMetrics,
  pruneStaleRunStarts,
  queueMicrotaskSafe,
  recordRunStartedAt,
} from "./assistant-analytics-helpers";

it("getComposerMessageMetrics returns undefined for empty composer", () => {
  const metrics = getComposerMessageMetrics({
    isEmpty: true,
    text: "ignored",
    attachments: [{}, {}],
  });

  expect(metrics).toBeUndefined();
});

it("getComposerMessageMetrics returns message and attachment sizes", () => {
  const metrics = getComposerMessageMetrics({
    isEmpty: false,
    text: "Hello",
    attachments: [{ id: "a" }, { id: "b" }],
  });

  expect(metrics).toEqual({
    messageLength: 5,
    attachmentsCount: 2,
  });
});

it("getComposerMessageMetrics keeps attachment-only sends", () => {
  const metrics = getComposerMessageMetrics({
    isEmpty: false,
    text: "",
    attachments: [{ id: "attachment" }],
  });

  expect(metrics).toEqual({
    messageLength: 0,
    attachmentsCount: 1,
  });
});

it("queueMicrotaskSafe reads state after synchronous updates", async () => {
  let value = 1;

  const captured = await new Promise<number>((resolve) => {
    queueMicrotaskSafe(() => resolve(value));
    value = 2;
  });

  expect(captured).toBe(2);
});

it("run-start tracking keeps separate start times per thread run", () => {
  const runStarts = new Map<string, number[]>();

  recordRunStartedAt(runStarts, "thread-1", 100);
  recordRunStartedAt(runStarts, "thread-1", 200);

  expect(consumeRunStartedAt(runStarts, "thread-1")).toBe(100);
  expect(consumeRunStartedAt(runStarts, "thread-1")).toBe(200);
  expect(consumeRunStartedAt(runStarts, "thread-1")).toBeUndefined();
});

it("run-start cleanup removes only stale entries", () => {
  const runStarts = new Map<string, number[]>();

  recordRunStartedAt(runStarts, "thread-1", 100);
  recordRunStartedAt(runStarts, "thread-1", 300);
  recordRunStartedAt(runStarts, "thread-2", 350);

  pruneStaleRunStarts(runStarts, 400, 150);

  expect(runStarts.get("thread-1")).toEqual([300]);
  expect(runStarts.get("thread-2")).toEqual([350]);
});
