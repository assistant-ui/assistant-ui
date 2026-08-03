// @vitest-environment jsdom

import { act, render, renderHook, waitFor } from "@testing-library/react";
import { type FC, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useAui } from "@assistant-ui/store";
import { useAdkRuntime } from "./useAdkRuntime";
import type { AdkMessage, AdkThreadSnapshot } from "./types";

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
) => {
  const streamMock = vi.fn(async function* () {});
  const capture: { runtime: AssistantRuntime | null } = { runtime: null };

  // the runtime hook's binder mounts inside the provider, so the provider has
  // to be in the same tree as the hook for a thread switch to settle
  const Inner: FC = () => {
    const runtime = useAdkRuntime({
      stream: streamMock as never,
      ...(load ? { load } : {}),
      sessionAdapter: makeThreadListAdapter(),
    });
    capture.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };

  let unmount!: () => void;
  await act(async () => {
    ({ unmount } = render(<Inner />));
  });
  await waitFor(() => expect(capture.runtime).not.toBeNull());

  await act(async () => {
    await capture.runtime!.threads.switchToThread("adk-1");
  });

  return { capture, streamMock, unmount };
};

describe("useAdkRuntime refetch", () => {
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
    await act(async () => {
      await capture.runtime!.threads.switchToThread("adk-1");
    });
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

    expect(signals[1]?.aborted).toBe(true);
    pending.resolve({ messages: [] });
  });
});
