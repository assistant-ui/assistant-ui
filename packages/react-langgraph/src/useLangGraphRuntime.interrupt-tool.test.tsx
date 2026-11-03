import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useAssistantTool,
} from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { useMemo, type ReactNode } from "react";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
import type { LangChainMessage } from "./types";

const ToolRegistrar = ({
  execute,
}: {
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}) => {
  const tool = useMemo(
    () =>
      ({
        toolName: "lookup",
        type: "frontend",
        parameters: { type: "object", properties: {} },
        execute,
      }) as const,
    [execute],
  );
  useAssistantTool(tool);
  return null;
};

const wrapperWithTool = (
  runtime: AssistantRuntime,
  execute: (args: Record<string, unknown>) => Promise<unknown>,
) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AssistantRuntimeProvider runtime={runtime}>
      <ToolRegistrar execute={execute} />
      {children}
    </AssistantRuntimeProvider>
  );
  Wrapper.displayName = "InterruptToolWrapper";
  return Wrapper;
};

describe("react-langgraph interrupt ownership", () => {
  it("does not run a same-name frontend tool while the graph waits on an interrupt", async () => {
    const streamMock = vi.fn(async function* (
      _messages: LangChainMessage[],
      _config: { runConfig?: unknown },
    ) {
      if (streamMock.mock.calls.length !== 1) return;
      yield {
        event: "messages/complete",
        data: [
          {
            id: "ai-1",
            type: "ai" as const,
            content: "",
            tool_calls: [{ id: "tc-1", name: "lookup", args: {} }],
          },
        ],
      };
      yield {
        event: "updates",
        data: { __interrupt__: [{ value: "approval-needed" }] },
      };
    });
    const execute = vi.fn(async () => ({ ok: true }));

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({ stream: streamMock }),
    );
    const wrapper = wrapperWithTool(runtimeResult.current, execute);
    const { result: auiResult } = renderHook(() => useAui(), { wrapper });

    await act(async () => {
      auiResult.current.composer.setText("hi");
      auiResult.current.composer.send();
    });
    await waitFor(() =>
      expect(auiResult.current.thread.getState().isRunning).toBe(false),
    );

    expect(execute).not.toHaveBeenCalled();
    expect(streamMock).toHaveBeenCalledTimes(1);
  });
});
