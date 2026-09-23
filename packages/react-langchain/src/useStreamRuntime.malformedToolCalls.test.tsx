// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import type { ReactNode } from "react";
import type { LangChainBaseMessage } from "./types";
import { useStreamRuntime } from "./useStreamRuntime";

const { mockUseStream, streamController } = vi.hoisted(() => ({
  mockUseStream: vi.fn(),
  streamController: Symbol("STREAM_CONTROLLER"),
}));

vi.mock("@langchain/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@langchain/react")>()),
  STREAM_CONTROLLER: streamController,
  useChannel: vi.fn(() => []),
  useStream: mockUseStream,
}));

// The converter is stubbed to drop null entries so these tests exercise only
// the runtime's own reads of tool_calls.
vi.mock("./convertMessages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./convertMessages")>();
  return {
    ...actual,
    convertLangChainBaseMessage: ((message, metadata) =>
      actual.convertLangChainBaseMessage(
        message.tool_calls
          ? {
              ...message,
              tool_calls: message.tool_calls.filter((call) => call !== null),
            }
          : message,
        metadata,
      )) satisfies typeof actual.convertLangChainBaseMessage,
  };
});

const createMockStream = (messages: LangChainBaseMessage[]) => ({
  messages,
  isLoading: false,
  isThreadLoading: false,
  values: {},
  interrupts: [],
  toolCalls: [],
  subagents: new Map(),
  subgraphs: [],
  error: undefined,
  submit: vi.fn(async (_values: Record<string, unknown>) => {}),
  respond: vi.fn(),
  respondAll: vi.fn(),
  interrupt: vi.fn(),
  stop: vi.fn(),
  client: {},
  [streamController]: {
    messageMetadataStore: { getSnapshot: vi.fn() },
    resolveSubagentNamespace: vi.fn(async () => {}),
    registry: { acquire: vi.fn() },
  },
});

describe("useStreamRuntime with a null tool_calls entry", () => {
  it("sends a new message and cancels the remaining pending call", async () => {
    const stream = createMockStream([
      { id: "human-1", _getType: () => "human", content: "look it up" },
      {
        id: "ai-1",
        _getType: () => "ai",
        content: "",
        tool_calls: [null, { id: "call-1", name: "lookup", args: {} }],
      } as unknown as LangChainBaseMessage,
    ]);
    mockUseStream.mockReturnValue(stream);
    const { result: runtimeResult } = renderHook(() =>
      useStreamRuntime({ apiUrl: "/api" } as never),
    );
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <AssistantRuntimeProvider runtime={runtimeResult.current}>
        {children}
      </AssistantRuntimeProvider>
    );
    const { result: auiResult } = renderHook(() => useAui(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      auiResult.current.composer.setText("never mind");
      await auiResult.current.composer.send();
    });

    await waitFor(() => expect(stream.submit).toHaveBeenCalledTimes(1));
    expect(stream.submit.mock.calls[0]?.[0]).toMatchObject({
      messages: [
        { type: "tool", tool_call_id: "call-1", status: "error" },
        { type: "human", content: "never mind" },
      ],
    });
  });
});
