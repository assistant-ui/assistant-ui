import { transcript } from "@assistant-ui/chat-test-kit-core";
import { describe, expect, it } from "vitest";
import { createChatTestHarness } from "../harness/harness";

describe("C-tier", () => {
  it("advanceChunk emits one chunk per call", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .assistantStream("ab", { chunks: ["a", "b"] })
        .toJSON(),
    });

    await harness.advanceChunk();
    expect(
      harness.getRuntimeSnapshot().events.map((event) => event.type),
    ).toEqual(["text-delta"]);

    await harness.advanceChunk();
    expect(
      harness.getRuntimeSnapshot().events.map((event) => event.type),
    ).toEqual(["text-delta", "text-delta"]);
  });

  it("advanceToolCall runs to the next turn", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .assistantToolCall("get", { ticker: "AAPL" })
        .toolResult({ price: 1 })
        .assistantStream("done", { finish: { reason: "stop" } })
        .toJSON(),
    });

    await harness.advanceToolCall();
    const types = harness
      .getRuntimeSnapshot()
      .events.map((event) => event.type);
    expect(types).toEqual(["tool-call"]);
  });
});
