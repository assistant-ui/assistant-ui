// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import {
  AuiConfig,
  createAssistantClient,
  type AssistantClientHandle,
} from "@assistant-ui/store/client";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import type { ThreadRuntimeImpl } from "../../../runtime/api/thread-runtime";
import { captureThreadRuntimeDisposal } from "../../../runtime/utils/thread-runtime-lifecycle";
import { CompositeContextProvider } from "../../../utils/composite-context-provider";
import { InMemoryThreadListAdapter } from "../../../runtimes/remote-thread-list/adapter/in-memory";
import { EMPTY_THREAD_CORE } from "../../../runtimes/remote-thread-list/empty-thread-core";
import { LOCAL_THREAD_ID_PREFIX } from "../../../runtimes/remote-thread-list/remote-thread-state";
import type { RemoteThreadListOptions } from "../../../runtimes/remote-thread-list/types";
import { WritableSubscribable } from "../../../subscribable/subscribable";
import type { AppendMessage } from "../../../types/message";
import { useLocalRuntime } from "../useLocalRuntime";
import { ClientThreadListRuntimeCore } from "./ClientThreadListRuntimeCore";
import { RemoteThreadListRuntimeThreads } from "./RemoteThreadListRuntimeThreads";

const message = (text: string): AppendMessage => ({
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

const mount = ({
  adapter = new InMemoryThreadListAdapter(),
  initialThreadId,
}: {
  adapter?: InMemoryThreadListAdapter;
  initialThreadId?: string;
} = {}) => {
  const list = vi.spyOn(adapter, "list");
  const initialize = vi.spyOn(adapter, "initialize");
  const captures = new Map<
    string,
    { runtime: AssistantRuntime; signal: AbortSignal | undefined }
  >();
  const model = { run: vi.fn(async () => ({ content: [] })) };
  const runtimeHook = function useTestRuntimeHook() {
    const aui = useAui();
    const signal = useAssistantClientDestroySignal();
    const runtime = useLocalRuntime(model);
    captures.set(aui.threadListItem.getState().id, { runtime, signal });
    return runtime;
  };
  const optionsStore = new WritableSubscribable<RemoteThreadListOptions>({
    adapter,
    runtimeHook,
    initialThreadId,
  });
  const generationStore = new WritableSubscribable(0);
  const modelContext = new CompositeContextProvider();
  const registerModelContextProvider = vi.fn((provider) =>
    modelContext.registerModelContextProvider(provider),
  );
  const assistantRuntime = {
    registerModelContextProvider,
  } as unknown as AssistantRuntime;
  let handle!: AssistantClientHandle;
  const clientCore = new ClientThreadListRuntimeCore(
    "bridge",
    {
      getClient: () => handle.getClient(),
      subscribe: (listener) => handle.subscribe(listener),
      destroy: () => handle.destroy(),
    },
    runtimeHook,
    false,
  );
  handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadListRuntimeThreads({
        optionsStore,
        generationStore,
        assistantRuntime,
        initialThreadIdSeed: "bridge",
        clientCore,
      }),
    }),
  );
  handle.subscribe(() => {});
  render(
    <AuiProvider value={handle.getClient()}>
      <clientCore.__internal_RenderComponent />
    </AuiProvider>,
  );
  return {
    adapter,
    list,
    initialize,
    captures,
    model,
    optionsStore,
    handle,
    clientCore,
    registerModelContextProvider,
  };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RemoteThreadListRuntimeThreads", () => {
  it("hosts the main thread runtime from runtimeHook", async () => {
    const setup = mount();
    const threads = setup.handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const id = threads.getState().mainThreadId;
    await vi.waitFor(() => expect(setup.captures.get(id)).toBeDefined());
    const hosted = threads
      .thread("main")
      .__internal_getRuntime?.() as ThreadRuntimeImpl;
    const core = (
      setup.captures.get(id)!.runtime.thread as ThreadRuntimeImpl
    ).__internal_threadBinding.getState();
    expect(hosted.__internal_threadBinding.getState()).toBe(core);
    expect(setup.clientCore.hookManager.getThreadRuntimeCore(id)).toBe(core);
    expect(setup.registerModelContextProvider).toHaveBeenCalledWith(
      setup.handle.getClient().modelContext(),
    );
    setup.handle.destroy();
  });

  it("initializes a new thread through the adapter when its composer sends", async () => {
    const setup = mount();
    const threads = setup.handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const firstId = threads.getState().mainThreadId;
    setup.handle.getClient().composer.setText("first");
    setup.handle.getClient().composer.send();
    await vi.waitFor(() =>
      expect(setup.initialize).toHaveBeenCalledWith(firstId),
    );
    await vi.waitFor(() =>
      expect(
        setup.handle.getClient().threads.getState().newThreadId,
      ).toBeNull(),
    );
    await threads.__internal_getRawActions!().switchToNewThread();
    await vi.waitFor(() =>
      expect(setup.handle.getClient().threads.getState().mainThreadId).not.toBe(
        firstId,
      ),
    );
    const nextId = setup.handle.getClient().threads.getState().mainThreadId;
    expect(nextId).not.toBe(firstId);
    await vi.waitFor(() => expect(setup.captures.get(nextId)).toBeDefined());
    setup.handle.getClient().composer.setText("next");
    setup.handle.getClient().composer.send();
    await vi.waitFor(() =>
      expect(setup.initialize).toHaveBeenCalledWith(nextId),
    );
    await vi.waitFor(() => expect(setup.model.run).toHaveBeenCalledTimes(2));
    setup.handle.destroy();
  });

  it("defers the seeded draft runtime until the initial thread switch settles", async () => {
    const adapter = new InMemoryThreadListAdapter();
    adapter.register("requested");
    let releaseList!: () => void;
    const listGate = new Promise<void>((resolve) => {
      releaseList = resolve;
    });
    const originalList = adapter.list.bind(adapter);
    const list = vi.spyOn(adapter, "list");
    list.mockImplementation(async () => {
      await listGate;
      return originalList();
    });
    const setup = mount({ adapter, initialThreadId: "requested" });
    const seededId = `${LOCAL_THREAD_ID_PREFIX}bridge`;
    const threads = setup.handle.getClient().threads;
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    expect(threads.getState().mainThreadId).toBe(seededId);
    expect(
      setup.clientCore.hookManager.__internal_hasThreadRuntime(seededId),
    ).toBe(false);
    releaseList();
    await vi.waitFor(() =>
      expect(threads.getState().mainThreadId).toBe("requested"),
    );
    await vi.waitFor(() =>
      expect(
        setup.clientCore.hookManager.getThreadRuntimeCore("requested"),
      ).toBeDefined(),
    );
    setup.handle.destroy();
  });

  it("attaches a selected client's thread state to the manager runtime", async () => {
    const setup = mount();
    const threads = setup.handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    await threads.__internal_getRawActions!().switchToNewThread();
    const id = threads.getState().mainThreadId;
    await vi.waitFor(() => expect(setup.captures.get(id)).toBeDefined());
    const core = (
      setup.captures.get(id)!.runtime.thread as ThreadRuntimeImpl
    ).__internal_threadBinding.getState();
    const hosted = threads
      .thread("main")
      .__internal_getRuntime?.() as ThreadRuntimeImpl;
    expect(setup.clientCore.hookManager.__internal_hasThreadRuntime(id)).toBe(
      true,
    );
    expect(setup.clientCore.hookManager.getThreadRuntimeCore(id)).toBe(core);
    expect(hosted.__internal_threadBinding.getState()).toBe(core);
    expect(hosted.__internal_threadBinding.getState()).not.toBe(
      EMPTY_THREAD_CORE,
    );
    setup.handle.destroy();
  });

  it("stops manager runtimes of thread bodies when the client is destroyed", async () => {
    const setup = mount();
    const threads = setup.handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const firstId = threads.getState().mainThreadId;
    await vi.waitFor(() => expect(setup.captures.get(firstId)).toBeDefined());
    await threads.__internal_getRawActions!().switchToNewThread();
    const secondId = threads.getState().mainThreadId;
    await vi.waitFor(() => expect(setup.captures.get(secondId)).toBeDefined());
    const captures = [firstId, secondId].map((id) => {
      const captured = setup.captures.get(id)!;
      const core = (
        captured.runtime.thread as ThreadRuntimeImpl
      ).__internal_threadBinding.getState();
      const disposed = captureThreadRuntimeDisposal(core);
      expect(setup.clientCore.hookManager.__internal_hasThreadRuntime(id)).toBe(
        true,
      );
      expect(disposed.aborted).toBe(false);
      return { id, captured, disposed };
    });
    setup.handle.destroy();
    for (const { id, captured, disposed } of captures) {
      expect(setup.clientCore.hookManager.__internal_hasThreadRuntime(id)).toBe(
        false,
      );
      expect(captured.signal?.aborted).toBe(true);
      expect(disposed.aborted).toBe(true);
    }
  });

  it("keeps an earlier hosted thread mounted when switching back", async () => {
    const setup = mount();
    const threads = setup.handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const firstId = threads.getState().mainThreadId;
    const first = setup.captures.get(firstId)!;
    await first.runtime.thread.append(message("first"));
    await threads.__internal_getRawActions!().switchToNewThread();
    await vi.waitFor(() =>
      expect(setup.handle.getClient().threads.getState().mainThreadId).not.toBe(
        firstId,
      ),
    );
    expect(first.signal?.aborted).toBe(false);
    await setup.handle.getClient().threads
      .__internal_getRawActions!().switchToThread(firstId);
    await vi.waitFor(() =>
      expect(setup.handle.getClient().threads.getState().mainThreadId).toBe(
        firstId,
      ),
    );
    expect(setup.captures.get(firstId)!.runtime).toBe(first.runtime);
    expect(first.signal?.aborted).toBe(false);
    setup.handle.destroy();
  });

  it("reloads the list once when the adapter identity changes", async () => {
    const setup = mount();
    await setup.handle.getClient().threads.getLoadThreadsPromise();
    expect(setup.list).toHaveBeenCalledTimes(1);
    const replacement = new InMemoryThreadListAdapter();
    const replacementList = vi.spyOn(replacement, "list");
    setup.optionsStore.setState({
      ...setup.optionsStore.getState(),
      adapter: replacement,
    });
    await vi.waitFor(() => expect(replacementList).toHaveBeenCalledTimes(1));
    await setup.handle.getClient().threads.getLoadThreadsPromise();
    expect(replacementList).toHaveBeenCalledTimes(1);
    setup.handle.destroy();
  });

  it("aborts and disposes a hosted body when its thread is deleted", async () => {
    const setup = mount();
    const threads = setup.handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const id = threads.getState().mainThreadId;
    const captured = setup.captures.get(id)!;
    await captured.runtime.thread.append(message("first"));
    await threads.__internal_getRawActions!().switchToNewThread();
    const core = (
      captured.runtime.thread as ThreadRuntimeImpl
    ).__internal_threadBinding.getState();
    const disposed = captureThreadRuntimeDisposal(core);
    expect(disposed.aborted).toBe(false);
    await setup.handle.getClient().threads.__internal_getRawActions!().delete(
      id,
    );
    expect(captured.signal?.aborted).toBe(true);
    expect(disposed.aborted).toBe(true);
    setup.handle.destroy();
  });
});
