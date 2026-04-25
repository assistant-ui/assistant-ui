import { describe, expect, it } from "vitest";

import { createHeadlessAdapter } from "../adapter/headless";
import { VirtualClock } from "../replayer/clock";
import { Replayer } from "../replayer/replayer";
import { transcript } from "../transcript/builder";

describe("Replayer user turns", () => {
  it("forwards user content to adapter.sendUserMessage", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript().user("hi").toJSON(),
      adapter,
      clock: new VirtualClock(),
    });

    await r.advanceToIdle();

    expect(adapter.getSnapshot().userMessages).toEqual([
      [{ type: "text", text: "hi" }],
    ]);
    expect(r.state.phase).toBe("complete");
    expect(r.state.currentTurnIndex).toBe(1);
  });

  it("forwards multiple user turns in order", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: transcript().user("a").user("b").toJSON(),
      adapter,
      clock: new VirtualClock(),
    });

    await r.advanceToIdle();

    expect(adapter.getSnapshot().userMessages.map((m) => m[0]?.text)).toEqual([
      "a",
      "b",
    ]);
  });
});
