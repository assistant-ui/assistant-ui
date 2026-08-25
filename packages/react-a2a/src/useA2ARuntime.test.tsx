// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    const fetchMock = vi.fn(
      async (input: string | URL | Request, _init?: RequestInit) => {
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
      },
    );
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
});
