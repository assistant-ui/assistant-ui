// @vitest-environment jsdom

import { createRef, startTransition, Suspense } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { resource, withKey } from "@assistant-ui/tap";
import {
  AuiConfig,
  AuiProvider,
  type AssistantClient,
} from "@assistant-ui/store";
import { describe, expect, it, vi } from "vitest";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadList } from "./RemoteThreadList";

const composer = { getState: () => ({}) };
const suggestions = { getState: () => ({ suggestions: [] }) };
const threadState = { isRunning: false, messages: [] };
const useStubThread = () => ({
  getState: () => threadState,
  composer: () => composer,
  suggestions: () => suggestions,
});
const StubThread = resource(useStubThread);

const useIdentifiedThread = ({
  id,
  onRender,
  onRefetch,
}: {
  id: string;
  onRender: (id: string) => void;
  onRefetch: (id: string) => void;
}) => {
  onRender(id);
  return {
    getState: () => ({ isRunning: false, messages: [{ id }] }),
    composer: () => composer,
    suggestions: () => suggestions,
    unstable_refetchThread: async () => onRefetch(id),
  };
};
const IdentifiedThread = resource(useIdentifiedThread);

const makeAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      { status: "regular" as const, remoteId: "thread-1", title: "Thread" },
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
  generateTitle: vi.fn(async () => new ReadableStream()),
  fetch: vi.fn(async (remoteId: string) => ({
    status: "regular" as const,
    remoteId,
    externalId: undefined,
    title: "Thread",
  })),
});

describe("RemoteThreadList concurrent rendering", () => {
  it("keeps actions scoped to the committed adapter", async () => {
    const adapterA = makeAdapter();
    const adapterB = makeAdapter();
    const clientRef = createRef<AssistantClient>();
    const never = new Promise<never>(() => {});
    let suspend = false;

    const Blocker = () => {
      if (suspend) throw never;
      return null;
    };
    const App = ({ adapter }: { adapter: RemoteThreadListAdapter }) => (
      <Suspense fallback={null}>
        <AuiProvider
          ref={clientRef as never}
          config={AuiConfig({
            threads: RemoteThreadList({
              adapter,
              thread: () => StubThread() as never,
            }),
          })}
        >
          <Blocker />
        </AuiProvider>
      </Suspense>
    );

    const view = render(<App adapter={adapterA} />);
    const client = clientRef.current!;
    await act(async () => {
      await client.threads.getLoadThreadsPromise();
    });
    await waitFor(() =>
      expect(client.threads.getState().threadIds).toEqual(["thread-1"]),
    );

    act(() => {
      suspend = true;
      startTransition(() => view.rerender(<App adapter={adapterB} />));
    });
    await act(async () => {
      await client.threads.item({ id: "thread-1" }).rename("Renamed");
    });

    expect(adapterA.rename).toHaveBeenCalledWith("thread-1", "Renamed");
    expect(adapterB.rename).not.toHaveBeenCalled();
  });

  it("keeps the main thread facade scoped to the committed factory", async () => {
    const adapter = makeAdapter();
    const clientRef = createRef<AssistantClient>();
    const renderWorkspaceB = vi.fn();
    const refetchThread = vi.fn();
    const never = new Promise<never>(() => {});
    let suspend = false;

    const Blocker = () => {
      if (suspend) throw never;
      return null;
    };
    const App = ({ workspace }: { workspace: string }) => (
      <Suspense fallback={null}>
        <AuiProvider
          ref={clientRef as never}
          config={AuiConfig({
            threads: RemoteThreadList({
              adapter,
              thread: (id) =>
                withKey(
                  workspace,
                  IdentifiedThread({
                    id: `${workspace}:${id}`,
                    onRender: (renderedId) => {
                      if (renderedId.startsWith("workspace-b:")) {
                        renderWorkspaceB();
                      }
                    },
                    onRefetch: refetchThread,
                  }),
                ) as never,
            }),
          })}
        >
          <Blocker />
        </AuiProvider>
      </Suspense>
    );

    const view = render(<App workspace="workspace-a" />);
    const client = clientRef.current!;
    await act(async () => {
      await client.threads.getLoadThreadsPromise();
      await client.threads.switchToThread("thread-1");
    });
    await waitFor(() =>
      expect(client.thread.getState().messages[0]?.id).toBe(
        "workspace-a:thread-1",
      ),
    );

    act(() => {
      suspend = true;
      startTransition(() => view.rerender(<App workspace="workspace-b" />));
    });

    expect(renderWorkspaceB).toHaveBeenCalled();
    await act(async () => {
      await client.threads.reloadMainThread();
    });
    expect(refetchThread).toHaveBeenLastCalledWith("workspace-a:thread-1");

    suspend = false;
    view.rerender(<App workspace="workspace-b" />);
    await waitFor(() =>
      expect(client.thread.getState().messages[0]?.id).toBe(
        "workspace-b:thread-1",
      ),
    );
    await act(async () => {
      await client.threads.reloadMainThread();
    });
    expect(refetchThread).toHaveBeenLastCalledWith("workspace-b:thread-1");
  });
});
