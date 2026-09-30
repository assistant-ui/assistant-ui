// @vitest-environment jsdom
// Regression test for https://github.com/assistant-ui/assistant-ui/issues/8270
//
// LangGraph streams an AI message's tool calls chunk by chunk. A run can have
// emitted call `c1` but not yet `c2`. If the client answers `c1` inside that
// window, the previous implementation released `c1`'s result as its own
// resume: after the run ended, the graph was resumed with an AI message that
// had two tool calls and only one tool message (rejected by providers such as
// OpenAI), and `c2`'s answer later went out as a second, separate resume.
//
// Expected: no resume is sent while `c2` is still unanswered on the client.
// Once both calls have results, one resume carries both tool messages.

import { act, render, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
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
        await secondCall; // c2 has not streamed yet
        yield aiWith(["c1", "c2"]);
      }
    });

    const host = renderHook(() => useLangGraphRuntime({ stream: emptyStream() }));
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

    // Do NOT await append: the mocked stream is parked on `secondCall` until
    // the test resolves it below, so append would hang forever.
    act(() => {
      void runtime.thread.append("go");
    });

    // Wait until `c1`'s tool-call part is live on the client.
    await waitFor(() => {
      expect(
        runtime.thread
          .getState()
          .messages.some((m) => m.role === "assistant"),
      ).toBe(true);
    });

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

    // Let the first run finish streaming (c2 arrives in the graph), but do NOT
    // answer c2 yet. The first run must not be resumed with c1 alone: the
    // stream callback stays at exactly one invocation while c2 is unanswered.
    act(() => {
      resolveSecondCall();
    });

    // Poll briefly: a premature resume (the bug) fires within a few ticks.
    let attempts = 0;
    while (sent.length !== 1 && attempts++ < 50) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(sent.length).toBe(1);

    // Now answer c2. One resume must carry both tool messages.
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
});
