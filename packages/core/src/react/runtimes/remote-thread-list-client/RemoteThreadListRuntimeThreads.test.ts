// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import { useAui } from "@assistant-ui/store";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import type { ThreadRuntimeImpl } from "../../../runtime/api/thread-runtime";
import { captureThreadRuntimeDisposal } from "../../../runtime/utils/thread-runtime-lifecycle";
import { CompositeContextProvider } from "../../../utils/composite-context-provider";
import { InMemoryThreadListAdapter } from "../../../runtimes/remote-thread-list/adapter/in-memory";
import type { RemoteThreadListOptions } from "../../../runtimes/remote-thread-list/types";
import { WritableSubscribable } from "../../../subscribable/subscribable";
import type { AppendMessage } from "../../../types/message";
import { useLocalRuntime } from "../useLocalRuntime";
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

const mount = () => {
  const adapter = new InMemoryThreadListAdapter();
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
  });
  const generationStore = new WritableSubscribable(0);
  const modelContext = new CompositeContextProvider();
  const registerModelContextProvider = vi.fn((provider) =>
    modelContext.registerModelContextProvider(provider),
  );
  const assistantRuntime = {
    registerModelContextProvider,
  } as unknown as AssistantRuntime;
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadListRuntimeThreads({
        optionsStore,
        generationStore,
        assistantRuntime,
        modelContext,
        initialThreadIdSeed: "bridge",
      }),
    }),
  );
  handle.subscribe(() => {});
  return {
    adapter,
    list,
    initialize,
    captures,
    model,
    optionsStore,
    handle,
    registerModelContextProvider,
  };
};

afterEach(() => vi.restoreAllMocks());

describe("RemoteThreadListRuntimeThreads", () => {
  it("hosts the main thread runtime from runtimeHook", async () => {
    const setup = mount();
    const threads = setup.handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const id = threads.getState().mainThreadId;
    await vi.waitFor(() => expect(setup.captures.get(id)).toBeDefined());
    expect(threads.thread("main").__internal_getRuntime?.()).toBe(
      setup.captures.get(id)!.runtime.thread,
    );
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
