// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import {
  startTransition,
  Suspense,
  useState,
  type PropsWithChildren,
} from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadMessage } from "@assistant-ui/core";
import type { A2AClient } from "./A2AClient";
import type { A2AStreamEvent } from "./types";
import { useA2ARuntime } from "./useA2ARuntime";

const createMockClient = (waitForAbort = false) => {
  let streamSignal: AbortSignal | undefined;
  const getAgentCard = vi.fn().mockResolvedValue(undefined);
  const streamMessage = vi.fn(
    (
      _message: unknown,
      _configuration: unknown,
      _metadata: unknown,
      signal?: AbortSignal,
    ): AsyncIterable<A2AStreamEvent> => {
      streamSignal = signal;
      return {
        async *[Symbol.asyncIterator]() {
          if (!waitForAbort || !signal) {
            yield {
              type: "message",
              message: {
                messageId: "response",
                role: "agent",
                parts: [{ text: "Done" }],
              },
            };
            return;
          }
          await new Promise<void>((resolve) => {
            if (signal.aborted) {
              resolve();
            } else {
              signal.addEventListener("abort", () => resolve(), {
                once: true,
              });
            }
          });
        },
      };
    },
  );

  return {
    client: {
      getAgentCard,
      streamMessage,
    } as unknown as A2AClient,
    getAgentCard,
    streamMessage,
    get streamSignal() {
      return streamSignal;
    },
  };
};

const createFetchMock = () =>
  vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.endsWith("/.well-known/agent-card.json")) {
      return new Response(
        JSON.stringify({ capabilities: { streaming: true } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    return new Response(
      'data: {"message":{"message_id":"response","role":"ROLE_AGENT","parts":[{"text":"Done"}]}}\n\n',
      {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      },
    );
  });

const createThreadMessage = (id: string): ThreadMessage => ({
  id,
  role: "user",
  content: [{ type: "text", text: id }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useA2ARuntime", () => {
  const createHistory = () => ({
    load: vi.fn().mockResolvedValue({
      headId: "restored",
      messages: [
        {
          parentId: null,
          message: {
            id: "restored",
            role: "user" as const,
            content: [{ type: "text" as const, text: "hello" }],
            createdAt: new Date(0),
            metadata: { custom: {} },
          },
        },
      ],
    }),
    append: vi.fn().mockResolvedValue(undefined),
  });

  it("loads a history adapter that arrives on a later render", async () => {
    const { client } = createMockClient();
    const history = createHistory();
    const { result, rerender } = renderHook(
      ({ history }: { history?: ReturnType<typeof createHistory> }) =>
        useA2ARuntime({ client, adapters: history ? { history } : {} }),
      { initialProps: {} },
    );

    await waitFor(() =>
      expect(result.current.thread.getState().isLoading).toBe(false),
    );
    expect(history.load).not.toHaveBeenCalled();

    rerender({ history });

    await waitFor(() =>
      expect(
        result.current.thread.getState().messages.map((m) => m.id),
      ).toEqual(["restored"]),
    );
    expect(history.load).toHaveBeenCalledOnce();
  });

  it("loads history through a swapped client's core", async () => {
    const first = createMockClient();
    const second = createMockClient();
    const history = createHistory();
    const { result, rerender } = renderHook(
      ({ client }) => useA2ARuntime({ client, adapters: { history } }),
      { initialProps: { client: first.client } },
    );

    await waitFor(() => expect(history.load).toHaveBeenCalledOnce());

    rerender({ client: second.client });

    await waitFor(() => expect(second.getAgentCard).toHaveBeenCalledOnce());
    await waitFor(() => expect(history.load).toHaveBeenCalledTimes(2));
    expect(result.current.thread.getState().messages.map((m) => m.id)).toEqual([
      "restored",
    ]);
  });

  it("switches provided clients and aborts the previous client run", async () => {
    const first = createMockClient(true);
    const second = createMockClient();
    const { result, rerender } = renderHook(
      ({ client }) => useA2ARuntime({ client }),
      { initialProps: { client: first.client } },
    );

    await waitFor(() => expect(first.getAgentCard).toHaveBeenCalledOnce());

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
    });
    await waitFor(() => expect(first.streamMessage).toHaveBeenCalledOnce());

    rerender({ client: second.client });

    await waitFor(() => expect(first.streamSignal?.aborted).toBe(true));
    await waitFor(() => expect(second.getAgentCard).toHaveBeenCalledOnce());

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
      });
    });

    await waitFor(() => expect(second.streamMessage).toHaveBeenCalledOnce());
    expect(first.streamMessage).toHaveBeenCalledOnce();
  });

  it("uses current headers without recreating the managed client", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ token }) =>
        useA2ARuntime({
          baseUrl: "https://agent.test",
          headers: { Authorization: `Bearer ${token}` },
          extensions: ["urn:example"],
          fetchOptions: { credentials: "include" },
        }),
      { initialProps: { token: "first" } },
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    rerender({ token: "second" });

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const streamRequest = fetchMock.mock.calls[1]!;
    expect(streamRequest[1]?.headers).toMatchObject({
      Authorization: "Bearer second",
    });
  });

  it("keeps managed headers scoped to committed renders", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    const interruptedRender = vi.fn();
    const renderedToken = vi.fn();
    const pending = new Promise<never>(() => {});
    let blocked = false;
    const Blocker = ({ blocked }: { blocked: boolean }) => {
      if (blocked) {
        interruptedRender();
        throw pending;
      }
      return null;
    };
    const Wrapper = ({ children }: PropsWithChildren) => (
      <Suspense fallback={null}>
        {children}
        <Blocker blocked={blocked} />
      </Suspense>
    );

    const { result, rerender } = renderHook(
      ({ token }) => {
        renderedToken(token);
        return useA2ARuntime({
          baseUrl: "https://agent.test",
          headers: { Authorization: `Bearer ${token}` },
        });
      },
      {
        initialProps: { token: "workspace-a" },
        wrapper: Wrapper,
      },
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    act(() => {
      blocked = true;
      startTransition(() => {
        rerender({ token: "workspace-b" });
      });
    });
    expect(interruptedRender).toHaveBeenCalled();
    expect(renderedToken).toHaveBeenCalledWith("workspace-b");

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]![1]?.headers).toMatchObject({
      Authorization: "Bearer workspace-a",
    });
  });

  it("ignores an older thread load after a newer selection", async () => {
    const { client } = createMockClient();
    let resolveFirst!: (value: { messages: ThreadMessage[] }) => void;
    let resolveSecond!: (value: { messages: ThreadMessage[] }) => void;
    const first = new Promise<{ messages: ThreadMessage[] }>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<{ messages: ThreadMessage[] }>((resolve) => {
      resolveSecond = resolve;
    });
    const { result } = renderHook(() => {
      const [threadId, setThreadId] = useState("initial");
      return useA2ARuntime({
        client,
        adapters: {
          threadList: {
            threadId,
            onSwitchToThread: async (nextThreadId) => {
              setThreadId(nextThreadId);
              return nextThreadId === "thread-a" ? first : second;
            },
          },
        },
      });
    });

    let switchA!: Promise<void>;
    let switchB!: Promise<void>;
    act(() => {
      switchA = result.current.threads.switchToThread("thread-a");
      switchB = result.current.threads.switchToThread("thread-b");
    });
    expect(result.current.threads.getState().mainThreadId).toBe("thread-b");

    await act(async () => {
      resolveSecond({ messages: [createThreadMessage("thread-b")] });
      await switchB;
    });
    await act(async () => {
      resolveFirst({ messages: [createThreadMessage("thread-a")] });
      await switchA;
    });

    expect(result.current.thread.getState().messages.map((m) => m.id)).toEqual([
      "thread-b",
    ]);
  });

  it("ignores a thread load superseded by a new thread", async () => {
    const { client } = createMockClient();
    let resolveLoad!: (value: { messages: ThreadMessage[] }) => void;
    const load = new Promise<{ messages: ThreadMessage[] }>((resolve) => {
      resolveLoad = resolve;
    });
    const { result } = renderHook(() => {
      const [threadId, setThreadId] = useState("initial");
      return useA2ARuntime({
        client,
        adapters: {
          threadList: {
            threadId,
            onSwitchToThread: async (nextThreadId) => {
              setThreadId(nextThreadId);
              return load;
            },
            onSwitchToNewThread: async () => {
              setThreadId("thread-new");
            },
          },
        },
      });
    });

    let staleSwitch!: Promise<void>;
    act(() => {
      staleSwitch = result.current.threads.switchToThread("thread-a");
    });
    await act(async () => {
      await result.current.threads.switchToNewThread();
    });
    await act(async () => {
      resolveLoad({ messages: [createThreadMessage("thread-a")] });
      await staleSwitch;
    });

    expect(result.current.thread.getState().messages).toEqual([]);
  });
});
