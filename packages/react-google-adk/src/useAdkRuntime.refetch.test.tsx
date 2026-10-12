// @vitest-environment jsdom

import { act, render, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type FC, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useAui } from "@assistant-ui/store";
import { useAdkRuntime } from "./useAdkRuntime";
import { useAdkSend } from "./hooks";
import type { AdkEvent, AdkMessage, AdkThreadSnapshot } from "./types";
import { settleOutsideAct } from "./tests/settleOutsideAct";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "adk-1",
        externalId: "adk-1",
        title: "Existing ADK session",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "adk-1",
    externalId: "adk-1",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream() as never),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "adk-1",
    externalId: "adk-1",
    title: "Existing ADK session",
  })),
});

const wrapperFactory = (runtime: AssistantRuntime) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

const aiMessage = (id: string, text: string): AdkMessage => ({
  id,
  type: "ai",
  content: [{ type: "text", text }],
});

const renderAdk = async (
  load?: (
    threadId: string,
    options?: { signal?: AbortSignal | undefined },
  ) => Promise<AdkThreadSnapshot>,
  getCheckpointId?: (
    threadId: string,
    parentMessages: AdkMessage[],
  ) => Promise<string | null>,
  streamMock = vi.fn(async function* (
    _messages: unknown,
    _config: { checkpointId?: string },
  ): AsyncGenerator<AdkEvent> {}),
  strictMode = false,
  allowCancellation = false,
) => {
  const capture: {
    runtime: AssistantRuntime | null;
    send: ReturnType<typeof useAdkSend> | null;
  } = { runtime: null, send: null };

  const CaptureSend = () => {
    capture.send = useAdkSend();
    return null;
  };

  // the runtime hook's binder mounts inside the provider, so the provider has
  // to be in the same tree as the hook for a thread switch to settle
  const Inner: FC = () => {
    const runtime = useAdkRuntime({
      stream: streamMock as never,
      ...(load ? { load } : {}),
      ...(getCheckpointId ? { getCheckpointId } : {}),
      sessionAdapter: makeThreadListAdapter(),
      unstable_allowCancellation: allowCancellation,
    });
    capture.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <CaptureSend />
      </AssistantRuntimeProvider>
    );
  };

  let unmount!: () => void;
  await act(async () => {
    const element = <Inner />;
    ({ unmount } = render(
      strictMode ? <StrictMode>{element}</StrictMode> : element,
    ));
  });
  await waitFor(() => expect(capture.runtime).not.toBeNull());

  await settleOutsideAct(() =>
    capture.runtime!.threads.switchToThread("adk-1"),
  );

  return { capture, streamMock, unmount };
};

describe("useAdkRuntime refetch", () => {
  it("cancels pending calls from history when sending during the initial load", async () => {
    const loaded = deferred<AdkThreadSnapshot>();
    const streamMock = vi.fn(async function* (
      _messages: unknown,
      _config: { checkpointId?: string },
    ): AsyncGenerator<AdkEvent> {});
    const { capture } = await renderAdk(
      () => loaded.promise,
      undefined,
      streamMock,
    );

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "next question" }],
      });
    });
    expect(streamMock).not.toHaveBeenCalled();

    await act(async () => {
      loaded.resolve({
        messages: [
          { id: "h1", type: "human", content: "earlier question" },
          {
            id: "a1",
            type: "ai",
            content: [],
            tool_calls: [
              { id: "cancel-me", name: "lookup", args: {} },
              { id: "keep-me", name: "wait_for_user", args: {} },
            ],
          },
        ],
        longRunningToolIds: ["keep-me"],
      });
    });
    await waitFor(() => expect(streamMock).toHaveBeenCalledOnce());
    expect(streamMock.mock.calls[0]![0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool",
          tool_call_id: "cancel-me",
          content: '{"cancelled":true}',
        }),
      ]),
    );
    expect(streamMock.mock.calls[0]![0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tool_call_id: "keep-me" }),
      ]),
    );
  });

  it("drops a queued send when switching threads during the initial load", async () => {
    const loaded = deferred<AdkThreadSnapshot>();
    const load = vi.fn(() => loaded.promise);
    const { capture, streamMock } = await renderAdk(load);
    await waitFor(() => expect(load).toHaveBeenCalledOnce());

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "old thread question" }],
      });
    });
    await settleOutsideAct(() => capture.runtime!.threads.switchToNewThread());
    await act(async () => {
      loaded.resolve({ messages: [aiMessage("old-answer", "old answer")] });
    });

    expect(streamMock).not.toHaveBeenCalled();
    expect(
      JSON.stringify(capture.runtime!.thread.getState().messages),
    ).not.toContain("old thread question");
  });

  it("declares the refetch capability only when a load is supplied", async () => {
    const withLoad = await renderAdk(async () => ({ messages: [] }));
    expect(
      withLoad.capture.runtime!.thread.getState().capabilities.refetchThread,
    ).toBe(true);

    const withoutLoad = await renderAdk();
    expect(
      withoutLoad.capture.runtime!.thread.getState().capabilities.refetchThread,
    ).toBe(false);
  });

  it("refetches in place, keeping the composer draft and the runtime", async () => {
    let call = 0;
    const load = vi.fn(async () => {
      call++;
      return {
        messages: [aiMessage(`m-${call}`, `load ${call}`)],
      } satisfies AdkThreadSnapshot;
    });

    const { capture } = await renderAdk(load);
    const wrapper = wrapperFactory(capture.runtime!);
    const { result: auiResult } = renderHook(() => useAui(), { wrapper });

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("load 1"),
    );

    await act(async () => {
      auiResult.current.composer.setText("draft that must survive");
    });

    await act(async () => {
      await capture.runtime!.threads.reloadMainThread();
    });

    expect(load).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("load 2"),
    );
    expect(auiResult.current.composer.getState().text).toBe(
      "draft that must survive",
    );
  });

  it("waits for the initial snapshot before sending a new turn", async () => {
    const loaded = deferred<AdkThreadSnapshot>();
    const streamStarted = deferred<void>();
    const finishStream = deferred<void>();
    const load = vi.fn(() => loaded.promise);
    const streamMock = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      streamStarted.resolve();
      await finishStream.promise;
      yield {
        id: "event-1",
        invocationId: "run-1",
        author: "agent",
        content: { role: "model", parts: [{ text: "new answer" }] },
      };
    });
    const { capture } = await renderAdk(load, undefined, streamMock);
    await waitFor(() => expect(load).toHaveBeenCalledOnce());

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "new question" }],
      });
    });
    expect(streamMock).not.toHaveBeenCalled();

    await act(async () => {
      loaded.resolve({
        messages: [{ id: "h1", type: "human", content: "earlier question" }],
      });
      await streamStarted.promise;
    });
    finishStream.resolve();
    await waitFor(() =>
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("new answer"),
    );

    const messages = JSON.stringify(
      capture.runtime!.thread.getState().messages,
    );
    expect(messages).toContain("earlier question");
    expect(messages).toContain("new question");
    expect(messages).toContain("new answer");
  });

  it("waits for the replay-safe initial load in StrictMode", async () => {
    const loads: Array<{
      threadId: string;
      result: ReturnType<typeof deferred<AdkThreadSnapshot>>;
    }> = [];
    const load = vi.fn((threadId: string) => {
      const result = deferred<AdkThreadSnapshot>();
      loads.push({ threadId, result });
      return result.promise;
    });
    const streamMock = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      yield {
        id: "event-1",
        invocationId: "run-1",
        author: "agent",
        content: { role: "model", parts: [{ text: "new answer" }] },
      };
    });
    const { capture } = await renderAdk(load, undefined, streamMock, true);
    await waitFor(() => expect(loads).toHaveLength(1));
    expect(loads[0]?.threadId).toBe("adk-1");

    act(() => {
      capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "new question" }],
      });
    });
    expect(streamMock).not.toHaveBeenCalled();

    loads[0]!.result.resolve({
      messages: [{ id: "h1", type: "human", content: "earlier question" }],
    });
    await waitFor(() =>
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("new answer"),
    );

    const messages = JSON.stringify(
      capture.runtime!.thread.getState().messages,
    );
    expect(messages).toContain("earlier question");
    expect(messages).toContain("new question");
  });

  it("swaps the per-turn state over with the messages", async () => {
    let call = 0;
    const load = vi.fn(async () => {
      call++;
      return call === 1
        ? {
            messages: [aiMessage("m-1", "first")],
            toolConfirmations: [
              { toolCallId: "tc-1", toolName: "search", hint: "before" },
            ],
          }
        : {
            messages: [aiMessage("m-2", "second")],
            toolConfirmations: [
              { toolCallId: "tc-2", toolName: "search", hint: "after" },
            ],
          };
    });

    const { capture } = await renderAdk(load as never);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await act(async () => {
      await capture.runtime!.threads.reloadMainThread();
    });

    await waitFor(() =>
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("second"),
    );
    // the confirmation from the fresh snapshot replaced the earlier one rather
    // than the thread passing through a cleared state
    const extras = capture.runtime!.thread.getState().extras as {
      toolConfirmations: { hint: string }[];
    };
    expect(extras.toolConfirmations).toHaveLength(1);
    expect(extras.toolConfirmations[0]!.hint).toBe("after");
  });

  it("leaves the thread untouched when the refetch fails, and rejects", async () => {
    let call = 0;
    const load = vi.fn(async () => {
      call++;
      if (call === 1) return { messages: [aiMessage("m-1", "first")] };
      throw new Error("refetch failed");
    });

    const { capture } = await renderAdk(load as never);
    await waitFor(() =>
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("first"),
    );

    await act(async () => {
      await expect(capture.runtime!.threads.reloadMainThread()).rejects.toThrow(
        "refetch failed",
      );
    });

    expect(
      JSON.stringify(capture.runtime!.thread.getState().messages),
    ).toContain("first");
  });

  it("hides the answer during lookup and restores it when the lookup fails", async () => {
    const checkpoint = deferred<string | null>();
    const getCheckpointId = vi.fn(() => checkpoint.promise);
    const checkpointError = new Error("checkpoint lookup failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture } = await renderAdk(
        async () => ({
          messages: [
            { id: "q-1", type: "human", content: "question" },
            aiMessage("a-1", "answer"),
          ],
        }),
        getCheckpointId,
      );
      await waitFor(() =>
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).toContain("answer"),
      );
      const answer = capture
        .runtime!.thread.getState()
        .messages.find((message) => message.role === "assistant")!;

      act(() => {
        capture.runtime!.thread.getMessageById(answer.id).reload();
      });
      await waitFor(() => expect(getCheckpointId).toHaveBeenCalledOnce());
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).not.toContain("answer");
      await act(async () => {
        checkpoint.reject(checkpointError);
      });
      await waitFor(() => expect(consoleError).toHaveBeenCalledOnce());

      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "[assistant-ui] Message reload failed",
        checkpointError,
      );
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("answer");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("restores a failed reload but does not overwrite a newer send", async () => {
    const checkpoints = [deferred<string | null>(), deferred<string | null>()];
    const getCheckpointId = vi.fn(
      () => checkpoints[getCheckpointId.mock.calls.length - 1]!.promise,
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture, streamMock } = await renderAdk(
        async () => ({
          messages: [
            { id: "q-1", type: "human", content: "question" },
            aiMessage("a-1", "answer"),
          ],
        }),
        getCheckpointId,
      );
      await waitFor(() =>
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).toContain("answer"),
      );
      const answer = capture
        .runtime!.thread.getState()
        .messages.find((message) => message.role === "assistant")!;
      act(() => {
        capture.runtime!.thread.getMessageById(answer.id).reload();
      });
      await waitFor(() => expect(getCheckpointId).toHaveBeenCalledOnce());
      await act(async () => {
        checkpoints[0]!.reject(new Error("first lookup failed"));
      });
      await waitFor(() =>
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).toContain("answer"),
      );

      act(() => {
        capture.runtime!.thread.getMessageById(answer.id).reload();
      });
      await waitFor(() => expect(getCheckpointId).toHaveBeenCalledTimes(2));
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).not.toContain("answer");

      act(() => {
        capture.runtime!.thread.append({
          role: "user",
          content: [{ type: "text", text: "follow-up" }],
        });
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledOnce());
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("follow-up");

      await act(async () => {
        checkpoints[1]!.reject(new Error("second lookup failed"));
      });

      expect(streamMock).toHaveBeenCalledOnce();
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).not.toContain("answer");
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("follow-up");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("restores a failed reload but does not overwrite a newer load", async () => {
    const checkpoints = [deferred<string | null>(), deferred<string | null>()];
    const pendingLoad = deferred<AdkThreadSnapshot>();
    const getCheckpointId = vi.fn(
      () => checkpoints[getCheckpointId.mock.calls.length - 1]!.promise,
    );
    let loadCount = 0;
    const load = vi.fn(() => {
      loadCount++;
      return loadCount === 1
        ? Promise.resolve({
            messages: [
              { id: "q-1", type: "human" as const, content: "question" },
              aiMessage("a-1", "answer"),
            ],
          })
        : loadCount === 2
          ? pendingLoad.promise
          : Promise.resolve({ messages: [aiMessage("loaded", "new history")] });
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture } = await renderAdk(load, getCheckpointId);
      await waitFor(() =>
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).toContain("answer"),
      );
      const answer = capture
        .runtime!.thread.getState()
        .messages.find((m) => m.role === "assistant")!;

      act(() => {
        capture.runtime!.thread.getMessageById(answer.id).reload();
      });
      await waitFor(() => expect(getCheckpointId).toHaveBeenCalledOnce());
      await act(async () => {
        checkpoints[0]!.reject(new Error("first lookup failed"));
      });
      await waitFor(() =>
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).toContain("answer"),
      );

      act(() => {
        capture.runtime!.thread.getMessageById(answer.id).reload();
      });
      await waitFor(() => expect(getCheckpointId).toHaveBeenCalledTimes(2));
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).not.toContain("answer");

      let refetch!: Promise<void>;
      act(() => {
        refetch = capture.runtime!.threads.reloadMainThread();
      });
      await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
      await act(async () => {
        checkpoints[1]!.reject(new Error("second lookup failed"));
      });
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("answer");

      await act(async () => {
        pendingLoad.resolve({ messages: [aiMessage("loaded", "new history")] });
        await refetch;
      });
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("answer");
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).not.toContain("new history");

      await act(async () => {
        await capture.runtime!.threads.reloadMainThread();
      });
      expect(load).toHaveBeenCalledTimes(3);
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("new history");
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).not.toContain("answer");
    } finally {
      consoleError.mockRestore();
    }
  });

  it.each(["resolves", "rejects"] as const)(
    "restores the answer when a refetch %s during a failed lookup",
    async (outcome) => {
      const checkpoint = deferred<string | null>();
      const pendingLoad = deferred<AdkThreadSnapshot>();
      const getCheckpointId = vi.fn(() => checkpoint.promise);
      let loadCount = 0;
      const load = vi.fn(async () => {
        loadCount++;
        return loadCount === 1
          ? {
              messages: [
                { id: "q-1", type: "human" as const, content: "question" },
                aiMessage("a-1", "answer"),
              ],
            }
          : pendingLoad.promise;
      });
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      try {
        const { capture } = await renderAdk(load, getCheckpointId);
        await waitFor(() =>
          expect(
            JSON.stringify(capture.runtime!.thread.getState().messages),
          ).toContain("answer"),
        );
        const answer = capture
          .runtime!.thread.getState()
          .messages.find((message) => message.role === "assistant")!;

        act(() => {
          capture.runtime!.thread.getMessageById(answer.id).reload();
        });
        await waitFor(() => expect(getCheckpointId).toHaveBeenCalledOnce());
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).not.toContain("answer");

        let refetch!: Promise<void>;
        act(() => {
          refetch = capture.runtime!.threads.reloadMainThread();
        });
        await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
        await act(async () => {
          if (outcome === "resolves") {
            pendingLoad.resolve({
              messages: [aiMessage("loaded", "new history")],
            });
            await refetch;
          } else {
            pendingLoad.reject(new Error("refetch failed"));
            await expect(refetch).rejects.toThrow("refetch failed");
          }
        });
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).not.toContain("answer");
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).not.toContain("new history");

        await act(async () => {
          checkpoint.reject(new Error("checkpoint lookup failed"));
        });
        await waitFor(() => expect(consoleError).toHaveBeenCalledOnce());
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).toContain("answer");
      } finally {
        consoleError.mockRestore();
      }
    },
  );

  it("restores a failed reload but does not overwrite a newer reload", async () => {
    const checkpoints = [
      deferred<string | null>(),
      deferred<string | null>(),
      deferred<string | null>(),
    ];
    const getCheckpointId = vi.fn(
      () => checkpoints[getCheckpointId.mock.calls.length - 1]!.promise,
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture, streamMock } = await renderAdk(
        async () => ({
          messages: [
            { id: "q-1", type: "human", content: "question" },
            aiMessage("a-1", "answer"),
          ],
        }),
        getCheckpointId,
      );
      await waitFor(() =>
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).toContain("answer"),
      );
      const answer = capture
        .runtime!.thread.getState()
        .messages.find((message) => message.role === "assistant")!;
      act(() => {
        capture.runtime!.thread.getMessageById(answer.id).reload();
      });
      await waitFor(() => expect(getCheckpointId).toHaveBeenCalledOnce());
      await act(async () => {
        checkpoints[0]!.reject(new Error("first lookup failed"));
      });
      await waitFor(() =>
        expect(
          JSON.stringify(capture.runtime!.thread.getState().messages),
        ).toContain("answer"),
      );

      act(() => {
        capture.runtime!.thread.getMessageById(answer.id).reload();
        capture.runtime!.thread.getMessageById(answer.id).reload();
      });
      await waitFor(() => expect(getCheckpointId).toHaveBeenCalledTimes(3));

      await act(async () => {
        checkpoints[1]!.reject(new Error("older lookup failed"));
      });
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).not.toContain("answer");

      await act(async () => {
        checkpoints[2]!.reject(new Error("newer lookup failed"));
      });

      expect(streamMock).not.toHaveBeenCalled();
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("answer");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("defers to an initial load still in flight rather than taking it over", async () => {
    const pending = deferred<AdkThreadSnapshot>();
    let call = 0;
    const load = vi.fn(async () => {
      call++;
      return call === 1
        ? pending.promise
        : { messages: [aiMessage("m-2", "second")] };
    });

    const streamMock = vi.fn(async function* () {});
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const Inner: FC = () => {
      const runtime = useAdkRuntime({
        stream: streamMock as never,
        load: load as never,
        sessionAdapter: makeThreadListAdapter(),
      });
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    await act(async () => {
      render(<Inner />);
    });
    await settleOutsideAct(() =>
      capture.runtime!.threads.switchToThread("adk-1"),
    );
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    let settled = false;
    act(() => {
      capture.runtime!.threads.reloadMainThread().then(() => {
        settled = true;
      });
    });

    // the refetch waits on the initial load instead of starting a second one
    expect(load).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    await act(async () => {
      pending.resolve({ messages: [aiMessage("m-1", "first")] });
    });
    await waitFor(() => expect(settled).toBe(true));
    expect(
      JSON.stringify(capture.runtime!.thread.getState().messages),
    ).toContain("first");
  });

  it("does not report an aborted load as a failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const pending = deferred<AdkThreadSnapshot>();
    let call = 0;
    const load = vi.fn(
      async (_id: string, options?: { signal?: AbortSignal }) => {
        call++;
        if (call === 1) {
          options?.signal?.addEventListener("abort", () =>
            pending.reject(
              Object.assign(new Error("aborted"), { name: "AbortError" }),
            ),
          );
          return pending.promise;
        }
        return { messages: [] };
      },
    );

    const { unmount } = await renderAdk(load as never);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("aborts a refetch still in flight when the thread unmounts", async () => {
    const pending = deferred<AdkThreadSnapshot>();
    let call = 0;
    const signals: (AbortSignal | undefined)[] = [];
    const load = vi.fn(
      async (_id: string, options?: { signal?: AbortSignal }) => {
        call++;
        signals.push(options?.signal);
        if (call === 1) return { messages: [] };
        return pending.promise;
      },
    );

    const { capture, unmount } = await renderAdk(load as never);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    act(() => {
      capture.runtime!.threads.reloadMainThread().catch(() => {});
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(signals[1]?.aborted).toBe(false);

    unmount();
    await act(async () => {});

    expect(signals[1]?.aborted).toBe(true);
    pending.resolve({ messages: [] });
  });

  it("restores history when a reload request fails before its first event", async () => {
    const streamMock = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      throw new Error("request failed before first event");
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture } = await renderAdk(
        async () => ({
          messages: [
            { id: "q-1", type: "human", content: "question" },
            aiMessage("a-1", "answer"),
          ],
        }),
        async () => null,
        streamMock,
      );
      const answer = capture
        .runtime!.thread.getState()
        .messages.find((message) => message.role === "assistant")!;

      act(() => {
        capture.runtime!.thread.getMessageById(answer.id).reload();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledOnce());
      await waitFor(() => expect(consoleError).toHaveBeenCalledOnce());

      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("answer");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("restores the original turn when an edit request fails before its first event", async () => {
    const streamMock = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      throw new Error("request failed before first event");
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture } = await renderAdk(
        async () => ({
          messages: [
            { id: "q-1", type: "human", content: "question" },
            aiMessage("a-1", "answer"),
          ],
        }),
        async () => null,
        streamMock,
      );
      const original = capture.runtime!.thread.getState().messages[0]!;

      await act(async () => {
        capture.runtime!.thread.append({
          role: "user",
          parentId: null,
          sourceId: original.id,
          content: [{ type: "text", text: "edited question" }],
        });
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledOnce());
      await waitFor(() => expect(consoleError).toHaveBeenCalledOnce());

      const messages = JSON.stringify(
        capture.runtime!.thread.getState().messages,
      );
      expect(messages).toContain("question");
      expect(messages).toContain("answer");
      expect(messages).not.toContain("edited question");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("restages a staged message when its resend fails before its first event", async () => {
    const streamMock = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      throw new Error("request failed before first event");
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture } = await renderAdk(
        async () => ({ messages: [aiMessage("a-1", "answer")] }),
        async () => null,
        streamMock,
      );
      await act(async () => {
        capture.runtime!.thread.append({
          role: "user",
          content: [{ type: "text", text: "staged question" }],
          startRun: false,
        });
      });
      const staged = capture.runtime!.thread.getState().messages.at(-1)!;

      await act(async () => {
        await expect(
          capture.runtime!.thread.startRun({ parentId: staged.id }),
        ).rejects.toThrow("request failed before first event");
      });

      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).toContain("staged question");
      await act(async () => {
        await expect(
          capture.runtime!.thread.startRun({ parentId: staged.id }),
        ).rejects.toThrow("request failed before first event");
      });
      expect(streamMock).toHaveBeenCalledTimes(2);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("keeps streamed progress when a reload fails after its first event", async () => {
    const streamMock = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
      yield {
        id: "fresh",
        author: "agent",
        content: { role: "model", parts: [{ text: "fresh response" }] },
      };
      throw new Error("request failed after first event");
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture } = await renderAdk(
        async () => ({
          messages: [
            { id: "q-1", type: "human", content: "question" },
            aiMessage("a-1", "answer"),
          ],
        }),
        async () => null,
        streamMock,
      );
      const answer = capture
        .runtime!.thread.getState()
        .messages.find((message) => message.role === "assistant")!;

      act(() => {
        capture.runtime!.thread.getMessageById(answer.id).reload();
      });
      await waitFor(() => expect(streamMock).toHaveBeenCalledOnce());
      await waitFor(() => expect(consoleError).toHaveBeenCalledOnce());

      const messages = JSON.stringify(
        capture.runtime!.thread.getState().messages,
      );
      expect(messages).not.toContain('"text":"answer"');
      expect(messages).toContain("fresh response");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("restores a failed reload's tool calls, confirmation, auth request and run config", async () => {
    const runConfig = { custom: { model: "original" } };
    const streamMock = vi.fn(async function* (
      _messages: unknown,
      _config: { checkpointId?: string; runConfig?: unknown },
    ): AsyncGenerator<AdkEvent> {
      if (streamMock.mock.calls.length === 2) throw new Error("reload failed");
      if (streamMock.mock.calls.length !== 1) return;
      yield {
        id: "tools",
        author: "agent",
        longRunningToolIds: ["lookup", "confirm", "auth"],
        content: {
          role: "model",
          parts: [
            { functionCall: { id: "lookup", name: "lookup", args: {} } },
            {
              functionCall: {
                id: "confirm",
                name: "adk_request_confirmation",
                args: {
                  originalFunctionCall: {
                    id: "lookup",
                    name: "lookup",
                    args: {},
                  },
                  toolConfirmation: { hint: "Approve?" },
                },
              },
            },
            {
              functionCall: {
                id: "auth",
                name: "adk_request_credential",
                args: { auth_config: { type: "oauth2" } },
              },
            },
          ],
        },
      };
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture } = await renderAdk(
        async () => ({
          messages: [{ id: "q-1", type: "human", content: "question" }],
        }),
        async () => null,
        streamMock,
      );
      await act(async () => {
        await capture.runtime!.thread.append({
          role: "user",
          content: [{ type: "text", text: "start tools" }],
          runConfig,
        });
      });
      const answer = capture
        .runtime!.thread.getState()
        .messages.find((item) =>
          item.content.some((part) => part.type === "tool-call"),
        )!;
      act(() => capture.runtime!.thread.getMessageById(answer.id).reload());
      await waitFor(() => expect(consoleError).toHaveBeenCalledOnce());

      const restored = capture.runtime!.thread.getState();
      expect(
        restored.messages.find((item) => item.id === answer.id),
      ).toBeDefined();
      expect(restored.extras).toMatchObject({
        longRunningToolIds: ["lookup", "confirm", "auth"],
        toolConfirmations: [{ toolCallId: "confirm", hint: "Approve?" }],
        authRequests: [{ toolCallId: "auth", authConfig: { type: "oauth2" } }],
      });
      await act(async () => {
        await capture.send!(
          [
            {
              id: "tool-result",
              type: "tool",
              tool_call_id: "lookup",
              name: "lookup",
              content: "done",
            },
          ],
          {},
        );
      });
      expect(streamMock.mock.calls[2]?.[1]).toMatchObject({ runConfig });
    } finally {
      consoleError.mockRestore();
    }
  });

  it("restores tool run config when Stop interrupts a reload lookup", async () => {
    const checkpoint = deferred<string | null>();
    const runConfig = { custom: { model: "before-stop" } };
    const streamMock = vi.fn(async function* (
      _messages: unknown,
      _config: { checkpointId?: string; runConfig?: unknown },
    ): AsyncGenerator<AdkEvent> {
      if (streamMock.mock.calls.length !== 1) return;
      yield {
        id: "tool-call",
        author: "agent",
        longRunningToolIds: ["call-1"],
        content: {
          role: "model",
          parts: [{ functionCall: { id: "call-1", name: "lookup", args: {} } }],
        },
      };
    });
    const { capture } = await renderAdk(
      async () => ({
        messages: [{ id: "q-1", type: "human", content: "question" }],
      }),
      () => checkpoint.promise,
      streamMock,
      false,
      true,
    );
    await act(async () => {
      await capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "run" }],
        runConfig,
      });
    });
    const answer = capture
      .runtime!.thread.getState()
      .messages.find((item) =>
        item.content.some((part) => part.type === "tool-call"),
      )!;
    act(() => capture.runtime!.thread.getMessageById(answer.id).reload());
    await waitFor(() =>
      expect(
        JSON.stringify(capture.runtime!.thread.getState().messages),
      ).not.toContain("call-1"),
    );
    act(() => capture.runtime!.thread.cancelRun());
    expect(
      JSON.stringify(capture.runtime!.thread.getState().messages),
    ).toContain("call-1");
    await act(async () => {
      await capture.send!(
        [
          {
            id: "result-1",
            type: "tool",
            tool_call_id: "call-1",
            name: "lookup",
            content: "done",
          },
        ],
        {},
      );
    });
    expect(streamMock.mock.calls[1]?.[1]).toMatchObject({ runConfig });
    checkpoint.resolve(null);
  });

  it("restores an edit when checkpoint lookup fails", async () => {
    const checkpointError = new Error("lookup failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture, streamMock } = await renderAdk(
        async () => ({
          messages: [
            { id: "q-1", type: "human", content: "question" },
            aiMessage("a-1", "answer"),
          ],
        }),
        async () => {
          throw checkpointError;
        },
      );
      const question = capture.runtime!.thread.getState().messages[0]!;
      act(() => {
        capture.runtime!.thread.append({
          role: "user",
          parentId: null,
          sourceId: question.id,
          content: [{ type: "text", text: "edited question" }],
        });
      });
      await waitFor(() => expect(consoleError).toHaveBeenCalledOnce());
      const messages = JSON.stringify(
        capture.runtime!.thread.getState().messages,
      );
      expect(messages).toContain("question");
      expect(messages).toContain("answer");
      expect(messages).not.toContain("edited question");
      expect(streamMock).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("restores a failed same-tick edit while retaining the other send", async () => {
    const requests: string[] = [];
    const streamMock = vi.fn(async function* (
      messages: unknown,
    ): AsyncGenerator<AdkEvent> {
      const text = JSON.stringify(messages);
      requests.push(text);
      if (text.includes("edited question")) throw new Error("edit failed");
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture } = await renderAdk(
        async () => ({
          messages: [
            { id: "q-1", type: "human", content: "question" },
            aiMessage("a-1", "answer"),
          ],
        }),
        async () => null,
        streamMock,
      );
      const question = capture.runtime!.thread.getState().messages[0]!;
      act(() => {
        capture.runtime!.thread.append({
          role: "user",
          parentId: null,
          sourceId: question.id,
          content: [{ type: "text", text: "edited question" }],
        });
        capture.runtime!.thread.append({
          role: "user",
          content: [{ type: "text", text: "second send" }],
        });
      });
      await waitFor(() => expect(requests).toHaveLength(2));
      await waitFor(() => expect(consoleError).toHaveBeenCalledOnce());
      const messages = JSON.stringify(
        capture.runtime!.thread.getState().messages,
      );
      expect(messages).toContain("second send");
      expect(messages).toContain("answer");
      expect(messages).not.toContain("edited question");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("keeps a same-tick send's completed response when a staged resend fails", async () => {
    const requests: string[] = [];
    const streamMock = vi.fn(async function* (
      messages: unknown,
    ): AsyncGenerator<AdkEvent> {
      const text = JSON.stringify(messages);
      requests.push(text);
      if (text.includes("staged question")) throw new Error("resend failed");
      yield {
        id: "other-answer",
        author: "agent",
        content: { role: "model", parts: [{ text: "other response" }] },
      };
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { capture } = await renderAdk(
        async () => ({ messages: [aiMessage("a-1", "answer")] }),
        async () => null,
        streamMock,
      );
      await act(async () => {
        await capture.runtime!.thread.append({
          role: "user",
          content: [{ type: "text", text: "staged question" }],
          startRun: false,
        });
      });
      const staged = capture.runtime!.thread.getState().messages.at(-1)!;
      let resend!: Promise<void>;
      act(() => {
        resend = capture.runtime!.thread.startRun({
          parentId: staged.id,
        }) as unknown as Promise<void>;
        void resend.catch(() => {});
        void capture.send!(
          [{ id: "other-send", type: "human", content: "other send" }],
          {},
        );
      });
      await waitFor(() => expect(requests).toHaveLength(2));
      await act(async () => {
        await expect(resend).rejects.toThrow("resend failed");
      });
      const messages = JSON.stringify(
        capture.runtime!.thread.getState().messages,
      );
      expect(messages).toContain("staged question");
      expect(messages).toContain("other send");
      expect(messages).toContain("other response");
      expect(
        requests.filter((request) => request.includes("other send")),
      ).toHaveLength(1);
    } finally {
      consoleError.mockRestore();
    }
  });
});
