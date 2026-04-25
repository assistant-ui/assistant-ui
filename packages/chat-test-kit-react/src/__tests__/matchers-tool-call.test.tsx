import { transcript } from "@assistant-ui/chat-test-kit-core";
import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantTool,
} from "@assistant-ui/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createChatTestHarness } from "../harness/harness";
import { setupChatTestKit } from "../setup";
import { toolCall } from "../matchers/targets";

setupChatTestKit();

function ToolApp() {
  useAssistantTool({
    toolName: "get_stock_price",
    description: "x",
    parameters: { type: "object", properties: { ticker: { type: "string" } } },
    execute: async () => ({ price: 0 }),
    render: (part) => (
      <div data-tool-name="get_stock_price">
        {part.result ? JSON.stringify(part.result) : "pending"}
      </div>
    ),
  });

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

describe("toolCall(name) matchers", () => {
  it("toRenderResult passes when the tool result is in the DOM", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("Check AAPL")
        .assistantToolCall("get_stock_price", { ticker: "AAPL" })
        .toolResult({ price: 212.44 })
        .assistantStream("done", { finish: { reason: "stop" } })
        .toJSON(),
    });

    const user = userEvent.setup();
    render(<ToolApp />, { wrapper: harness.wrapper });

    await user.type(
      screen.getByRole("textbox", { name: "message" }),
      "Check AAPL",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(toolCall("get_stock_price")).toRenderResult();
    expect(screen.getByText(/212\.44/)).toBeTruthy();
  });

  it("toHaveReceivedArgs reads from the runtime snapshot via .on(harness)", async () => {
    const harness = createChatTestHarness({
      transcript: transcript()
        .user("Check AAPL")
        .assistantToolCall("get_stock_price", { ticker: "AAPL" })
        .toolResult({ price: 1 })
        .assistantStream("done", { finish: { reason: "stop" } })
        .toJSON(),
    });

    const user = userEvent.setup();
    render(<ToolApp />, { wrapper: harness.wrapper });

    await user.type(
      screen.getByRole("textbox", { name: "message" }),
      "Check AAPL",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));
    await harness.waitForIdle();

    expect(toolCall("get_stock_price").on(harness)).toHaveReceivedArgs({
      ticker: "AAPL",
    });
  });
});
