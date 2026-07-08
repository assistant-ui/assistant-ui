import { describe, it, expect, vi } from "vitest";
import { createSerialRunQueue } from "./serialRunQueue";

const gatedRun = () => {
  const gates: Array<() => void> = [];
  const run = vi.fn(async (_payload: string, onComplete: () => void) => {
    await new Promise<void>((resolve) => {
      gates.push(resolve);
    });
    onComplete();
  });
  return { run, gates };
};

describe("createSerialRunQueue", () => {
  it("runs an enqueued payload immediately when idle", async () => {
    const run = vi.fn(async (_payload: string, onComplete: () => void) => {
      onComplete();
    });
    const onRunningChange = vi.fn();
    const queue = createSerialRunQueue({ run, onRunningChange });

    await queue.enqueue("a");

    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[0]).toBe("a");
    expect(onRunningChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it("serializes overlapping enqueues into one continuous running window", async () => {
    const { run, gates } = gatedRun();
    const onRunningChange = vi.fn();
    const queue = createSerialRunQueue({ run, onRunningChange });

    const first = queue.enqueue("a");
    const second = queue.enqueue("b");
    expect(run).toHaveBeenCalledTimes(1);

    gates[0]!();
    await first;
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[1]?.[0]).toBe("b");
    // no falling edge between the two runs
    expect(onRunningChange.mock.calls.map((c) => c[0])).toEqual([true]);

    gates[1]!();
    await second;
    expect(onRunningChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it("drop resolves queued payloads without running them", async () => {
    const { run, gates } = gatedRun();
    const onRunningChange = vi.fn();
    const queue = createSerialRunQueue({ run, onRunningChange });

    const first = queue.enqueue("a");
    const second = queue.enqueue("b");

    queue.drop();
    await second;
    expect(run).toHaveBeenCalledTimes(1);

    gates[0]!();
    await first;
    expect(run).toHaveBeenCalledTimes(1);
    expect(onRunningChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it("a failing run rejects its own promise and drops the payloads behind it", async () => {
    const gates: Array<() => void> = [];
    const run = vi.fn(async (payload: string, onComplete: () => void) => {
      await new Promise<void>((resolve) => {
        gates.push(resolve);
      });
      onComplete();
      if (payload === "a") throw new Error("boom");
    });
    const onRunningChange = vi.fn();
    const queue = createSerialRunQueue({ run, onRunningChange });

    const first = queue.enqueue("a");
    const second = queue.enqueue("b");

    gates[0]!();
    await expect(first).rejects.toThrow("boom");
    await second;
    expect(run).toHaveBeenCalledTimes(1);
    expect(onRunningChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it("recovers after an error: the next enqueue starts a new drain", async () => {
    const run = vi.fn(async (payload: string, onComplete: () => void) => {
      onComplete();
      if (payload === "a") throw new Error("boom");
    });
    const onRunningChange = vi.fn();
    const queue = createSerialRunQueue({ run, onRunningChange });

    await expect(queue.enqueue("a")).rejects.toThrow("boom");
    await queue.enqueue("b");

    expect(run).toHaveBeenCalledTimes(2);
    expect(onRunningChange.mock.lastCall?.[0]).toBe(false);
  });
});
