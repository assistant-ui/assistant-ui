import assert from "node:assert/strict";
import test from "node:test";
import { createSettleOutsideAct } from "./testing.mjs";

function harness() {
  const calls = [];
  return {
    calls,
    act: async (callback) => {
      calls.push("act:start");
      await callback();
      calls.push("act:end");
    },
    waitFor: async (callback) => {
      calls.push("waitFor:start");
      await callback();
      calls.push("waitFor:end");
    },
  };
}

test("settles the task between the initial and final act calls", async () => {
  const { calls, act, waitFor } = harness();
  const settleOutsideAct = createSettleOutsideAct(act, waitFor);

  const result = await settleOutsideAct(async () => {
    calls.push("task");
    return 42;
  });

  assert.equal(result, 42);
  assert.deepEqual(calls, [
    "act:start",
    "task",
    "act:end",
    "waitFor:start",
    "waitFor:end",
    "act:start",
    "act:end",
  ]);
});

test("propagates a task rejection from the returned promise", async () => {
  const { act, waitFor } = harness();
  const settleOutsideAct = createSettleOutsideAct(act, waitFor);
  const rejection = new Error("task failed");

  await assert.rejects(
    settleOutsideAct(() => Promise.reject(rejection)),
    (error) => {
      assert.equal(error, rejection);
      return true;
    },
  );
});
