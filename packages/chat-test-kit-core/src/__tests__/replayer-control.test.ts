import { describe, expect, it } from "vitest";

import { createHeadlessAdapter } from "../adapter/headless";
import { VirtualClock } from "../replayer/clock";
import { Replayer } from "../replayer/replayer";
import { transcript } from "../transcript/builder";

describe("Replayer construction", () => {
  it("starts idle at turn 0 with no errors and no pending tool calls", () => {
    const r = new Replayer({
      transcript: transcript().user("hi").toJSON(),
      adapter: createHeadlessAdapter(),
      clock: new VirtualClock(),
    });

    expect(r.state).toEqual({
      phase: "idle",
      currentTurnIndex: 0,
      currentChunkIndex: null,
      pendingToolCalls: [],
      lastError: null,
    });
  });

  it("an empty transcript completes immediately on advanceToIdle", async () => {
    const r = new Replayer({
      transcript: transcript().toJSON(),
      adapter: createHeadlessAdapter(),
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(r.state.phase).toBe("complete");
  });
});

describe("Replayer control surface", () => {
  it("tick() advances one observable step (one chunk per tick, cleanup folded)", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .assistantStream("ab", { chunks: ["a", "b"] })
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });

    await r.tick();
    expect(adapter.getSnapshot().events).toHaveLength(1);
    expect(r.state.currentTurnIndex).toBe(0);
    expect(r.state.currentChunkIndex).toBe(0);

    await r.tick();
    expect(adapter.getSnapshot().events).toHaveLength(2);
    expect(r.state.currentTurnIndex).toBe(1);
    expect(r.state.currentChunkIndex).toBeNull();
  });

  it("tick() emits finish as its own step before cleaning up", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .assistantStream("a", { chunks: ["a"], finish: { reason: "stop" } })
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });

    await r.tick();
    expect(adapter.getSnapshot().events.map((e) => e.type)).toEqual([
      "text-delta",
    ]);
    expect(r.state.currentTurnIndex).toBe(0);

    await r.tick();
    expect(adapter.getSnapshot().events.map((e) => e.type)).toEqual([
      "text-delta",
      "finish",
    ]);
    expect(r.state.currentTurnIndex).toBe(1);
    expect(r.state.currentChunkIndex).toBeNull();
  });

  it("advanceToNextTurn() runs exactly one turn", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript().user("a").user("b").toJSON(),
      adapter,
      clock: new VirtualClock(),
    });

    await r.advanceToNextTurn();
    expect(adapter.getSnapshot().userMessages).toHaveLength(1);
    expect(r.state.currentTurnIndex).toBe(1);
  });

  it("advanceToIdle() runs all remaining turns", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript().user("a").user("b").user("c").toJSON(),
      adapter,
      clock: new VirtualClock(),
    });

    await r.advanceToIdle();
    expect(r.state.phase).toBe("complete");
    expect(adapter.getSnapshot().userMessages).toHaveLength(3);
  });
});
