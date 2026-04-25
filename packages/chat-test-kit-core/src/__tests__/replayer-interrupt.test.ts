import { describe, expect, it } from "vitest";

import { createHeadlessAdapter } from "../adapter/headless";
import { VirtualClock } from "../replayer/clock";
import { Replayer } from "../replayer/replayer";
import { transcript } from "../transcript/builder";

describe("Replayer interrupt", () => {
  it("interrupt aborts and ends in cancelled with the reason", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .user("hi")
        .assistantStream("a")
        .inject.interrupt("user-pressed-stop")
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(r.state.phase).toBe("cancelled");
    expect(r.state.lastError).toEqual({ message: "user-pressed-stop" });
    expect(adapter.getSnapshot().abortCount).toBe(1);
  });
});

describe("Replayer abortAndRestart", () => {
  it("calls abort then resets to turn 0 and continues", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript()
        .user("hi")
        .assistantStream("nope", { chunks: ["no", "pe"] })
        .inject.abortAndRestart()
        .user("retry")
        .toJSON(),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(adapter.getSnapshot().abortCount).toBe(1);
    expect(adapter.getSnapshot().userMessages.map((m) => m[0]?.text)).toEqual([
      "hi",
      "hi",
      "retry",
    ]);
    expect(adapter.getSnapshot().events).toHaveLength(0);
    expect(r.state.phase).toBe("complete");
  });
});
