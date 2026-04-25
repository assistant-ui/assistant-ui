import { transcript } from "@assistant-ui/chat-test-kit-core";
import { describe, expect, it } from "vitest";
import { createChatTestHarness } from "../harness/harness";

describe("C-tier injections", () => {
  it("inject.disconnect emits a disconnect event", async () => {
    const harness = createChatTestHarness({
      transcript: transcript().toJSON(),
    });

    await harness.inject.disconnect();

    expect(
      harness.getRuntimeSnapshot().events.map((event) => event.type),
    ).toContain("disconnect");
  });

  it("inject.transportError emits a transport-error event with code+message", async () => {
    const harness = createChatTestHarness({
      transcript: transcript().toJSON(),
    });

    await harness.inject.transportError({ code: 503, message: "unavailable" });

    const event = harness
      .getRuntimeSnapshot()
      .events.find((item) => item.type === "transport-error");
    expect(event).toMatchObject({ code: 503, message: "unavailable" });
  });

  it("cancel transitions replayer to cancelled phase", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .assistantStream("hello", { chunks: ["he", "llo"] })
        .toJSON(),
    });

    await harness.advanceChunk();
    await harness.cancel();

    expect(harness.getReplayState().phase).toBe("cancelled");
    expect(harness.getRuntimeSnapshot().abortCount).toBeGreaterThanOrEqual(1);
  });
});
