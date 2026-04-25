import {
  createChatTestHarness,
  setupChatTestKit,
  thread,
  toolCall,
  transcript,
} from "@assistant-ui/chat-test-kit-react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Home from "../page";

setupChatTestKit();

function priceSnapshotTranscript() {
  return transcript()
    .user("What is AAPL?")
    .assistantToolCall(
      "price_snapshot",
      { ticker: "AAPL" },
      { toolCallId: "tc_1" },
    )
    .toolResult(
      JSON.stringify({
        snapshot: {
          price: 212.44,
          day_change: 1.2,
          day_change_percent: 0.57,
          time: "2026-04-25T10:00:00.000Z",
        },
      }),
    )
    .assistantStream("AAPL is $212.44.", {
      chunks: ["AAPL is ", "$212.44."],
      finish: { reason: "stop" },
    })
    .toJSON();
}

describe("with-langgraph chat-test-kit dogfood", () => {
  it("replays tool call args and rendered result", async () => {
    const harness = createChatTestHarness({
      transcript: priceSnapshotTranscript(),
    });

    const user = userEvent.setup();
    render(<Home />, { wrapper: harness.wrapper });

    await user.type(screen.getByRole("textbox"), "What is AAPL?");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(toolCall("price_snapshot").on(harness)).toHaveReceivedArgs({
      ticker: "AAPL",
    });
    expect(toolCall("price_snapshot")).toRenderResult();
  });

  it("supports C-tier step progression through tool and stream phases", async () => {
    const harness = createChatTestHarness({
      transcript: priceSnapshotTranscript(),
      autoAdvance: false,
    });

    const user = userEvent.setup();
    render(<Home />, { wrapper: harness.wrapper });

    await user.type(screen.getByRole("textbox"), "What is AAPL?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await harness.advanceToolCall();
    await harness.advanceToolCall();
    await harness.advanceToolCall();
    await harness.advanceChunk();

    expect(thread().on(harness)).toHaveAssistantText("AAPL is ");

    await harness.waitForIdle();
  });
});
