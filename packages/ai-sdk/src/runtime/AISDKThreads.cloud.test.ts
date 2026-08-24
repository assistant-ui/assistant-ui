// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { AssistantCloud } from "assistant-cloud";
import type { RemoteThreadListAdapter } from "@assistant-ui/core";
import type { ThreadHistoryAdapter } from "@assistant-ui/core";

const load = vi.hoisted(() => vi.fn(async () => ({ messages: [] })));
const append = vi.hoisted(() => vi.fn(async () => {}));

const mocks = vi.hoisted(() => {
  const history: ThreadHistoryAdapter = {
    load: async () => ({ messages: [] }),
    append: async () => {},
    withFormat: () => ({
      load,
      append,
      delete: async () => {},
      reportTelemetry: () => {},
    }),
  };
  const adapter: RemoteThreadListAdapter = {
    list: vi.fn(async () => ({
      threads: [
        { status: "regular" as const, remoteId: "t1", title: "One" },
        { status: "regular" as const, remoteId: "t2", title: "Two" },
      ],
    })),
    initialize: vi.fn(async (threadId: string) => ({
      remoteId: threadId,
      externalId: undefined,
    })),
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
        }) as never,
    ),
    fetch: vi.fn(async (id: string) => ({
      status: "regular" as const,
      remoteId: id,
      externalId: undefined,
      title: id,
    })),
    unstable_useAdapters: function useAdapters() {
      return { history };
    },
  };
  return { adapter };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useCloudThreadListAdapter: () => mocks.adapter,
}));

import { AISDKThreads } from "./AISDKThreads";
import { createCancellableTransport } from "./__tests__/controlled-transport";

describe("AISDKThreads cloud", () => {
  it("reloads history when switching a keyed cloud thread", async () => {
    const handle = createAssistantClient(
      AuiConfig({
        threads: AISDKThreads({
          cloud: {} as AssistantCloud,
          threadId: "t1",
        }),
      }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    await vi.waitFor(() => {
      expect(load).toHaveBeenCalled();
    });
    const afterFirst = load.mock.calls.length;
    flushTapSync(() => aui.threads.switchToThread("t2"));
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t2");
    });
    await vi.waitFor(() => {
      expect(load.mock.calls.length).toBeGreaterThan(afterFirst);
    });
    handle.destroy();
  });

  it("stops an in-flight cloud chat when switching away", async () => {
    const chat = createCancellableTransport();
    const handle = createAssistantClient(
      AuiConfig({
        threads: AISDKThreads({
          cloud: {} as AssistantCloud,
          threadId: "t1",
          transport: () => chat.transport,
        }),
      }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();
    try {
      await aui.threads.getLoadThreadsPromise();
      await vi.waitFor(() => {
        expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
      });
      await vi.waitFor(() => expect(load).toHaveBeenCalled());
      await vi.waitFor(() => {
        expect(handle.getClient().thread.getState().isLoading).toBe(false);
      });
      flushTapSync(() => handle.getClient().composer.setText("stream me"));
      flushTapSync(() => handle.getClient().composer.send());
      await vi.waitFor(() => {
        expect(handle.getClient().thread.getState().isRunning).toBe(true);
      });
      flushTapSync(() => handle.getClient().threads.switchToThread("t2"));
      await vi.waitFor(() => {
        expect(handle.getClient().threads.getState().mainThreadId).toBe("t2");
      });
      await vi.waitFor(() => {
        expect(chat.getCancelCount()).toBe(1);
      });
    } finally {
      handle.destroy();
    }
  });
});
