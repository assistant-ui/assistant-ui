import {
  createChatTestHarness,
  message,
  setupChatTestKit,
  thread,
  transcript,
  type ChatTestHarness,
} from "@assistant-ui/chat-test-kit-react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import Home from "../page";

vi.mock("../MyRuntimeProvider", () => {
  return {
    MyRuntimeProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

function ErrorSurface({ harness }: { harness: ChatTestHarness }) {
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const state = harness.getReplayState();
      if (state.phase === "error" && state.lastError) {
        setErrorText(state.lastError.message);
      }
    }, 10);

    return () => {
      window.clearInterval(id);
    };
  }, [harness]);

  if (!errorText) return null;

  return <div data-testid="aui-error">{errorText}</div>;
}

setupChatTestKit();

describe("with-assistant-transport chat-test-kit dogfood", () => {
  it("marks a message interrupted when cancelled mid-stream", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("Weather in SF")
        .assistantStream("Checking weather...", {
          chunks: ["Checking ", "weather..."],
          interChunkDelayMs: 20,
        })
        .toJSON(),
      autoAdvance: false,
    });

    const user = userEvent.setup();
    render(
      <>
        <Home />
        <ErrorSurface harness={harness} />
      </>,
      { wrapper: harness.wrapper },
    );

    await user.type(screen.getByRole("textbox"), "Weather in SF");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await harness.advanceToolCall();
    await harness.advanceChunk();
    await harness.cancel();

    expect(message(1).on(harness)).toBeInterrupted();
  });

  it("surfaces disconnect and transport failures", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("Weather in SF")
        .assistantStream("Let me check that", {
          chunks: ["Let me ", "check that"],
        })
        .inject.disconnect({ afterChunk: 1 })
        .toJSON(),
    });

    const user = userEvent.setup();
    render(
      <>
        <Home />
        <ErrorSurface harness={harness} />
      </>,
      { wrapper: harness.wrapper },
    );

    await user.type(screen.getByRole("textbox"), "Weather in SF");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(message(1).on(harness)).toBeInterrupted();

    await waitFor(() => {
      expect(thread()).toShowError(/disconnected/i);
    });
  });

  it("surfaces transport error code/message", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("Weather in SF")
        .assistantStream("Let me check that")
        .inject.transportError({ code: 500, message: "transport down" })
        .toJSON(),
    });

    const user = userEvent.setup();
    render(
      <>
        <Home />
        <ErrorSurface harness={harness} />
      </>,
      { wrapper: harness.wrapper },
    );

    await user.type(screen.getByRole("textbox"), "Weather in SF");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    await waitFor(() => {
      expect(thread()).toShowError(/transport down/i);
    });
  });
});
