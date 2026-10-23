// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import {
  actSettled,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly never[] = [];

const useThreadRuntime = () =>
  useExternalStoreRuntime({
    messages: EMPTY_MESSAGES,
    onNew: async () => {},
  } as never);

const createHarness = (path: "class" | "client") => {
  const list = vi.fn(async () => ({
    threads: [
      { status: "regular" as const, remoteId: "t1" },
      { status: "regular" as const, remoteId: "t2" },
    ],
  }));
  const adapter = makeAdapter({
    list,
    fetch: vi.fn(async (id: string) => ({
      status: "regular" as const,
      remoteId: id,
      externalId: id,
      title: id,
    })),
    ...(path === "class"
      ? {
          unstable_Provider: ({ children }: { children?: ReactNode }) =>
            children,
        }
      : {}),
  });
  const runtimeRef: { current: AssistantRuntime | null } = { current: null };
  const useRuntime = () => {
    const runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: useThreadRuntime,
    });
    runtimeRef.current = runtime;
    return runtime;
  };
  return { list, runtimeRef, useRuntime };
};

const mainRemoteId = (aui: AssistantClient) => {
  const state = aui.threads().getState();
  return state.threadItems.find((item) => item.id === state.mainThreadId)
    ?.remoteId;
};

beforeEach(() => {
  vi.spyOn(console, "error");
});

afterEach(() => {
  try {
    expect(console.error).not.toHaveBeenCalled();
  } finally {
    cleanup();
    vi.restoreAllMocks();
  }
});

describe.each(["class", "client"] as const)(
  "useRemoteThreadListRuntime lifetime (%s)",
  (path) => {
    it.each([false, true])(
      "keeps a hoisted runtime across a provider remount (StrictMode: %s)",
      async (strict) => {
        const { list, runtimeRef, useRuntime } = createHarness(path);
        let aui: AssistantClient | undefined;
        const Capture = () => {
          aui = useAui();
          return null;
        };
        const App = ({ mounted }: { mounted: boolean }) => {
          const runtime = useRuntime();
          return mounted ? (
            <AssistantRuntimeProvider runtime={runtime}>
              <Capture />
            </AssistantRuntimeProvider>
          ) : null;
        };
        const wrap = (mounted: boolean) =>
          strict ? (
            <StrictMode>
              <App mounted={mounted} />
            </StrictMode>
          ) : (
            <App mounted={mounted} />
          );

        const view = render(wrap(true));
        await waitFor(() =>
          expect(aui!.threads().getState().threadIds).toEqual(["t1", "t2"]),
        );
        act(() => {
          aui!.threads().switchToThread("t2");
        });
        await waitFor(() => expect(mainRemoteId(aui!)).toBe("t2"));
        view.rerender(wrap(false));
        view.rerender(wrap(true));

        await waitFor(() =>
          expect(runtimeRef.current!.threads.mainItem.getState().remoteId).toBe(
            "t2",
          ),
        );
        expect(list).toHaveBeenCalledTimes(1);
      },
    );

    it("shares one list and selection across two providers", async () => {
      const { list, useRuntime } = createHarness(path);
      const clients: { first?: AssistantClient; second?: AssistantClient } = {};
      const Capture = ({ slot }: { slot: "first" | "second" }) => {
        clients[slot] = useAui();
        return null;
      };
      const App = () => {
        const runtime = useRuntime();
        return (
          <>
            <AssistantRuntimeProvider runtime={runtime}>
              <Capture slot="first" />
            </AssistantRuntimeProvider>
            <AssistantRuntimeProvider runtime={runtime}>
              <Capture slot="second" />
            </AssistantRuntimeProvider>
          </>
        );
      };

      render(<App />);
      await waitFor(() => {
        expect(clients.first!.threads().getState().threadIds).toEqual([
          "t1",
          "t2",
        ]);
        expect(clients.second!.threads().getState().threadIds).toEqual([
          "t1",
          "t2",
        ]);
      });
      act(() => {
        clients.first!.threads().switchToThread("t2");
      });
      await waitFor(() => expect(mainRemoteId(clients.first!)).toBe("t2"));

      const secondState = clients.second!.threads().getState();
      expect(mainRemoteId(clients.second!)).toBe("t2");
      expect(clients.first!.threads().getState().threadIds).toEqual([
        "t1",
        "t2",
      ]);
      expect(secondState.threadIds).toEqual(["t1", "t2"]);
      expect(list).toHaveBeenCalledTimes(1);
    });

    it("switches before any provider mounts and resolves after one mounts", async () => {
      const { runtimeRef, useRuntime } = createHarness(path);
      const App = ({ mounted }: { mounted: boolean }) => {
        const runtime = useRuntime();
        return mounted ? (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        ) : null;
      };

      const view = render(<App mounted={false} />);
      const runtime = runtimeRef.current!;
      await waitFor(() =>
        expect(runtime.threads.getState().threadIds).toEqual(["t1", "t2"]),
      );

      let switched!: Promise<void>;
      act(() => {
        switched = runtime.threads.switchToThread("t2");
        switched.catch(() => {});
      });
      view.rerender(<App mounted />);
      await actSettled(() => switched);

      expect(runtime.threads.mainItem.getState().remoteId).toBe("t2");
    });

    it("switches to a draft and back after the provider unmounts", async () => {
      const { runtimeRef, useRuntime } = createHarness(path);
      const App = ({ mounted }: { mounted: boolean }) => {
        const runtime = useRuntime();
        return mounted ? (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        ) : null;
      };

      const view = render(<App mounted />);
      const runtime = runtimeRef.current!;
      await waitFor(() =>
        expect(runtime.threads.getState().threadIds).toEqual(["t1", "t2"]),
      );
      await actSettled(() => runtime.threads.switchToThread("t2"));
      view.rerender(<App mounted={false} />);

      await actSettled(() => runtime.threads.switchToNewThread());
      expect(runtime.threads.getState().mainThreadId).toBe(
        runtime.threads.mainItem.getState().id,
      );
      expect(runtime.threads.mainItem.getState()).toMatchObject({
        status: "new",
        remoteId: undefined,
      });

      await actSettled(() => runtime.threads.switchToThread("t2"));
      expect(runtime.threads.getState().mainThreadId).toBe("t2");
      expect(runtime.threads.mainItem.getState().remoteId).toBe("t2");
    });
  },
);

it.each(["class", "client"] as const)(
  "warns about unstable_Provider once per runtime only on the class path (%s)",
  async (path) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { list, useRuntime } = createHarness(path);
    const App = () => (
      <AssistantRuntimeProvider runtime={useRuntime()}>
        {null}
      </AssistantRuntimeProvider>
    );

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await waitFor(() => expect(list).toHaveBeenCalled());

    const deprecations = warn.mock.calls.filter(([message]) =>
      String(message).includes("unstable_Provider is deprecated"),
    );
    expect(deprecations).toHaveLength(path === "class" ? 1 : 0);
  },
);
