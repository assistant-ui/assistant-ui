// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  useAssistantTool,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { type ReactNode } from "react";
import { expect, it, vi } from "vitest";
import type { LangChainBaseMessage } from "./types";

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

import { useStreamRuntime } from "./useStreamRuntime";

it("fails a final idless frontend tool call locally without executing or submitting it", async () => {
  const stream = {
    messages: [] as LangChainBaseMessage[],
    isLoading: true,
    isThreadLoading: false,
    values: {},
    interrupts: [],
    toolCalls: [],
    subagents: new Map(),
    subgraphs: [],
    error: undefined,
    submit: vi.fn(async () => {}),
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
  };
  mockUseStream.mockReturnValue(stream);
  const execute = vi.fn(async () => ({ answer: 42 }));
  const { result: runtime, rerender } = renderHook(() =>
    useStreamRuntime({ apiUrl: "/api" } as never),
  );
  const Registrar = () => {
    useAssistantTool({
      toolName: "lookup",
      type: "frontend",
      parameters: { type: "object", properties: {} },
      execute,
    });
    return null;
  };
  const Wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <AssistantRuntimeProvider runtime={runtime.current}>
        <Registrar />
        {children}
      </AssistantRuntimeProvider>
    );
  };
  const { result: aui, rerender: rerenderAui } = renderHook(() => useAui(), {
    wrapper: Wrapper,
  });

  act(() => {
    stream.messages = [
      {
        id: "ai-1",
        _getType: () => "ai",
        content: "",
        tool_calls: [{ name: "lookup", args: {} } as never],
      },
    ];
    rerender();
    rerenderAui();
  });
  const streamingPart = aui.current.thread
    .getState()
    .messages.at(-1)
    ?.content.find((item) => item.type === "tool-call");
  expect(streamingPart).toMatchObject({
    type: "tool-call",
    toolName: "lookup",
  });
  expect(streamingPart).not.toHaveProperty("result");
  expect(streamingPart).not.toHaveProperty("isError");
  expect(execute).not.toHaveBeenCalled();

  act(() => {
    stream.isLoading = false;
    rerender();
    rerenderAui();
  });

  await waitFor(() => {
    const part = aui.current.thread
      .getState()
      .messages.at(-1)
      ?.content.find((item) => item.type === "tool-call");
    expect(part).toMatchObject({
      type: "tool-call",
      toolName: "lookup",
      result: "The provider sent this tool call without an id.",
      isError: true,
    });
  });
  expect(execute).not.toHaveBeenCalled();
  expect(stream.submit).not.toHaveBeenCalled();
});

it("keeps an idless call's UI id when an idless message finishes streaming", async () => {
  const message: LangChainBaseMessage = {
    _getType: () => "ai",
    content: "",
    tool_calls: [{ name: "lookup", args: {} } as never],
  };
  const stream = {
    messages: [] as LangChainBaseMessage[],
    isLoading: true,
    isThreadLoading: false,
    values: {},
    interrupts: [],
    toolCalls: [],
    subagents: new Map(),
    subgraphs: [],
    error: undefined,
    submit: vi.fn(async () => {}),
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
  };
  mockUseStream.mockReturnValue(stream);
  const streamCall = vi.fn(async () => {});
  const { result: runtime, rerender } = renderHook(() =>
    useStreamRuntime({ apiUrl: "/api" } as never),
  );
  const Registrar = () => {
    useAssistantTool({
      toolName: "lookup",
      type: "frontend",
      parameters: { type: "object", properties: {} },
      streamCall,
    });
    return null;
  };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AssistantRuntimeProvider runtime={runtime.current}>
      <Registrar />
      {children}
    </AssistantRuntimeProvider>
  );
  const { result: aui, rerender: rerenderAui } = renderHook(() => useAui(), {
    wrapper: Wrapper,
  });
  const getCall = () =>
    aui.current.thread
      .getState()
      .messages.at(-1)
      ?.content.find((part) => part.type === "tool-call");

  act(() => {
    stream.messages = [message];
    rerender();
    rerenderAui();
  });
  await waitFor(() => expect(streamCall).toHaveBeenCalledTimes(1));
  const streamingCallId = getCall()?.toolCallId;
  expect(streamingCallId).toBeTruthy();

  act(() => {
    stream.isLoading = false;
    rerender();
    rerenderAui();
  });
  await waitFor(() =>
    expect(getCall()).toMatchObject({
      toolCallId: streamingCallId,
      result: "The provider sent this tool call without an id.",
      isError: true,
    }),
  );
  expect(streamCall).toHaveBeenCalledTimes(1);
  expect(stream.submit).not.toHaveBeenCalled();
});
