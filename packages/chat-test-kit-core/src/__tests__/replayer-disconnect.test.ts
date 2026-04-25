import { describe, expect, it } from "vitest";

import { createHeadlessAdapter } from "../adapter/headless";
import { VirtualClock } from "../replayer/clock";
import { Replayer } from "../replayer/replayer";
import { transcript } from "../transcript/builder";

describe("Replayer disconnect injection", () => {
  it("emits disconnect event after the configured chunk and stops the stream", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .assistantStream("hello world", { chunks: ["hello ", "world"] })
        .inject.disconnect({ afterChunk: 0 })
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();

    expect(adapter.getSnapshot().events.map((event) => event.type)).toEqual([
      "text-delta",
      "disconnect",
    ]);
    expect(r.state.phase).toBe("error");
    expect(r.state.lastError?.message).toMatch(/disconnected/i);
  });

  it("disconnect after the last chunk still emits disconnect and ends in error", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .assistantStream("ab", { chunks: ["a", "b"] })
        .inject.disconnect({ afterChunk: 1 })
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(adapter.getSnapshot().events.map((event) => event.type)).toEqual([
      "text-delta",
      "text-delta",
      "disconnect",
    ]);
  });
});
