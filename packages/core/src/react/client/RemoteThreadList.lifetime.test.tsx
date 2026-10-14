// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import {
  AuiConfig,
  createAssistantClient,
  type AssistantConfigSource,
} from "@assistant-ui/store/client";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadList } from "./RemoteThreadList";

const threadState = { isRunning: false, messages: [] };
const composer = { getState: () => ({}) };
const suggestions = { getState: () => ({ suggestions: [] }) };
const CapturingThread = resource(
  ({ id, signals }: { id: string; signals: Map<string, AbortSignal> }) => {
    const signal = useAssistantClientDestroySignal();
    if (signal) signals.set(id, signal);
    return {
      getState: () => threadState,
      composer: () => composer,
      suggestions: () => suggestions,
    };
  },
);

const makeAdapter = (
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [{ remoteId: "thread-a", status: "regular" as const, title: "A" }],
  })),
  fetch: vi.fn(async (id) => ({
    remoteId: id,
    status: "regular" as const,
    title: id,
  })),
  initialize: vi.fn(async (id) => ({ remoteId: id })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(
    async () =>
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
  ),
  ...overrides,
});

const mount = (
  initialAdapter = makeAdapter(),
  options: {
    backgroundThreads?: boolean;
    threadId?: string;
    reopenControlledThreadOnAdapterChange?: boolean;
  } = {},
) => {
  let adapter = initialAdapter;
  const listeners = new Set<() => void>();
  const signals = new Map<string, AbortSignal>();
  const source: AssistantConfigSource = {
    getConfig: () =>
      AuiConfig({
        threads: RemoteThreadList({
          adapter,
          backgroundThreads: options.backgroundThreads,
          threadId: options.threadId,
          __internal_reopenControlledThreadOnAdapterChange:
            options.reopenControlledThreadOnAdapterChange,
          thread: (id) => CapturingThread({ id, signals }) as never,
        }),
      }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const handle = createAssistantClient(source);
  handle.subscribe(() => {});
  return {
    handle,
    signals,
    replaceAdapter(next: RemoteThreadListAdapter) {
      adapter = next;
      for (const listener of listeners) listener();
      flushTapSync(() => {});
    },
  };
};

afterEach(() => vi.restoreAllMocks());

describe("RemoteThreadList body lifetimes", () => {
  it("keeps a hidden single body signal alive for a later visit", async () => {
    const { handle, signals } = mount();
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const draftSignal = signals.get(draftId)!;
    await threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe(
        "thread-a",
      );
    });
    expect(draftSignal.aborted).toBe(false);
    await handle.getClient().threads.__internal_getRawActions!().switchToThread(
      draftId,
    );
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe(draftId);
    });
    expect(signals.get(draftId)).toBe(draftSignal);
    handle.destroy();
  });

  it("keeps visited body signals alive across background switches", async () => {
    const { handle, signals } = mount(makeAdapter(), {
      backgroundThreads: true,
    });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const draftSignal = signals.get(draftId)!;
    await threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => expect(signals.get("thread-a")).toBeDefined());
    const regularSignal = signals.get("thread-a")!;
    expect(draftSignal.aborted).toBe(false);
    await threads.__internal_getRawActions!().switchToThread(draftId);
    expect(regularSignal.aborted).toBe(false);
    handle.destroy();
  });

  it.each(["delete", "detach"] as const)(
    "aborts a visited body on %s",
    async (action) => {
      const { handle, signals } = mount(makeAdapter(), {
        backgroundThreads: true,
      });
      const threads = handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      const draftId = threads.getState().mainThreadId;
      await threads.__internal_getRawActions!().switchToThread("thread-a");
      await vi.waitFor(() => expect(signals.get("thread-a")).toBeDefined());
      const signal = signals.get("thread-a")!;
      await threads.__internal_getRawActions!().switchToThread(draftId);
      expect(signal.aborted).toBe(false);
      await threads.__internal_getRawActions!()[action]("thread-a");
      expect(signal.aborted).toBe(true);
      expect(signals.get(draftId)?.aborted).toBe(false);
      handle.destroy();
    },
  );

  it("aborts old body signals when reload replaces the adapter", async () => {
    const setup = mount(makeAdapter(), { backgroundThreads: true });
    const threads = setup.handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const draftSignal = setup.signals.get(draftId)!;
    await threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => expect(setup.signals.get("thread-a")).toBeDefined());
    const regularSignal = setup.signals.get("thread-a")!;
    const replacement = makeAdapter();
    setup.replaceAdapter(replacement);
    expect(draftSignal.aborted).toBe(false);
    expect(regularSignal.aborted).toBe(false);
    await vi.waitFor(async () => {
      flushTapSync(() => {});
      await setup.handle.getClient().threads.reload();
      expect(replacement.list).toHaveBeenCalled();
    });
    expect(draftSignal.aborted).toBe(true);
    expect(regularSignal.aborted).toBe(true);
    setup.handle.destroy();
  });

  it("aborts every body when the client is destroyed", async () => {
    const { handle, signals } = mount(makeAdapter(), {
      backgroundThreads: true,
    });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftSignal = signals.get(threads.getState().mainThreadId)!;
    await threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => expect(signals.get("thread-a")).toBeDefined());
    const regularSignal = signals.get("thread-a")!;
    handle.destroy();
    expect(draftSignal.aborted).toBe(true);
    expect(regularSignal.aborted).toBe(true);
  });

  it("reopens a controlled thread through a replacement adapter whose list fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const replacement = makeAdapter({
      list: vi.fn(async () => {
        throw new Error("network");
      }),
      fetch: vi.fn(async (id) => ({
        remoteId: id,
        status: "regular" as const,
        title: id,
      })),
    });
    const setup = mount(makeAdapter(), {
      threadId: "thread-a",
      reopenControlledThreadOnAdapterChange: true,
    });
    await vi.waitFor(() => {
      expect(
        setup.handle.getClient().threads.item("main").getState().remoteId,
      ).toBe("thread-a");
    });
    setup.replaceAdapter(replacement);
    await vi.waitFor(async () => {
      flushTapSync(() => {});
      await setup.handle.getClient().threads.reload();
      expect(replacement.list).toHaveBeenCalled();
    });
    await vi.waitFor(() =>
      expect(replacement.fetch).toHaveBeenCalledWith("thread-a"),
    );
    await vi.waitFor(() => {
      expect(
        setup.handle.getClient().threads.item("main").getState().remoteId,
      ).toBe("thread-a");
    });
    setup.handle.destroy();
  });
});
