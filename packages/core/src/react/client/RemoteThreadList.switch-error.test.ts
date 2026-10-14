import { describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadList } from "./RemoteThreadList";

const Composer = { getState: () => ({}) };
const Suggestions = { getState: () => ({ suggestions: [] }) };
const Thread = resource(function useThread() {
  return {
    getState: () => ({ isRunning: false, messages: [] }),
    composer: () => Composer,
    suggestions: () => Suggestions,
  };
});

const makeAdapter = (
  fetch: RemoteThreadListAdapter["fetch"],
): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({ threads: [] })),
  fetch,
  initialize: vi.fn(async (id: string) => ({
    remoteId: id,
    externalId: undefined,
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream() as never),
});

const mount = (adapter: RemoteThreadListAdapter, threadId?: string) => {
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadList({
        adapter,
        threadId,
        thread: () => Thread() as never,
      }),
    }),
  );
  handle.subscribe(() => {});
  return handle;
};

const waitFor = (assertion: () => void) =>
  vi.waitFor(assertion, { interval: 10 });

describe("RemoteThreadList switchError", () => {
  it.each(["online", "visibilitychange"] as const)(
    "reports a failed controlled switch and retries on %s",
    async (event) => {
      vi.stubGlobal("window", new EventTarget());
      const document = Object.assign(new EventTarget(), {
        visibilityState: "hidden",
      });
      vi.stubGlobal("document", document);
      const error = new Error("offline");
      const fetch = vi
        .fn<RemoteThreadListAdapter["fetch"]>()
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ status: "regular", remoteId: "r5" });
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const handle = mount(makeAdapter(fetch), "r5");

      try {
        const threads = handle.getClient().threads;
        const initialMainId = threads.getState().mainThreadId;
        await waitFor(() =>
          expect(threads.getState().switchError).toEqual({
            threadId: "r5",
            error,
          }),
        );
        expect(threads.getState().mainThreadId).toBe(initialMainId);
        expect(consoleError).toHaveBeenCalledWith(
          "[assistant-ui] thread list switch failed:",
          error,
        );

        if (event === "online") {
          window.dispatchEvent(new Event("online"));
        } else {
          document.visibilityState = "visible";
          document.dispatchEvent(new Event("visibilitychange"));
        }

        await waitFor(() =>
          expect(threads.item("main").getState().remoteId).toBe("r5"),
        );
        expect(threads.getState().switchError).toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(2);
      } finally {
        handle.destroy();
        consoleError.mockRestore();
        vi.unstubAllGlobals();
      }
    },
  );

  it("reports an uncontrolled failure and clears it on a new switch", async () => {
    const error = new Error("missing");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const handle = mount(makeAdapter(vi.fn().mockRejectedValue(error)));
    try {
      const threads = handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      flushTapSync(() => threads.switchToThread("missing"));
      await waitFor(() =>
        expect(threads.getState().switchError).toEqual({
          threadId: "missing",
          error,
        }),
      );
      flushTapSync(() => threads.switchToNewThread());
      await waitFor(() =>
        expect(threads.getState().switchError).toBeUndefined(),
      );
    } finally {
      handle.destroy();
      consoleError.mockRestore();
    }
  });

  it("ignores a failure after a later switch starts", async () => {
    let rejectFetch!: (error: Error) => void;
    const fetch = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<RemoteThreadListAdapter["fetch"]>>>(
          (_resolve, reject) => {
            rejectFetch = reject;
          },
        ),
    );
    const error = new Error("late failure");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const handle = mount(makeAdapter(fetch));
    try {
      const threads = handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      flushTapSync(() => threads.switchToThread("missing"));
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      flushTapSync(() => threads.switchToNewThread());
      rejectFetch(error);
      await waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          "[assistant-ui] thread list switch failed:",
          error,
        ),
      );
      expect(threads.getState().switchError).toBeUndefined();
    } finally {
      handle.destroy();
      consoleError.mockRestore();
    }
  });

  it.each([false, true])(
    "does not retry a mismatched or uncontrolled switch on online (controlled=%s)",
    async (controlled) => {
      vi.stubGlobal("window", new EventTarget());
      vi.stubGlobal(
        "document",
        Object.assign(new EventTarget(), { visibilityState: "visible" }),
      );
      const error = new Error("offline");
      const fetch = vi.fn().mockRejectedValue(error);
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const handle = mount(makeAdapter(fetch), controlled ? "r5" : undefined);
      try {
        const threads = handle.getClient().threads;
        await threads.getLoadThreadsPromise();
        if (controlled) {
          await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        }
        flushTapSync(() => threads.switchToThread("missing"));
        await waitFor(() =>
          expect(threads.getState().switchError).toEqual({
            threadId: "missing",
            error,
          }),
        );
        const calls = fetch.mock.calls.length;
        window.dispatchEvent(new Event("online"));
        await Promise.resolve();
        expect(fetch).toHaveBeenCalledTimes(calls);
      } finally {
        handle.destroy();
        consoleError.mockRestore();
        vi.unstubAllGlobals();
      }
    },
  );
});
