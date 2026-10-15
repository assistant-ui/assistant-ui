// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { type FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useAdkRuntime } from "./useAdkRuntime";
import { useAdkSend } from "./hooks";
import type { AdkEvent, AdkThreadSnapshot } from "./types";
import { settleOutsideAct } from "./tests/settleOutsideAct";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const sessionAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "adk-1",
        externalId: "adk-1",
        title: "ADK session",
      },
    ],
  })),
  initialize: vi.fn(async () => ({ remoteId: "adk-1", externalId: "adk-1" })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream() as never),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "adk-1",
    externalId: "adk-1",
    title: "ADK session",
  })),
});

const snapshot = (): AdkThreadSnapshot => ({
  messages: [
    { id: "question", type: "human", content: "original question" },
    {
      id: "answer",
      type: "ai",
      content: "original answer",
      tool_calls: [{ id: "lookup", name: "lookup", args: {} }],
    },
  ],
  longRunningToolIds: ["lookup"],
});

const mount = async (
  stream: (...args: never[]) => AsyncGenerator<AdkEvent>,
  load: () => Promise<AdkThreadSnapshot> = async () => snapshot(),
  onSend?: (send: ReturnType<typeof useAdkSend>) => void,
) => {
  const capture: { runtime: AssistantRuntime | null } = { runtime: null };
  const CaptureSend: FC = () => {
    onSend?.(useAdkSend());
    return null;
  };
  const Inner: FC = () => {
    const runtime = useAdkRuntime({
      stream: stream as never,
      load,
      getCheckpointId: async () => null,
      sessionAdapter: sessionAdapter(),
      unstable_allowCancellation: true,
    });
    capture.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <CaptureSend />
      </AssistantRuntimeProvider>
    );
  };
  await act(async () => {
    render(<Inner />);
  });
  await settleOutsideAct(() =>
    capture.runtime!.threads.switchToThread("adk-1"),
  );
  await waitFor(() =>
    expect(capture.runtime!.thread.getState().messages.length).toBeGreaterThan(
      0,
    ),
  );
  return capture.runtime!;
};

const edit = (runtime: AssistantRuntime, text: string) => {
  runtime.thread.append({
    role: "user",
    parentId: null,
    sourceId: "question",
    content: [{ type: "text", text }],
  });
};

const reload = (runtime: AssistantRuntime) => {
  runtime.thread.getMessageById("answer").reload();
};

const texts = (runtime: AssistantRuntime) =>
  JSON.stringify(runtime.thread.getState().messages);

describe("useAdkRuntime abort restoration", () => {
  it("restores an edit and its tool state when Stop precedes the first event", async () => {
    const gate = deferred();
    const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      await gate.promise;
    });
    const runtime = await mount(stream);
    act(() => edit(runtime, "edited question"));
    await waitFor(() => expect(stream).toHaveBeenCalledOnce());
    act(() => {
      void runtime.thread.cancelRun();
    });
    await waitFor(() => expect(texts(runtime)).toContain("original answer"));
    expect(texts(runtime)).toContain("original question");
    expect(texts(runtime)).not.toContain("edited question");
    expect(runtime.thread.getState().extras).toMatchObject({
      longRunningToolIds: ["lookup"],
    });
    gate.resolve();
  });

  it("restores a reload and its tool state and run config when Stop precedes the first event", async () => {
    const gate = deferred();
    const runConfig = { custom: { model: "original" } };
    let send!: ReturnType<typeof useAdkSend>;
    const stream = vi.fn(async function* (
      _messages: unknown,
      _config: unknown,
    ): AsyncGenerator<AdkEvent> {
      if (stream.mock.calls.length === 1) {
        yield {
          id: "tools",
          author: "agent",
          longRunningToolIds: ["lookup"],
          content: {
            role: "model",
            parts: [
              { functionCall: { id: "lookup", name: "lookup", args: {} } },
            ],
          },
        };
      } else if (stream.mock.calls.length === 2) {
        await gate.promise;
      }
    });
    const runtime = await mount(
      stream,
      async () => ({
        messages: [
          { id: "question", type: "human", content: "original question" },
        ],
      }),
      (value) => {
        send = value;
      },
    );
    await act(async () => {
      await runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "run tools" }],
        runConfig,
      });
    });
    const answer = runtime.thread
      .getState()
      .messages.find((message) =>
        message.content.some((part) => part.type === "tool-call"),
      )!;
    act(() => runtime.thread.getMessageById(answer.id).reload());
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
    act(() => {
      void runtime.thread.cancelRun();
    });
    await waitFor(() =>
      expect(
        runtime.thread
          .getState()
          .messages.some((message) => message.id === answer.id),
      ).toBe(true),
    );
    expect(runtime.thread.getState().extras).toMatchObject({
      longRunningToolIds: ["lookup"],
    });
    await act(async () => {
      await send(
        [
          {
            id: "result",
            type: "tool",
            tool_call_id: "lookup",
            name: "lookup",
            content: "done",
          },
        ],
        {},
      );
    });
    expect(stream.mock.calls[2]?.[1]).toMatchObject({ runConfig });
    gate.resolve();
  });

  it.each(["edit", "reload"] as const)(
    "restores an aborted %s beneath a newer message",
    async (kind) => {
      const gate = deferred();
      const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
        if (stream.mock.calls.length === 1) await gate.promise;
      });
      const runtime = await mount(stream);
      act(() =>
        kind === "edit" ? edit(runtime, "edited question") : reload(runtime),
      );
      await waitFor(() => expect(stream).toHaveBeenCalledOnce());
      act(() => {
        runtime.thread.append({
          role: "user",
          content: [{ type: "text", text: "new question" }],
        });
      });
      await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
      expect(texts(runtime)).toContain("new question");
      expect(texts(runtime)).toContain("original answer");
      expect(texts(runtime)).not.toContain("edited question");
      gate.resolve();
    },
  );

  it.each(["edit", "reload"] as const)(
    "restores an aborted %s beneath a newer edit",
    async (kind) => {
      const gate = deferred();
      const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
        if (stream.mock.calls.length === 1) await gate.promise;
      });
      const runtime = await mount(stream);
      act(() =>
        kind === "edit" ? edit(runtime, "first edit") : reload(runtime),
      );
      await waitFor(() => expect(stream).toHaveBeenCalledOnce());
      act(() => edit(runtime, "second edit"));
      await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
      expect(texts(runtime)).toContain("second edit");
      expect(texts(runtime)).not.toContain("first edit");
      gate.resolve();
    },
  );

  it.each(["edit", "reload"] as const)(
    "keeps an aborted %s's newer reload response",
    async (kind) => {
      const gate = deferred();
      const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
        if (stream.mock.calls.length === 1) await gate.promise;
        else
          yield {
            id: "replacement",
            author: "agent",
            content: { role: "model", parts: [{ text: "new answer" }] },
          };
      });
      const runtime = await mount(stream);
      act(() =>
        kind === "edit" ? edit(runtime, "first edit") : reload(runtime),
      );
      await waitFor(() => expect(stream).toHaveBeenCalledOnce());
      act(() => reload(runtime));
      await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(texts(runtime)).toContain("new answer"));
      expect(texts(runtime)).not.toContain("first edit");
      gate.resolve();
    },
  );

  it.each(["edit", "reload"] as const)(
    "keeps an %s and partial reply when Stop follows the first event",
    async (kind) => {
      const gate = deferred();
      const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
        yield {
          id: "partial",
          author: "agent",
          partial: true,
          content: { role: "model", parts: [{ text: "partial answer" }] },
        };
        await gate.promise;
      });
      const runtime = await mount(stream);
      act(() =>
        kind === "edit" ? edit(runtime, "edited question") : reload(runtime),
      );
      await waitFor(() => expect(texts(runtime)).toContain("partial answer"));
      act(() => {
        void runtime.thread.cancelRun();
      });
      await waitFor(() =>
        expect(runtime.thread.getState().messages.at(-1)?.status).toEqual({
          type: "incomplete",
          reason: "cancelled",
        }),
      );
      expect(texts(runtime)).toContain(
        kind === "edit" ? "edited question" : "original question",
      );
      expect(texts(runtime)).not.toContain("original answer");
      gate.resolve();
    },
  );

  it("keeps a new user message when Stop precedes its first event", async () => {
    const gate = deferred();
    const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      await gate.promise;
    });
    const runtime = await mount(stream);
    act(() => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "new question" }],
      });
    });
    await waitFor(() => expect(stream).toHaveBeenCalledOnce());
    act(() => {
      void runtime.thread.cancelRun();
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    expect(texts(runtime)).toContain("new question");
    gate.resolve();
  });
});
