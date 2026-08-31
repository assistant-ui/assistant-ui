// @vitest-environment jsdom

import { createRef, startTransition, Suspense } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { resource } from "@assistant-ui/tap";
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
});
