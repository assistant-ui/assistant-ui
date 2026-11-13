// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import {
  HttpAgent,
  runHttpRequest,
  transformHttpEventStream,
  type RunAgentInput,
} from "@ag-ui/client";
import type {
  ChatModelRunResult,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAgUiRuntime } from "./useAgUiRuntime";

const sse = (events: object[]) =>
  new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    { headers: { "Content-Type": "text/event-stream" } },
  );

const run = (text: string) => [
  { type: "RUN_STARTED", threadId: "thread", runId: "server-run" },
  { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
  { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: text },
  { type: "TEXT_MESSAGE_END", messageId: "answer" },
  { type: "RUN_FINISHED", threadId: "thread", runId: "server-run" },
];

const question: ThreadMessage = {
  id: "question",
  role: "user",
  content: [{ type: "text", text: "Hi" }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
};

const history: ThreadHistoryAdapter = {
  load: async () => ({
    headId: question.id,
    messages: [{ parentId: null, message: question }],
  }),
  append: async () => {},
};

// POST /agent starts a run; GET /stream follows the run in flight.
const stubServer = () => {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      return url.endsWith("/stream")
        ? sse(run("followed"))
        : sse(run("started again"));
    }),
  );
  return calls;
};

class FollowingAgent extends HttpAgent {
  protected override connect(_input: RunAgentInput) {
    return transformHttpEventStream(
      runHttpRequest(() =>
        fetch(`${this.url}/stream`, { signal: this.abortController.signal }),
      ),
    );
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const render = (agent: HttpAgent, adapter: ThreadHistoryAdapter = history) =>
  renderHook(() => useAgUiRuntime({ agent, adapters: { history: adapter } }));

const streamOf = (text: string) =>
  async function* (): AsyncGenerator<ChatModelRunResult, void, unknown> {
    yield {
      content: [{ type: "text", text }],
      status: { type: "complete", reason: "stop" },
    };
  };

const shown = (runtime: ReturnType<typeof useAgUiRuntime>) =>
  runtime.thread
    .getState()
    .messages.map(
      (m) =>
        `${m.role}: ${m.content.map((p) => (p.type === "text" ? p.text : "")).join("")}`,
    );

describe("resumeRun", () => {
  it("follows the run in flight through connect() and never starts a new run", async () => {
    const calls = stubServer();
    const { result } = render(new FollowingAgent({ url: "http://agent.test" }));
    await waitFor(() =>
      expect(result.current.thread.getState().messages).toHaveLength(1),
    );

    await act(async () => {
      result.current.thread.resumeRun({ parentId: "question" });
    });
    await waitFor(() =>
      expect(shown(result.current)).toEqual([
        "user: Hi",
        "assistant: followed",
      ]),
    );
    expect(calls).toEqual(["GET http://agent.test/stream"]);
  });

  it("starts the agent again when it has no connect()", async () => {
    const calls = stubServer();
    const { result } = render(new HttpAgent({ url: "http://agent.test" }));
    await waitFor(() =>
      expect(result.current.thread.getState().messages).toHaveLength(1),
    );

    await act(async () => {
      result.current.thread.resumeRun({ parentId: "question" });
    });
    await waitFor(() =>
      expect(shown(result.current)).toEqual([
        "user: Hi",
        "assistant: started again",
      ]),
    );
    expect(calls).toEqual(["POST http://agent.test"]);
  });

  it("prefers the history adapter's resume() over connect()", async () => {
    const calls = stubServer();
    const resume = vi.fn(streamOf("from history"));
    const { result } = render(
      new FollowingAgent({ url: "http://agent.test" }),
      {
        ...history,
        resume,
      },
    );
    await waitFor(() =>
      expect(result.current.thread.getState().messages).toHaveLength(1),
    );

    await act(async () => {
      result.current.thread.resumeRun({ parentId: "question" });
    });
    await waitFor(() =>
      expect(shown(result.current)).toEqual([
        "user: Hi",
        "assistant: from history",
      ]),
    );
    expect(resume).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([]);
  });

  it("uses a stream passed to resumeRun as given", async () => {
    const calls = stubServer();
    const { result } = render(new FollowingAgent({ url: "http://agent.test" }));
    await waitFor(() =>
      expect(result.current.thread.getState().messages).toHaveLength(1),
    );

    await act(async () => {
      result.current.thread.resumeRun({
        parentId: "question",
        stream: streamOf("from the caller"),
      });
    });
    await waitFor(() =>
      expect(shown(result.current)).toEqual([
        "user: Hi",
        "assistant: from the caller",
      ]),
    );
    expect(calls).toEqual([]);
  });
});
