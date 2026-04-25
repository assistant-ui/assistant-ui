import { describe, expect, it } from "vitest";

import { createHeadlessAdapter } from "../adapter/headless";
import { VirtualClock } from "../replayer/clock";
import { Replayer } from "../replayer/replayer";
import { transcript } from "../transcript/builder";

describe("Replayer cancel", () => {
  it("explicit cancel() sets phase to cancelled and calls adapter.abort once", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .user("hi")
        .assistantStream("hello", { chunks: ["he", "llo"] })
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });

    await r.tick();
    await r.tick();
    await r.cancel();

    expect(r.state.phase).toBe("cancelled");
    expect(adapter.getSnapshot().abortCount).toBe(1);
  });

  it("cancel injection at a turn triggers cancel before that turn runs", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .user("hi")
        .assistantStream("hello", { chunks: ["he", "llo"] })
        .inject.cancel()
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });

    await r.advanceToIdle();
    expect(r.state.phase).toBe("cancelled");
    expect(adapter.getSnapshot().userMessages).toHaveLength(1);
    expect(adapter.getSnapshot().events).toHaveLength(0);
    expect(adapter.getSnapshot().abortCount).toBe(1);
  });

  it("further ticks after cancel are no-ops", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript().user("hi").user("two").toJSON(),
      adapter,
      clock: new VirtualClock(),
    });
    await r.cancel();
    await r.tick();
    await r.advanceToIdle();
    expect(adapter.getSnapshot().userMessages).toHaveLength(0);
  });
});
