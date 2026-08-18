// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useLocalRuntime } from "./useLocalRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { AppendMessage } from "../../types/message";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";

const userMessage = (text: string): AppendMessage => ({
  parentId: null,
  sourceId: null,
  runConfig: {},
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(),
  startRun: false,
});

const getThreadCore = (runtime: AssistantRuntime) =>
  (
    runtime.thread as unknown as {
      __internal_threadBinding: {
        getState(): { append(message: AppendMessage): Promise<void> };
      };
    }
  ).__internal_threadBinding.getState();

const testInitializationRetry = async (
  runtimeHook: () => AssistantRuntime,
  onNew?: ReturnType<typeof vi.fn>,
) => {
  const initializationError = new Error("initialization failed");
  let initializeCount = 0;
  const adapter = makeAdapter({
    initialize: vi.fn(async (threadId: string) => {
      initializeCount++;
      if (initializeCount === 1) throw initializationError;
      return {
        remoteId: `remote-${threadId}`,
        externalId: `external-${threadId}`,
      };
    }),
  });
  const runtimeRef: { current: AssistantRuntime | null } = { current: null };

  const App = () => {
    const runtime = useRemoteThreadListRuntime({ adapter, runtimeHook });
    runtimeRef.current = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };

  render(<App />);
  await waitFor(() => {
    expect(runtimeRef.current?.threads.mainItem.getState().id).toBeDefined();
  });

  const item = runtimeRef.current!.threads.mainItem;
  const localId = item.getState().id;
  const thread = getThreadCore(runtimeRef.current!);

  if (onNew) {
    // The external-store core dispatches without holding the append on the
    // initialization barrier; the failure surfaces at the dispatch seam.
    await expect(thread.append(userMessage("first"))).resolves.toBeUndefined();
    // Drain the rejection through RemoteThreadResource's catch so the retry
    // re-arms before the second append; the exact chain depth is not
    // load-bearing.
    for (let i = 0; i < 20; i++) await Promise.resolve();
  } else {
    await expect(thread.append(userMessage("first"))).rejects.toMatchObject({
      name: "MessageNotSentError",
      cause: initializationError,
    });
  }
  expect(item.getState().status).toBe("new");

  await expect(thread.append(userMessage("second"))).resolves.toBeUndefined();
  expect(adapter.initialize).toHaveBeenCalledTimes(2);
  expect(adapter.initialize).toHaveBeenLastCalledWith(localId);
  await waitFor(() => {
    expect(item.getState()).toMatchObject({
      id: localId,
      status: "regular",
      remoteId: `remote-${localId}`,
    });
  });
  if (onNew) expect(onNew).toHaveBeenCalledTimes(2);
};

describe("RemoteThreadListHookInstanceManager initialization retry", () => {
  it("retries a rejected initialization for local runtimes", async () => {
    await testInitializationRetry(() =>
      useLocalRuntime({
        run: async () => ({ content: [] }),
      }),
    );
  });

  it("retries a rejected initialization for external-store runtimes", async () => {
    const onNew = vi.fn(async () => {});
    await testInitializationRetry(
      () => useExternalStoreRuntime({ messages: [], onNew }),
      onNew,
    );
  });
});
