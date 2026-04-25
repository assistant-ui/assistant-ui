import { transcript } from "@assistant-ui/chat-test-kit-core";
import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createChatTestHarness } from "../harness/harness";
import { message, thread } from "../matchers/targets";
import { setupChatTestKit } from "../setup";

setupChatTestKit();

function ChatApp() {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Messages>
        {() => (
          <MessagePrimitive.Root>
            <MessagePrimitive.Parts />
          </MessagePrimitive.Root>
        )}
      </ThreadPrimitive.Messages>
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Input aria-label="message" />
        <ComposerPrimitive.Send>send</ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

describe("integration — A-tier example from v1 roadmap", () => {
  it("renders a streamed assistant reply in response to a user submission", async () => {
    const t = transcript()
      .user("Check AAPL")
      .assistantStream("AAPL is at $212.44.", {
        chunks: ["AAPL is ", "at $212.44."],
        interChunkDelayMs: 20,
        finish: { reason: "stop" },
      })
      .toJSON();
    const harness = createChatTestHarness({ transcript: t });

    const user = userEvent.setup();
    render(<ChatApp />, { wrapper: harness.wrapper });

    await user.type(
      screen.getByRole("textbox", { name: "message" }),
      "Check AAPL",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(thread().on(harness)).toHaveAssistantText(/AAPL is at/);
    expect(message(1).on(harness)).toStreamCompletely();
  });
});
