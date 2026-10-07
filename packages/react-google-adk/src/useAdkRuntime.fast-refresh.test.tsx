// @vitest-environment jsdom

import { act } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { AdkThreadSnapshot } from "./types";

type Family = { current: unknown };
type RendererInternals = {
  setRefreshHandler: (resolve: (type: unknown) => Family | undefined) => void;
  scheduleRefresh: (
    root: unknown,
    update: { staleFamilies: Set<Family>; updatedFamilies: Set<Family> },
  ) => void;
};

const refreshHarness = vi.hoisted(() => {
  const state: {
    renderer: RendererInternals | undefined;
    roots: Set<unknown>;
  } = { renderer: undefined, roots: new Set() };
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("__REACT_DEVTOOLS_GLOBAL_HOOK__", {
    supportsFiber: true,
    inject: (internals: RendererInternals) => {
      state.renderer = internals;
      return 1;
    },
    onScheduleFiberRoot: () => {},
    onCommitFiberRoot: (_id: number, root: unknown) => state.roots.add(root),
    onCommitFiberUnmount: () => {},
  });
  return state;
});

const { aui } = vi.hoisted(() => ({
  aui: {
    threadListItem: {
      source: {},
      getState: () => ({ externalId: "adk-1" }),
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => aui,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useCloudThreadListAdapter: () => ({}),
  useRemoteThreadListRuntime: ({
    runtimeHook,
  }: {
    runtimeHook: () => unknown;
  }) => runtimeHook(),
  useExternalMessageConverter: ({ messages }: { messages: unknown }) =>
    messages,
  useExternalStoreRuntime: (options: unknown) => options,
}));

const { cleanup, render, waitFor } = await import("@testing-library/react");
const { useAdkRuntime } = await import("./useAdkRuntime");

afterEach(() => {
  cleanup();
  refreshHarness.renderer?.setRefreshHandler(() => undefined);
  refreshHarness.roots.clear();
});
afterAll(() => vi.unstubAllGlobals());

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const refresh = async (Before: unknown, After: unknown) => {
  const family: Family = { current: After };
  refreshHarness.renderer!.setRefreshHandler((type) =>
    type === Before || type === After ? family : undefined,
  );
  await act(async () => {
    for (const root of refreshHarness.roots) {
      refreshHarness.renderer!.scheduleRefresh(root, {
        staleFamilies: new Set(),
        updatedFamilies: new Set([family]),
      });
    }
  });
  await act(async () => {});
};

it("keeps an initial thread load through Fast Refresh and aborts a later load on unmount", async () => {
  const initial = deferred<AdkThreadSnapshot>();
  const refetch = deferred<AdkThreadSnapshot>();
  const signals: AbortSignal[] = [];
  const load = vi.fn(
    (_id: string, options?: { signal?: AbortSignal | undefined }) => {
      signals.push(options!.signal!);
      return signals.length === 1 ? initial.promise : refetch.promise;
    },
  );
  let runtime:
    | {
        messages: unknown;
        onRefetchThread: () => Promise<void>;
      }
    | undefined;
  let rendered: string | undefined;
  const host = (name: string) => () => {
    rendered = name;
    runtime = useAdkRuntime({
      stream: async function* () {},
      load,
    }) as unknown as typeof runtime;
    return null;
  };
  const Before = host("before");
  const After = host("after");
  const view = render(<Before />);
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  expect(signals[0]!.aborted).toBe(false);

  await refresh(Before, After);
  expect(rendered).toBe("after");
  expect(signals[0]!.aborted).toBe(false);
  expect(load).toHaveBeenCalledTimes(1);

  let refetchSettled = false;
  act(() => {
    void runtime!.onRefetchThread().then(() => {
      refetchSettled = true;
    });
  });
  expect(load).toHaveBeenCalledTimes(1);
  expect(refetchSettled).toBe(false);

  await act(async () => {
    initial.resolve({
      messages: [
        {
          id: "history-1",
          type: "ai",
          content: [{ type: "text", text: "history landed" }],
        },
      ],
    });
  });
  await waitFor(() => expect(refetchSettled).toBe(true));
  await waitFor(() =>
    expect(JSON.stringify(runtime!.messages)).toContain("history landed"),
  );

  act(() => {
    void runtime!.onRefetchThread();
  });
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  expect(signals[1]!.aborted).toBe(false);
  view.unmount();
  await act(async () => {});
  expect(signals[1]!.aborted).toBe(true);
  refetch.resolve({ messages: [] });
});
