// @vitest-environment jsdom

import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import {
  HttpAgent,
  runHttpRequest,
  transformHttpEventStream,
  type RunAgentInput,
} from "@ag-ui/client";
import type { ThreadMessage } from "@assistant-ui/core";
import { useAgUiRuntime } from "./useAgUiRuntime";

const encoder = new TextEncoder();
const frame = (event: object) =>
  encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

// Each thread's run stays open until the request is aborted.
const openRun = (threadId: string, init?: RequestInit) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          frame({ type: "RUN_STARTED", threadId, runId: `run-${threadId}` }),
        );
        controller.enqueue(
          frame({
            type: "TEXT_MESSAGE_START",
            messageId: `answer-${threadId}`,
            role: "assistant",
          }),
        );
        controller.enqueue(
          frame({
            type: "TEXT_MESSAGE_CONTENT",
            messageId: `answer-${threadId}`,
            delta: `streaming ${threadId}`,
          }),
        );
        init?.signal?.addEventListener("abort", () => controller.close(), {
          once: true,
        });
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );

class ReconnectingAgent extends HttpAgent {
  readonly connected: string[] = [];

  override connectAgent(...args: Parameters<HttpAgent["connectAgent"]>) {
    this.abortController = new AbortController();
    return super.connectAgent(...args);
  }

  protected override connect(input: RunAgentInput) {
    this.connected.push(input.threadId);
    return transformHttpEventStream(
      runHttpRequest(() =>
        this.fetch(`${this.url}/${input.threadId}/stream`, {
          signal: this.abortController.signal,
        }),
      ),
    );
  }
}

const question = (id: string): ThreadMessage => ({
  id: `question-${id}`,
  role: "user",
  content: [{ type: "text", text: `asked in ${id}` }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
});

afterEach(() => {
  cleanup();
});

function renderDurable() {
  const agent = new ReconnectingAgent({
    url: "https://agent.test",
    threadId: "initial",
    fetch: async (url: string, init?: RequestInit) =>
      openRun(new URL(url).pathname.split("/")[1]!, init),
  });
  const abortRun = vi.spyOn(agent, "abortRun");
  const detachActiveRun = vi.spyOn(agent, "detachActiveRun");
  const view = renderHook(() => {
    const [threadId, setThreadId] = useState("initial");
    return useAgUiRuntime({
      agent,
      adapters: {
        threadList: {
          threadId,
          onSwitchToThread: async (id) => {
            agent.threadId = id;
            setThreadId(id);
            return { messages: [question(id)], unstable_resume: true };
          },
          onSwitchToNewThread: () => {
            agent.threadId = "thread-new";
            setThreadId("thread-new");
          },
        },
      },
    });
  });
  return { agent, abortRun, detachActiveRun, ...view };
}

const lastText = (messages: readonly ThreadMessage[]) => {
  const part = messages.at(-1)?.content[0];
  return part?.type === "text" ? part.text : undefined;
};

describe("useAgUiRuntime with an agent that implements connect()", () => {
  it("leaves a running thread by detaching, then rejoins the next thread's run", async () => {
    const { agent, abortRun, detachActiveRun, result } = renderDurable();

    await act(async () => {
      await result.current.threads.switchToThread("thread-a");
    });
    await waitFor(() =>
      expect(lastText(result.current.thread.getState().messages)).toBe(
        "streaming thread-a",
      ),
    );

    await act(async () => {
      await result.current.threads.switchToThread("thread-b");
    });

    await waitFor(() =>
      expect(lastText(result.current.thread.getState().messages)).toBe(
        "streaming thread-b",
      ),
    );
    expect(agent.connected).toEqual(["thread-a", "thread-b"]);
    expect(
      result.current.thread.getState().messages.map((message) => message.id),
    ).toEqual(["question-thread-b", "answer-thread-b"]);
    expect(detachActiveRun).toHaveBeenCalled();
    expect(abortRun).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.threads.switchToNewThread();
    });
    expect(abortRun).not.toHaveBeenCalled();
  });

  it("aborts the run when the user cancels", async () => {
    const { abortRun, result } = renderDurable();
    await act(async () => {
      await result.current.threads.switchToThread("thread-a");
    });
    await waitFor(() =>
      expect(result.current.thread.getState().isRunning).toBe(true),
    );

    act(() => {
      result.current.thread.cancelRun();
    });

    expect(abortRun).toHaveBeenCalledTimes(1);
  });
});
