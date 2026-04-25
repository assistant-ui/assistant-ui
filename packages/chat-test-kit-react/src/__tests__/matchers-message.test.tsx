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
import { message } from "../matchers/targets";
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

describe("message(n) matchers", () => {
  it("toHaveText reads the n-th message text", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("hi there")
        .assistantStream("hello world", { finish: { reason: "stop" } })
        .toJSON(),
    });

    const user = userEvent.setup();
    render(<App />, { wrapper: harness.wrapper });

    await user.type(
      screen.getByRole("textbox", { name: "message" }),
      "hi there",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(message(0)).toHaveText("hi there");
    expect(message(1)).toHaveText("hello world");
  });

  it("toStreamCompletely passes when replay reaches complete", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("go")
        .assistantStream("done", { finish: { reason: "stop" } })
        .toJSON(),
    });

    const user = userEvent.setup();
    render(<App />, { wrapper: harness.wrapper });

    await user.type(screen.getByRole("textbox", { name: "message" }), "go");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(message(1).on(harness)).toStreamCompletely();
  });

  it("toBeInterrupted passes when interrupt was injected", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("go")
        .assistantStream("x")
        .inject.interrupt("user-stop")
        .toJSON(),
    });

    const user = userEvent.setup();
    render(<App />, { wrapper: harness.wrapper });

    await user.type(screen.getByRole("textbox", { name: "message" }), "go");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(message(1).on(harness)).toBeInterrupted();
  });
});
