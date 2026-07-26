// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { A2AClient } from "./A2AClient";
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
    ): AsyncIterable<never> => {
      streamSignal = signal;
      return {
        async *[Symbol.asyncIterator]() {
          if (!waitForAbort || !signal) return;
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
        return new Response("", {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
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
