import { vi } from "vitest";
import { RemoteThreadListThreadListRuntimeCore } from "../react/runtimes/RemoteThreadListThreadListRuntimeCore";
import type { RemoteThreadListAdapter } from "../runtimes/remote-thread-list/types";
import type { ModelContextProvider } from "../model-context/types";

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export const contextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
  subscribe: () => () => {},
};

export function makeAdapter(
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter {
  return {
    list: vi.fn(async () => ({ threads: [] })),
    initialize: vi.fn(async (threadId: string) => ({
      remoteId: threadId,
      externalId: threadId,
    })),
    rename: vi.fn(async () => {}),
    archive: vi.fn(async () => {}),
    unarchive: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    generateTitle: vi.fn(
      async () =>
        new ReadableStream({
          start(c) {
            c.close();
          },
        }) as never,
    ),
    fetch: vi.fn(async (id: string) => ({
      status: "regular" as const,
      remoteId: id,
      externalId: id,
      title: "Test",
    })),
    ...overrides,
  };
}

export function createCore(
  adapter: RemoteThreadListAdapter,
  threadId?: string,
): RemoteThreadListThreadListRuntimeCore {
  const core = new RemoteThreadListThreadListRuntimeCore(
    { adapter, runtimeHook: () => ({}) as never, threadId },
    contextProvider,
  );
  // `startThreadRuntime` blocks until a React component attaches a runtime;
  // stub it so non-React unit tests don't hang.
  (
    core as unknown as {
      _hookManager: {
        startThreadRuntime: (id: string) => Promise<unknown>;
      };
    }
  )._hookManager.startThreadRuntime = async () => ({});
  return core;
}
