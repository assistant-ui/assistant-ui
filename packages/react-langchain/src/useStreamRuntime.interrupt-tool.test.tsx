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

it("holds a call paused on an interrupt and runs it once the resumed run settles", async () => {
  const stream = {
    messages: [] as LangChainBaseMessage[],
    isLoading: true,
    isThreadLoading: false,
    values: {},
    interrupts: [] as unknown[],
    interrupt: undefined as unknown,
    toolCalls: [],
    subagents: new Map(),
    subgraphs: [],
    error: undefined,
    submit: vi.fn(async () => {}),
    respond: vi.fn(),
    respondAll: vi.fn(),
    stop: vi.fn(),
    client: {},
    [streamController]: {
      messageMetadataStore: { getSnapshot: vi.fn() },
      resolveSubagentNamespace: vi.fn(async () => {}),
      registry: { acquire: vi.fn() },
    },
  };
  mockUseStream.mockReturnValue(stream);
  const execute = vi.fn(async () => ({ deleted: true }));
  const { result: runtime, rerender } = renderHook(() =>
    useStreamRuntime({ apiUrl: "/api" } as never),
  );
  const Registrar = () => {
    useAssistantTool({
      toolName: "delete_file",
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
  const { rerender: rerenderAui } = renderHook(() => useAui(), {
    wrapper: Wrapper,
  });
  const update = (patch: Partial<typeof stream>) =>
    act(() => {
      Object.assign(stream, patch);
      rerender();
      rerenderAui();
    });

  update({
    messages: [
      {
        id: "ai-1",
        _getType: () => "ai",
        content: "",
        tool_calls: [
          { id: "call_1", name: "delete_file", args: { path: "/tmp/a" } },
        ],
      },
    ],
  });
  const pause = { id: "interrupt-1", value: { action: "delete_file" } };
  update({ isLoading: false, interrupts: [pause], interrupt: pause });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(execute).not.toHaveBeenCalled();
  expect(stream.submit).not.toHaveBeenCalled();

  // Answering the interrupt resumes the graph, which settles without
  // answering the call itself.
  update({ isLoading: true, interrupts: [], interrupt: undefined });
  expect(execute).not.toHaveBeenCalled();
  update({ isLoading: false });
  await waitFor(() => expect(execute).toHaveBeenCalledOnce());
});
