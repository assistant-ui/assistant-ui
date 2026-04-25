import { describe, expect, it } from "vitest";

import { createHeadlessAdapter } from "../adapter/headless";
import { VirtualClock } from "../replayer/clock";
import { Replayer } from "../replayer/replayer";
import { transcript } from "../transcript/builder";

describe("Replayer transportError injection", () => {
  it("emits transport-error event and ends in error before target turn runs", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .user("hi")
        .assistantStream("hello", { chunks: ["he", "llo"] })
        .inject.transportError({ code: 500, message: "boom" })
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();

    expect(adapter.getSnapshot().events.map((event) => event.type)).toEqual([
      "transport-error",
    ]);
    expect(r.state.phase).toBe("error");
    expect(r.state.lastError).toEqual({ code: 500, message: "boom" });
    expect(adapter.getSnapshot().userMessages).toHaveLength(1);
  });
});
