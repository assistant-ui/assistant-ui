import { describe, expect, it } from "vitest";

import { createHeadlessAdapter } from "../adapter/headless";
import { VirtualClock } from "../replayer/clock";
import { Replayer } from "../replayer/replayer";
import { transcript } from "../transcript/builder";

describe("Replayer assistantStream", () => {
  it("emits one text-delta per chunk in order", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .user("q")
        .assistantStream("hello world", { chunks: ["hello ", "world"] })
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(adapter.getSnapshot().events).toEqual([
      { type: "text-delta", delta: "hello " },
      { type: "text-delta", delta: "world" },
    ]);
  });

  it("consumes interChunkDelayMs from the virtual clock between chunks", async () => {
    const clock = new VirtualClock();
    const r = new Replayer({
      transcript: transcript()
        .assistantStream("ab", { chunks: ["a", "b"], interChunkDelayMs: 50 })
        .toJSON(),
      adapter: createHeadlessAdapter(),
      clock,
    });
    await r.advanceToIdle();
    expect(clock.now()).toBe(50);
  });

  it("emits a finish event when the turn declares finish", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .assistantStream("hi", { finish: { reason: "stop" } })
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(adapter.getSnapshot().events.map((event) => event.type)).toEqual([
      "text-delta",
      "finish",
    ]);
  });

  it("does not emit finish when finish is omitted", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript().assistantStream("hi").toJSON(),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(adapter.getSnapshot().events.map((event) => event.type)).toEqual([
      "text-delta",
    ]);
  });
});
