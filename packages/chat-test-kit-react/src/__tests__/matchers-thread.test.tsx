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
import { thread } from "../matchers/targets";
import { setupChatTestKit } from "../setup";

setupChatTestKit();

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
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Input aria-label="message" />
        <ComposerPrimitive.Send>send</ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

describe("thread() matchers", () => {
  it("toHaveAssistantText matches cumulative assistant text", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("q")
        .assistantStream("AAPL is at $212.44.", {
          finish: { reason: "stop" },
        })
        .toJSON(),
    });

    const user = userEvent.setup();
    render(<App />, { wrapper: harness.wrapper });

    await user.type(screen.getByRole("textbox", { name: "message" }), "q");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(thread().on(harness)).toHaveAssistantText(/AAPL is at/);
  });

  it("toShowError fails when only harness state has an error", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("q")
        .assistantStream("x")
        .inject.transportError({ code: 500, message: "boom" })
        .toJSON(),
    });

    const user = userEvent.setup();
    render(<App />, { wrapper: harness.wrapper });

    await user.type(screen.getByRole("textbox", { name: "message" }), "q");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(() => expect(thread().on(harness)).toShowError(/boom/)).toThrow(
      /error surface/i,
    );
  });
});
