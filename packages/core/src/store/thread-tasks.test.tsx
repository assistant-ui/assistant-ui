// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { afterEach, describe, expect, it } from "vitest";
import type { ThreadMessage } from "../types/message";
import { AssistantRuntimeProvider } from "../react/AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../react/runtimes/useExternalStoreRuntime";
import type { TaskState } from "./scopes/task";

const taskMessage = (
  nestedStatus: { type: "running" } | { type: "complete"; reason: "stop" },
  result?: unknown,
) =>
  ({
    id: "message-1",
    role: "assistant",
    createdAt: new Date(0),
    content: [
      {
        type: "tool-call",
        toolCallId: "delegate-1",
        toolName: "delegate",
        args: { topic: "research" },
        argsText: '{"topic":"research"}',
        ...(result !== undefined ? { result } : undefined),
        messages: [
          {
            id: "nested-message-1",
            role: "assistant",
            createdAt: new Date(0),
            content: [],
            status: nestedStatus,
            metadata: {
              unstable_state: {},
              unstable_annotations: [],
              unstable_data: [],
              steps: [],
              custom: {},
            },
          },
        ],
      },
    ],
    status: nestedStatus,
    metadata: {
      unstable_state: {},
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as ThreadMessage;

afterEach(cleanup);

describe("thread tasks", () => {
  it("exposes task state and accessors through an external-store runtime", async () => {
    const captured: {
      tasks?: readonly TaskState[];
      byId?: TaskState;
      byIndex?: TaskState;
    } = {};

    const Probe = () => {
      const tasks = useAuiState((s) => s.thread.tasks);
      const aui = useAui();
      captured.tasks = tasks;
      if (tasks.length > 0) {
        captured.byId = aui.thread.task({ id: "delegate-1" }).getState();
        captured.byIndex = aui.thread.task({ index: 0 }).getState();
      }
      return null;
    };

    const App = ({ messages }: { messages: readonly ThreadMessage[] }) => {
      const runtime = useExternalStoreRuntime({
        messages,
        convertMessage: (message) => message,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Probe />
        </AssistantRuntimeProvider>
      );
    };

    const view = render(<App messages={[taskMessage({ type: "running" })]} />);

    await waitFor(() => expect(captured.tasks).toHaveLength(1));
    expect(captured.tasks?.[0]).toMatchObject({
      status: { type: "running" },
      toolName: "delegate",
    });
    expect(captured.byId).toMatchObject({ messageId: "message-1" });
    expect(captured.byIndex).toBe(captured.byId);

    view.rerender(
      <App
        messages={[taskMessage({ type: "complete", reason: "stop" }, "done")]}
      />,
    );

    await waitFor(() =>
      expect(captured.tasks?.[0]?.status).toEqual({ type: "complete" }),
    );
    expect(captured.tasks?.[0]).toMatchObject({
      toolName: "delegate",
      messageId: "message-1",
      result: "done",
    });
    expect(captured.tasks?.[0]?.messages).toHaveLength(1);
  });

  it("survives nested payloads that repeat ids and resolves the first task in document order", async () => {
    const nested = (id: string, toolCallId: string) =>
      ({
        id,
        role: "assistant",
        createdAt: new Date(0),
        content: [
          {
            type: "tool-call",
            toolCallId,
            toolName: "search",
            args: {},
            argsText: "{}",
            result: "ok",
            messages: [],
          },
        ],
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: {},
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      }) as ThreadMessage;
    const message = {
      id: "message-1",
      role: "assistant",
      createdAt: new Date(0),
      content: [
        {
          type: "tool-call",
          toolCallId: "delegate-a",
          toolName: "delegate",
          args: {},
          argsText: "{}",
          result: "ok",
          messages: [nested("nested", "call_1")],
        },
        {
          type: "tool-call",
          toolCallId: "delegate-b",
          toolName: "delegate",
          args: {},
          argsText: "{}",
          result: "ok",
          messages: [nested("nested", "call_1")],
        },
      ],
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: {},
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    } as ThreadMessage;
    const captured: { ids?: readonly string[]; first?: TaskState } = {};
    const Probe = () => {
      const tasks = useAuiState((s) => s.thread.tasks);
      const aui = useAui();
      captured.ids = tasks.map((task) => task.id);
      if (tasks.length === 4) {
        captured.first = aui.thread.task({ id: "call_1" }).getState();
      }
      return null;
    };
    const App = () => {
      const runtime = useExternalStoreRuntime({
        messages: [message],
        convertMessage: (m) => m,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Probe />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);

    await waitFor(() => expect(captured.ids).toHaveLength(4));
    expect(captured.ids).toEqual([
      "delegate-a",
      "call_1",
      "delegate-b",
      "call_1",
    ]);
    expect(captured.first).toMatchObject({ parentTaskId: "delegate-a" });
  });
});
