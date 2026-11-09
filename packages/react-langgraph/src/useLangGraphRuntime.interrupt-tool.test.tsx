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
import { useLangGraphInterruptState, useLangGraphSendCommand } from "./hooks";
import type { LangChainMessage } from "./types";

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  ...(await import("../../core/src/react")),
}));

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
  it("holds a call read before the pause and executes it exactly once after resume", async ({
    onTestFinished,
  }) => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    onTestFinished(() => warnSpy.mockRestore());
    const streamMock = vi.fn(async function* (
      _messages: LangChainMessage[],
      _config: { runConfig?: unknown },
    ) {
      if (streamMock.mock.calls.length > 2) {
        yield { event: "updates", data: {} };
        return;
      }
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
      await new Promise((resolve) => setTimeout(resolve, 0));
      yield {
        event: "updates",
        data:
          streamMock.mock.calls.length === 1
            ? { __interrupt__: [{ value: "approval-needed" }] }
            : {},
      };
    });
    const execute = vi.fn(async () => ({ ok: true }));

    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({ stream: streamMock }),
    );
    const seen: { interrupt?: unknown } = {};
    const wrapper = wrapperWithTool(runtimeResult.current, execute, seen);
    const { result: controls } = renderHook(
      () => ({ aui: useAui(), command: useLangGraphSendCommand() }),
      { wrapper },
    );

    await act(async () => {
      controls.current.aui.composer.setText("hi");
      controls.current.aui.composer.send();
    });
    await waitFor(() =>
      expect(controls.current.aui.thread.getState().isRunning).toBe(false),
    );

    await waitFor(() => {
      expect(hasToolCall(runtimeResult.current)).toBe(true);
      expect(seen.interrupt).toBeDefined();
    });

    expect(execute).not.toHaveBeenCalled();
    expect(streamMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await controls.current.command({ resume: "approved" });
    });
    await waitFor(() => {
      expect(seen.interrupt).toBeUndefined();
      expect(execute).toHaveBeenCalledTimes(1);
      expect(streamMock).toHaveBeenCalledTimes(3);
      expect(controls.current.aui.thread.getState().isRunning).toBe(false);
    });
    expect(streamMock.mock.calls[1]?.[1]).toMatchObject({
      command: { resume: "approved" },
    });
    expect(streamMock.mock.calls[2]?.[0]).toEqual([
      expect.objectContaining({
        type: "tool",
        tool_call_id: TOOL_CALL_ID,
        content: '{"ok":true}',
      }),
    ]);
    expect(
      runtimeResult.current.thread
        .getState()
        .messages.find((message) => message.id === "ai-1")?.content,
    ).toContainEqual(
      expect.objectContaining({
        type: "tool-call",
        toolCallId: TOOL_CALL_ID,
        result: '{"ok":true}',
      }),
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
