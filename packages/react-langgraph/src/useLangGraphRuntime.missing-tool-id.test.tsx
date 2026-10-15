// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  useAssistantTool,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { type ReactNode } from "react";
import { expect, it, vi } from "vitest";
import type { LangChainMessage } from "./types";
import { useLangGraphRuntime } from "./useLangGraphRuntime";

it("fails a final idless frontend tool call locally without executing or resuming", async () => {
  const stream = vi.fn(async function* (_messages: LangChainMessage[]) {
    yield {
      event: "messages/complete",
      data: [
        {
          id: "ai-1",
          type: "ai" as const,
          content: "",
          tool_calls: [{ name: "lookup", args: {} }],
        },
      ],
    };
  });
  const execute = vi.fn(async () => ({ answer: 42 }));
  const { result: runtime } = renderHook(() => useLangGraphRuntime({ stream }));
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
  const { result: aui } = renderHook(() => useAui(), { wrapper: Wrapper });

  act(() => {
    aui.current.composer.setText("hello");
    aui.current.composer.send();
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
  expect(stream).toHaveBeenCalledTimes(1);
});

it("leaves an idless call pending while streaming and accepts the provider's later id", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const stream = vi.fn(async function* (_messages: LangChainMessage[]) {
    yield {
      event: "messages/partial",
      data: [
        {
          id: "ai-1",
          type: "ai" as const,
          content: "",
          tool_calls: [{ name: "lookup", args: {} }],
        },
      ],
    };
    await gate;
    yield {
      event: "messages/complete",
      data: [
        {
          id: "ai-1",
          type: "ai" as const,
          content: "",
          tool_calls: [{ id: "issued-id", name: "lookup", args: {} }],
        },
      ],
    };
  });
  const execute = vi.fn(async () => ({ answer: 42 }));
  const { result: runtime } = renderHook(() => useLangGraphRuntime({ stream }));
  const Registrar = () => {
    useAssistantTool({
      toolName: "lookup",
      type: "frontend",
      parameters: { type: "object", properties: {} },
      execute,
    });
    return null;
  };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AssistantRuntimeProvider runtime={runtime.current}>
      <Registrar />
      {children}
    </AssistantRuntimeProvider>
  );
  const { result: aui } = renderHook(() => useAui(), { wrapper: Wrapper });

  act(() => {
    aui.current.composer.setText("hello");
    aui.current.composer.send();
  });
  await waitFor(() =>
    expect(
      aui.current.thread
        .getState()
        .messages.at(-1)
        ?.content.find((item) => item.type === "tool-call"),
    ).toBeDefined(),
  );
  const streamingPart = aui.current.thread
    .getState()
    .messages.at(-1)
    ?.content.find((item) => item.type === "tool-call");
  expect(streamingPart).not.toHaveProperty("result");
  expect(streamingPart).not.toHaveProperty("isError");
  expect(execute).not.toHaveBeenCalled();

  await act(async () => {
    release();
  });
  await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
  expect(stream.mock.calls[1]?.[0]).toMatchObject([
    { type: "tool", tool_call_id: "issued-id" },
  ]);
});
