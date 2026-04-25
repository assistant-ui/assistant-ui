import { transcript } from "@assistant-ui/chat-test-kit-core";
import { describe, expect, it } from "vitest";
import { createChatTestHarness } from "../harness/harness";

describe("waitForIdle", () => {
  it("returns when phase is complete", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .assistantStream("a", { chunks: ["a"], finish: { reason: "stop" } })
        .toJSON(),
    });
    await harness.waitForIdle();
    expect(harness.getReplayState().phase).toBe("complete");
  });

  it("returns when phase is error (transport error injected)", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .assistantStream("a")
        .inject.transportError({ code: 500, message: "boom" })
        .toJSON(),
    });
    await harness.waitForIdle();
    expect(harness.getReplayState().phase).toBe("error");
    expect(harness.getReplayState().lastError).toEqual({
      code: 500,
      message: "boom",
    });
  });

  it("is idempotent — calling twice is safe", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .assistantStream("a", { chunks: ["a"], finish: { reason: "stop" } })
        .toJSON(),
    });
    await harness.waitForIdle();
    await harness.waitForIdle();
    expect(harness.getReplayState().phase).toBe("complete");
  });
});
