import { describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import {
  AuiConfig,
  createAssistantClient,
  type AssistantConfigSource,
} from "@assistant-ui/store/client";
import { RemoteThreadList } from "./RemoteThreadList";

const stubComposer = { getState: () => ({}) };
const stubSuggestions = { getState: () => ({ suggestions: [] }) };
const useStubThread = (props: {
  threadId: string;
  isRunning?: boolean | undefined;
}) => ({
  getState: () => ({ isRunning: props.isRunning === true, messages: [] }),
  composer: () => stubComposer,
  suggestions: () => stubSuggestions,
});
const StubThread = resource(useStubThread);

describe("RemoteThreadList current thread selection", () => {
  it("preserves a pending controlled switch when the displayed thread is selected", async () => {
    let resolveFetch!: (value: { status: "regular"; remoteId: string }) => void;
    const fetchPromise = new Promise<{
      status: "regular";
      remoteId: string;
    }>((resolve) => {
      resolveFetch = resolve;
    });
    const adapter = {
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "r0" }],
      })),
      fetch: vi.fn(() => fetchPromise),
      initialize: vi.fn(async (id: string) => ({ remoteId: id })),
      rename: vi.fn(async () => {}),
      archive: vi.fn(async () => {}),
      unarchive: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      generateTitle: vi.fn(async () => new ReadableStream() as never),
    };
    const listeners = new Set<() => void>();
    const onThreadIdChange = vi.fn();
    const onSwitchToThread = vi.fn();
    let threadId = "r0";
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
            threadId,
            onThreadIdChange,
            onSwitchToThread,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    try {
      await handle.getClient().threads.getLoadThreadsPromise();
      await vi.waitFor(() =>
        expect(handle.getClient().threads.getState().mainThreadId).toBe("r0"),
      );
      onSwitchToThread.mockClear();

      threadId = "r1";
      for (const listener of listeners) listener();
      await vi.waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("r1"));

      flushTapSync(() => handle.getClient().threads.switchToThread("r0"));
      expect(handle.getClient().threads.getState().mainThreadId).toBe("r0");
      expect(onThreadIdChange).not.toHaveBeenCalled();

      resolveFetch({ status: "regular", remoteId: "r1" });
      await vi.waitFor(() => {
        expect(handle.getClient().threads.getState().mainThreadId).toBe("r1");
        expect(onSwitchToThread).toHaveBeenCalledExactlyOnceWith("r1");
      });
      expect(onThreadIdChange).not.toHaveBeenCalled();
    } finally {
      handle.destroy();
    }
  });
});
