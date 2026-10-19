// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { useState, type Dispatch, type SetStateAction } from "react";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import { expect, it, vi } from "vitest";
import { makeAdapter } from "../../../tests/remote-thread-list-test-helpers";
import type { ThreadMessage } from "../../../types/message";
import { RemoteThreadList } from "../../client/RemoteThreadList";
import { useExternalStoreRuntime } from "../useExternalStoreRuntime";
import { ClientThreadListRuntimeCore } from "./ClientThreadListRuntimeCore";

const threadState = { isRunning: false, messages: [] };
const composer = { getState: () => ({}) };
const suggestions = { getState: () => ({ suggestions: [] }) };
const StubThread = resource(() => ({
  getState: () => threadState,
  composer: () => composer,
  suggestions: () => suggestions,
}));

it("reports and publishes a hosted thread's run after switching away", async () => {
  const setRunning = new Map<string, Dispatch<SetStateAction<boolean>>>();
  const adapter = makeAdapter({
    list: vi.fn(async () => ({
      threads: [{ status: "regular" as const, remoteId: "other" }],
    })),
    initialize: vi.fn(async (id) => ({ remoteId: `remote-${id}` })),
  });
  let facade!: ClientThreadListRuntimeCore;
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadList({
        adapter,
        __internal_initialThreadIdSeed: "test",
        __internal_ensureThread: (item) => facade.__internal_ensureThread(item),
        thread: () => StubThread() as never,
      }),
    }),
  );
  facade = new ClientThreadListRuntimeCore(
    "test",
    handle,
    function useThreadRuntime() {
      const id = useAui().threadListItem.getState().id;
      const [isRunning, updateRunning] = useState(false);
      setRunning.set(id, updateRunning);
      return useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        isRunning,
        onNew: async () => {},
      });
    },
  );
  handle.subscribe(() => {});
  const view = render(
    <AuiProvider value={handle.getClient()}>
      <facade.__internal_RenderComponent />
    </AuiProvider>,
  );
  const localId = facade.mainThreadId;
  await handle.getClient().threads.getLoadThreadsPromise();
  await waitFor(() => expect(setRunning.has(localId)).toBe(true));
  await facade.initialize(localId);
  await waitFor(() =>
    expect(facade.getItemById(localId)?.remoteId).toBeDefined(),
  );
  const remoteId = facade.getItemById(localId)!.remoteId!;
  expect(remoteId).not.toBe(localId);

  const notified = vi.fn();
  const unsubscribe = facade.subscribe(notified);
  notified.mockClear();
  act(() => setRunning.get(localId)!(true));
  await waitFor(() =>
    expect(facade.hookManager.__internal_isThreadRunning(localId)).toBe(true),
  );
  await waitFor(() =>
    expect(facade.unstable_isThreadRunning(localId)).toBe(true),
  );
  expect(notified).toHaveBeenCalled();

  flushTapSync(() => void facade.switchToThread("other"));
  await waitFor(() => expect(facade.mainThreadId).toBe("other"));
  await waitFor(() => expect(setRunning.has("other")).toBe(true));
  expect(
    handle
      .getClient()
      .threads.getState()
      .threadItems.find((item) => item.id === localId)?.isRunning,
  ).toBe(false);
  expect(facade.unstable_isThreadRunning(localId)).toBe(true);
  expect(facade.unstable_isThreadRunning(remoteId)).toBe(true);
  expect(facade.unstable_isThreadRunning("unknown")).toBe(false);

  notified.mockClear();
  act(() => setRunning.get(localId)!(false));
  await waitFor(() =>
    expect(facade.unstable_isThreadRunning(localId)).toBe(false),
  );
  expect(facade.unstable_isThreadRunning(remoteId)).toBe(false);
  expect(notified).toHaveBeenCalled();

  notified.mockClear();
  act(() => setRunning.get(localId)!(true));
  await waitFor(() =>
    expect(facade.unstable_isThreadRunning(localId)).toBe(true),
  );
  expect(notified).toHaveBeenCalled();

  unsubscribe();
  view.unmount();
  facade.__internal_dispose();
  handle.destroy();
});
