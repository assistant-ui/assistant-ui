// @vitest-environment jsdom

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
import { useLangGraphInterruptState } from "./hooks";
import type { LangChainMessage } from "./types";

const TOOL_CALL_ID = "tc-1";

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

/** Reads the pause out of the runtime extras, the way an app would. */
const InterruptProbe = ({ seen }: { seen: { interrupt?: unknown } }) => {
  seen.interrupt = useLangGraphInterruptState();
  return null;
};

const wrapperWithTool = (
  runtime: AssistantRuntime,
  execute: (args: Record<string, unknown>) => Promise<unknown>,
  seen: { interrupt?: unknown },
) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AssistantRuntimeProvider runtime={runtime}>
      <ToolRegistrar execute={execute} />
      <InterruptProbe seen={seen} />
      {children}
    </AssistantRuntimeProvider>
  );
  Wrapper.displayName = "InterruptToolWrapper";
  return Wrapper;
};

const hasToolCall = (runtime: AssistantRuntime) =>
  runtime.thread
    .getState()
    .messages.some(
      (message) =>
        message.role === "assistant" &&
        message.content.some(
          (part) =>
            part.type === "tool-call" && part.toolCallId === TOOL_CALL_ID,
        ),
    );

describe("react-langgraph interrupt ownership", () => {
  it("does not run a same-name frontend tool when the call is read before the pause", async () => {
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
            tool_calls: [{ id: TOOL_CALL_ID, name: "lookup", args: {} }],
          },
        ],
      };
      // A real stream reaches the client in separate reads: React renders the
      // tool node's message before `__interrupt__` arrives, so the call is
      // observed while the pause is still unknown.
      await new Promise((resolve) => setTimeout(resolve, 0));
      yield {
        event: "updates",
        data: { __interrupt__: [{ value: "approval-needed" }] },
      };
    });
    const execute = vi.fn(async () => ({ ok: true }));

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({ stream: streamMock }),
    );
    const seen: { interrupt?: unknown } = {};
    const wrapper = wrapperWithTool(runtimeResult.current, execute, seen);
    const { result: auiResult } = renderHook(() => useAui(), { wrapper });

    await act(async () => {
      auiResult.current.composer.setText("hi");
      auiResult.current.composer.send();
    });
    await waitFor(() =>
      expect(auiResult.current.thread.getState().isRunning).toBe(false),
    );

    // Both halves of the pause reached the thread, so the assertion below is
    // about the tool that was held rather than about an event being dropped.
    await waitFor(() => {
      expect(hasToolCall(runtimeResult.current)).toBe(true);
      expect(seen.interrupt).toBeDefined();
    });

    expect(execute).not.toHaveBeenCalled();
    expect(streamMock).toHaveBeenCalledTimes(1);
  });
});
