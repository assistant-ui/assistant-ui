import { transcript } from "@assistant-ui/chat-test-kit-core";
import { MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createChatTestHarness } from "../harness/harness";

describe("auto-advance on user submit", () => {
  it("drives the replayer to idle after yields a streamed reply", async () => {
    const t = transcript()
      .user("hi")
      .assistantStream("hello world", {
        chunks: ["hello ", "world"],
        finish: { reason: "stop" },
      })
      .toJSON();
    const harness = createChatTestHarness({ transcript: t });

    function App() {
      return (
        <ThreadPrimitive.Root>
          <ThreadPrimitive.Messages>
            {() => (
              <MessagePrimitive.Root>
                <MessagePrimitive.Parts />
              </MessagePrimitive.Root>
            )}
          </ThreadPrimitive.Messages>
        </ThreadPrimitive.Root>
      );
    }

    render(<App />, { wrapper: harness.wrapper });

    await harness.waitForIdle();

    expect(harness.getReplayState().phase).toBe("complete");
    expect(
      harness.getRuntimeSnapshot().events.map((event) => event.type),
    ).toEqual(["text-delta", "text-delta", "finish"]);
  });
});
