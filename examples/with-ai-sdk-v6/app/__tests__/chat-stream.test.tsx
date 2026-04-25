import {
  createChatTestHarness,
  message,
  setupChatTestKit,
  thread,
  transcript,
} from "@assistant-ui/chat-test-kit-react";
import { useAssistantRuntime } from "@assistant-ui/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Home from "../page";

vi.mock("@assistant-ui/react-ai-sdk", () => {
  return {
    useChatRuntime: () => useAssistantRuntime(),
  };
});

setupChatTestKit();

describe("with-ai-sdk-v6 chat-test-kit dogfood", () => {
  it("replays a streamed assistant response", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("Check AAPL")
        .assistantStream("AAPL is at $212.44.", {
          chunks: ["AAPL is ", "at $212.44."],
          interChunkDelayMs: 20,
          finish: { reason: "stop" },
        })
        .toJSON(),
    });

    const user = userEvent.setup();
    render(<Home />, { wrapper: harness.wrapper });

    await user.type(screen.getByRole("textbox"), "Check AAPL");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(thread().on(harness)).toHaveAssistantText(/AAPL is at/);
    expect(message(1).on(harness)).toStreamCompletely();
  });
});
