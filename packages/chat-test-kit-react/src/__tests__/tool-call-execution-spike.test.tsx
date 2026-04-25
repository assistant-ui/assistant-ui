// @vitest-environment jsdom
import { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantTool,
  useLocalRuntime,
  type AssistantRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { describe, expect, it, vi } from "vitest";

function MinimalAppWithTool({
  adapter,
  runtimeRef,
  executeSpy,
}: {
  adapter: ChatModelAdapter;
  runtimeRef: { current: AssistantRuntime | null };
  executeSpy: ReturnType<typeof vi.fn>;
}) {
  const runtime = useLocalRuntime(adapter);
  runtimeRef.current = runtime;
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ToolRegistration executeSpy={executeSpy} />
      <ThreadPrimitive.Root>
        <ThreadPrimitive.Messages>
          {() => (
            <MessagePrimitive.Root>
              <MessagePrimitive.Parts />
            </MessagePrimitive.Root>
          )}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

function ToolRegistration({
  executeSpy,
}: {
  executeSpy: ReturnType<typeof vi.fn>;
}) {
  useAssistantTool({
    toolName: "get_stock_price",
    description: "Get a stock price",
    parameters: { type: "object", properties: { ticker: { type: "string" } } },
    execute: executeSpy as unknown as (args: unknown) => Promise<unknown>,
    render: (part) => (
      <div data-testid="tool-render">
        result={JSON.stringify(part.result ?? null)}
      </div>
    ),
  });
  return null;
}

describe("tool-call delivery via yielded content with result", () => {
  it("renders tool result without invoking useAssistantTool execute", async () => {
    const executeSpy = vi.fn();

    const adapter: ChatModelAdapter = {
      run: async function* () {
        yield {
          content: [
            {
              type: "tool-call",
              toolCallId: "tc_1",
              toolName: "get_stock_price",
              args: { ticker: "AAPL" },
              argsText: '{"ticker":"AAPL"}',
            },
          ],
        };
        yield {
          content: [
            {
              type: "tool-call",
              toolCallId: "tc_1",
              toolName: "get_stock_price",
              args: { ticker: "AAPL" },
              argsText: '{"ticker":"AAPL"}',
              result: { price: 212.44 },
            },
          ],
          status: { type: "complete", reason: "stop" },
        };
      },
    };

    const runtimeRef: { current: AssistantRuntime | null } = { current: null };
    render(
      <MinimalAppWithTool
        adapter={adapter}
        runtimeRef={runtimeRef}
        executeSpy={executeSpy}
      />,
    );

    await act(async () => {
      runtimeRef.current!.thread.append({
        role: "user",
        content: [{ type: "text", text: "Check AAPL" }],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("tool-render").textContent).toContain(
        '"price":212.44',
      );
    });

    expect(executeSpy).not.toHaveBeenCalled();
  });
});
