// @vitest-environment jsdom

import { act, render, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
import { useLangGraphSend } from "./hooks";
import type { ReactNode } from "react";
import { mockStreamCallbackFactory } from "./testUtils";

const emptyStream = () => vi.fn(() => mockStreamCallbackFactory([])());

const createThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "thread-1",
        externalId: "thread-1",
        title: "Thread",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "thread-1",
    externalId: "thread-1",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream()),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "thread-1",
    externalId: "thread-1",
  })),
});

const metadataEvent = {
  event: "metadata",
  data: { thread_id: "123", run_attempt: 1 },
};

const aiWith = (ids: string[]) => ({
  event: "messages/partial",
  data: [
    {
      id: "calls",
      type: "ai" as const,
      content: [],
      tool_calls: ids.map((id, index) => ({
        id,
        index,
        name: "ask",
        args: {},
        args_json: "{}",
      })),
      tool_call_chunks: ids.map((id, index) => ({
        id,
        index,
        name: "ask",
        args_json: "{}",
      })),
    },
  ],
});

describe("useLangGraphRuntime parallel tool results", () => {
  it("holds a tool result while the producing run can still add tool calls", async () => {
    const sent: unknown[][] = [];
    let resolveSecondCall!: () => void;
    const secondCall = new Promise<void>((resolve) => {
      resolveSecondCall = resolve;
    });
    let call = 0;
    const stream = vi.fn(async function* (messages: unknown[]) {
      sent.push(messages);
      if (call++ === 0) {
        yield metadataEvent;
        yield aiWith(["c1"]);
        await secondCall;
        yield aiWith(["c1", "c2"]);
      }
    });

    const host = renderHook(() =>
      useLangGraphRuntime({ stream: emptyStream() }),
    );
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const Nested = () => {
      capture.runtime = useLangGraphRuntime({
        stream,
        unstable_threadListAdapter: createThreadListAdapter(),
      });
      return null;
    };
    render(
      <AssistantRuntimeProvider runtime={host.result.current}>
        <Nested />
      </AssistantRuntimeProvider>,
    );

    const runtime = capture.runtime!;

    act(() => {
      runtime.thread.append("go");
    });

    await waitForCall(runtime, "c1");

    const assistantIndex = runtime.thread
      .getState()
      .messages.findIndex((m) => m.role === "assistant");
    expect(assistantIndex).toBeGreaterThanOrEqual(0);
    act(() => {
      runtime.thread
        .getMessageByIndex(assistantIndex)
        .getMessagePartByToolCallId("c1")
        .addToolResult({ ok: 1 });
    });

    act(() => resolveSecondCall());
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    expect(sent.length).toBe(1);

    await waitFor(() => {
      expect(
        runtime.thread
          .getState()
          .messages.some(
            (m) =>
              m.role === "assistant" &&
              (m.content ?? []).some(
                (p: any) => p?.type === "tool-call" && p?.toolCallId === "c2",
              ),
          ),
      ).toBe(true);
    });

    act(() => {
      runtime.thread
        .getMessageByIndex(assistantIndex)
        .getMessagePartByToolCallId("c2")
        .addToolResult({ ok: 2 });
    });

    await waitFor(() => {
      expect(sent.length).toBe(2);
    });

    const resumed = sent[1]!;
    const toolMessages = resumed.filter(
      (m) => (m as { type?: string }).type === "tool",
    );
    expect(toolMessages).toHaveLength(2);
    expect(
      toolMessages.map((m) => (m as { tool_call_id: string }).tool_call_id),
    ).toEqual(["c1", "c2"]);
  });

  const mount = (stream: (messages: unknown[]) => AsyncGenerator<any>) => {
    const host = renderHook(() =>
      useLangGraphRuntime({ stream: emptyStream() }),
    );
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const Nested = () => {
      capture.runtime = useLangGraphRuntime({
        stream,
        unstable_threadListAdapter: createThreadListAdapter(),
      });
      return null;
    };
    render(
      <AssistantRuntimeProvider runtime={host.result.current}>
        <Nested />
      </AssistantRuntimeProvider>,
    );
    return capture.runtime!;
  };

  const addResult = (runtime: AssistantRuntime, id: string) => {
    const index = runtime.thread
      .getState()
      .messages.findIndex((message) =>
        message.content.some(
          (part) => part.type === "tool-call" && part.toolCallId === id,
        ),
      );
    runtime.thread
      .getMessageByIndex(index)
      .getMessagePartByToolCallId(id)
      .addToolResult({ ok: true });
  };

  const waitForCall = (runtime: AssistantRuntime, id: string) =>
    waitFor(() => {
      expect(
        runtime.thread
          .getState()
          .messages.some((message) =>
            message.content.some(
              (part) => part.type === "tool-call" && part.toolCallId === id,
            ),
          ),
      ).toBe(true);
    });

  it("releases a buffered client result when its server sibling has a result", async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const sent: unknown[][] = [];
    const stream = vi.fn(async function* (messages: unknown[]) {
      sent.push(messages);
      if (sent.length !== 1) return;
      yield metadataEvent;
      yield aiWith(["s1", "c1"]);
      await gate;
      yield {
        event: "messages/complete",
        data: [
          {
            id: "server-result",
            type: "tool",
            tool_call_id: "s1",
            content: "done",
          },
        ],
      };
    });
    const runtime = mount(stream);
    act(() => {
      runtime.thread.append("go");
    });
    await waitForCall(runtime, "c1");
    act(() => addResult(runtime, "c1"));
    act(() => finish());
    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]).toMatchObject([{ type: "tool", tool_call_id: "c1" }]);
  });

  it("flushes a call added to an existing assistant message by its own run", async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const sent: unknown[][] = [];
    const stream = vi.fn(async function* (messages: unknown[]) {
      sent.push(messages);
      yield metadataEvent;
      if (sent.length === 1) yield aiWith(["c0"]);
      if (sent.length === 2) {
        yield aiWith(["c0", "c1"]);
        await gate;
      }
    });
    const runtime = mount(stream);
    act(() => runtime.thread.append("go"));
    await waitForCall(runtime, "c0");
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    act(() => addResult(runtime, "c0"));
    await waitForCall(runtime, "c1");
    act(() => addResult(runtime, "c1"));
    expect(sent).toHaveLength(2);
    act(() => finish());
    await waitFor(() => expect(sent).toHaveLength(3));
    expect(sent[2]).toMatchObject([{ type: "tool", tool_call_id: "c1" }]);
  });

  it("keeps buffered results after a top-level run error", async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const sent: unknown[][] = [];
    const stream = vi.fn(async function* (messages: unknown[]) {
      sent.push(messages);
      if (sent.length !== 1) return;
      yield aiWith(["c1", "c2"]);
      await gate;
      yield { event: "error", data: { message: "graph failed" } };
    });
    const runtime = mount(stream);
    act(() => runtime.thread.append("go"));
    await waitForCall(runtime, "c2");
    act(() => {
      addResult(runtime, "c1");
      addResult(runtime, "c2");
    });
    act(() => finish());
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    expect(sent).toHaveLength(1);
    act(() => addResult(runtime, "c2"));
    await waitFor(() => expect(sent).toHaveLength(2));
    expect(
      sent[1]!.map(
        (message) => (message as { tool_call_id: string }).tool_call_id,
      ),
    ).toEqual(["c1", "c2"]);
  });

  it("releases finished-run siblings when a late call leaves the visible group", async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let finishReplacement!: () => void;
    const replacementGate = new Promise<void>((resolve) => {
      finishReplacement = resolve;
    });
    const sent: unknown[][] = [];
    const stream = vi.fn(async function* (messages: unknown[]) {
      sent.push(messages);
      if (sent.length === 1) {
        yield aiWith(["c1", "c2"]);
        await gate;
      } else if (sent.length === 2) {
        yield { event: "values", data: { messages: [] } };
        await replacementGate;
      }
    });
    const runtime = mount(stream);
    const { result: send } = renderHook(() => useLangGraphSend(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AssistantRuntimeProvider runtime={runtime}>
          {children}
        </AssistantRuntimeProvider>
      ),
    });
    act(() => runtime.thread.append("go"));
    await waitForCall(runtime, "c2");
    const assistantIndex = runtime.thread
      .getState()
      .messages.findIndex((message) => message.role === "assistant");
    const latePart = runtime.thread
      .getMessageByIndex(assistantIndex)
      .getMessagePartByToolCallId("c2");
    act(() => addResult(runtime, "c1"));
    act(() => finish());
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    act(() => {
      void send.current([], {});
    });
    await waitFor(() =>
      expect(
        runtime.thread
          .getState()
          .messages.some((message) =>
            message.content.some(
              (part) => part.type === "tool-call" && part.toolCallId === "c2",
            ),
          ),
      ).toBe(false),
    );
    act(() => {
      latePart.addToolResult({ attempt: 1 });
      latePart.addToolResult({ attempt: 2 });
    });
    act(() => finishReplacement());
    await waitFor(() => expect(sent).toHaveLength(3));
    expect(
      sent[2]!.map(
        (message) => (message as { tool_call_id: string }).tool_call_id,
      ),
    ).toEqual(["c1", "c2"]);
    expect(sent[2]).toMatchObject([
      { content: JSON.stringify({ ok: true }) },
      { content: JSON.stringify({ attempt: 2 }) },
    ]);
  });

  it("reports a rejected resume started by run completion", async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const failure = new Error("resume failed");
    const reported = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      let calls = 0;
      const stream = vi.fn(async function* (_messages: unknown[]) {
        if (calls++ > 0) throw failure;
        yield metadataEvent;
        yield aiWith(["c1"]);
        await gate;
      });
      const runtime = mount(stream);
      act(() => {
        runtime.thread.append("go");
      });
      await waitForCall(runtime, "c1");
      act(() => addResult(runtime, "c1"));
      act(() => finish());
      await waitFor(() =>
        expect(reported).toHaveBeenCalledWith(
          "useLangGraphRuntime: tool result resume failed",
          failure,
        ),
      );
    } finally {
      reported.mockRestore();
    }
  });
});
