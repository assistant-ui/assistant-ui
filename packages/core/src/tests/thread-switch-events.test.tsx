// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui, useAuiEvent } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../react/AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../react/runtimes/useExternalStoreRuntime";
import { useLocalRuntime } from "../react/runtimes/useLocalRuntime";
import { useRemoteThreadListRuntime } from "../react/runtimes/useRemoteThreadListRuntime";
import { deferred, makeAdapter } from "./remote-thread-list-test-helpers";
import { RuntimeAdapter } from "../react/RuntimeAdapter";
import {
  AssistantRuntimeImpl,
  type AssistantRuntime,
} from "../runtime/api/assistant-runtime";
import { ExternalStoreRuntimeCore } from "../runtimes/external-store/external-store-runtime-core";
import type { ExternalStoreAdapter } from "../runtimes/external-store/external-store-adapter";

type DemoMessage = { id: string; role: "user" | "assistant"; text: string };

const EMPTY_MESSAGES: readonly never[] = [];

const useTestThreadRuntime = () =>
  useExternalStoreRuntime({
    messages: EMPTY_MESSAGES,
    isRunning: false,
    onNew: async () => {},
  });

const createRuntime = () => {
  const threads = [
    {
      id: "t1",
      title: "one",
      messages: [{ id: "m1", role: "user" as const, text: "a" }],
    },
    {
      id: "t2",
      title: "two",
      messages: [{ id: "m2", role: "user" as const, text: "b" }],
    },
  ];
  let currentId = "t1";
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages: threads.find((t) => t.id === currentId)!.messages,
    convertMessage: (m) => ({
      id: m.id,
      role: m.role,
      content: [{ type: "text", text: m.text }],
    }),
    onNew: async () => {},
    adapters: {
      threadList: {
        threadId: currentId,
        threads: threads.map((t) => ({
          status: "regular" as const,
          id: t.id,
          title: t.title,
        })),
        onSwitchToThread: (threadId: string) => {
          currentId = threadId;
          sync();
        },
        onSwitchToNewThread: () => {},
      },
    },
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const sync = () => core.setAdapter(makeAdapter());
  return runtime;
};

describe("thread switch events", () => {
  it("delivers switchedTo to default-scope, star-scope, and aui.on listeners", async () => {
    const runtime = createRuntime();
    const defaultScope = vi.fn();
    const starScope = vi.fn();
    const auiOn = vi.fn();
    const switchedAwayStar = vi.fn();
    let aui!: ReturnType<typeof useAui>;
    const Consumer = () => {
      useAuiEvent("threadListItem.switchedTo" as never, defaultScope as never);
      useAuiEvent(
        { scope: "*", event: "threadListItem.switchedTo" } as never,
        starScope as never,
      );
      useAuiEvent(
        { scope: "*", event: "threadListItem.switchedAway" } as never,
        switchedAwayStar as never,
      );
      return null;
    };
    const Harness = () => {
      aui = useAui({ threads: RuntimeAdapter(runtime) } as never);
      return (
        <AuiProvider value={aui}>
          <Consumer />
        </AuiProvider>
      );
    };
    render(<Harness />);
    await act(async () => {});

    aui.on("threadListItem.switchedTo" as never, auiOn as never);

    await act(async () => {
      aui.threads.item({ index: 1 }).switchTo();
    });
    await act(async () => {});

    expect(defaultScope).toHaveBeenCalledExactlyOnceWith({ threadId: "t2" });
    expect(starScope).toHaveBeenCalledExactlyOnceWith({ threadId: "t2" });
    expect(auiOn).toHaveBeenCalledExactlyOnceWith({ threadId: "t2" });
    expect(switchedAwayStar).toHaveBeenCalledExactlyOnceWith({
      threadId: "t1",
    });

    await act(async () => {
      aui.threads.item({ index: 0 }).switchTo();
    });
    await act(async () => {});

    expect(defaultScope).toHaveBeenCalledTimes(2);
    expect(defaultScope).toHaveBeenLastCalledWith({ threadId: "t1" });
    expect(switchedAwayStar).toHaveBeenCalledTimes(2);
    expect(switchedAwayStar).toHaveBeenLastCalledWith({ threadId: "t2" });
  });

  it("delivers threads.selectionChanged with the new and previous thread ids", async () => {
    const runtime = createRuntime();
    const selectionChanged = vi.fn();
    const auiOn = vi.fn();
    let aui!: ReturnType<typeof useAui>;
    const Consumer = () => {
      useAuiEvent(
        "threads.selectionChanged" as never,
        selectionChanged as never,
      );
      return null;
    };
    const Harness = () => {
      aui = useAui({ threads: RuntimeAdapter(runtime) } as never);
      return (
        <AuiProvider value={aui}>
          <Consumer />
        </AuiProvider>
      );
    };
    render(<Harness />);
    await act(async () => {});

    aui.on("threads.selectionChanged" as never, auiOn as never);

    await act(async () => {
      aui.threads.item({ index: 1 }).switchTo();
    });
    await act(async () => {});

    expect(selectionChanged).toHaveBeenCalledExactlyOnceWith({
      threadId: "t2",
      previousThreadId: "t1",
    });
    expect(auiOn).toHaveBeenCalledExactlyOnceWith({
      threadId: "t2",
      previousThreadId: "t1",
    });

    await act(async () => {
      aui.threads.item({ index: 0 }).switchTo();
    });
    await act(async () => {});

    expect(selectionChanged).toHaveBeenCalledTimes(2);
    expect(selectionChanged).toHaveBeenLastCalledWith({
      threadId: "t1",
      previousThreadId: "t2",
    });
  });

  it("does not emit for the initially selected thread on mount", async () => {
    const runtime = createRuntime();
    const anySwitch = vi.fn();
    const Consumer = () => {
      useAuiEvent(
        { scope: "*", event: "threadListItem.switchedTo" } as never,
        anySwitch as never,
      );
      useAuiEvent(
        { scope: "*", event: "threads.selectionChanged" } as never,
        anySwitch as never,
      );
      return null;
    };
    const Harness = () => {
      const aui = useAui({ threads: RuntimeAdapter(runtime) } as never);
      return (
        <AuiProvider value={aui}>
          <Consumer />
        </AuiProvider>
      );
    };
    render(<Harness />);
    await act(async () => {});

    expect(anySwitch).not.toHaveBeenCalled();
  });

  it("emits when a deep-linked initial thread resolves after mount", async () => {
    const adapter = makeAdapter();
    const selectionChanged = vi.fn();
    const Listener = () => {
      useAuiEvent("threads.selectionChanged", selectionChanged);
      return null;
    };
    const Harness = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        initialThreadId: "thread-a",
        runtimeHook: useTestThreadRuntime,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Listener />
        </AssistantRuntimeProvider>
      );
    };
    render(<Harness />);

    await waitFor(() => expect(selectionChanged).toHaveBeenCalledTimes(1));
    const payload = selectionChanged.mock.calls[0]![0] as {
      threadId: string;
      previousThreadId: string;
    };
    expect(payload.threadId).toBe("thread-a");
    expect(payload.previousThreadId).toMatch(/^__LOCALID_/);
  });
});

const createExternalStoreRuntime = (
  runningByThreadId: Map<string, boolean>,
) => {
  const threads = [
    { id: "t1", title: "one" },
    { id: "t2", title: "two" },
  ];
  let currentId = "t1";
  const makeStoreAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages: EMPTY_MESSAGES,
    isRunning: runningByThreadId.get(currentId) ?? false,
    convertMessage: (m) => ({
      id: m.id,
      role: m.role,
      content: [{ type: "text", text: m.text }],
    }),
    onNew: async () => {},
    adapters: {
      threadList: {
        threadId: currentId,
        threads: threads.map((t) => ({
          status: "regular" as const,
          id: t.id,
          title: t.title,
        })),
        onSwitchToThread: (threadId: string) => {
          currentId = threadId;
          sync();
        },
        onSwitchToNewThread: () => {},
      },
    },
  });
  const core = new ExternalStoreRuntimeCore(makeStoreAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const sync = () => core.setAdapter(makeStoreAdapter());
  return { runtime, sync };
};

const listAdapter = () =>
  makeAdapter({
    list: vi.fn(async () => ({
      threads: [
        { status: "regular" as const, remoteId: "thread-a", title: "A" },
        { status: "regular" as const, remoteId: "thread-b", title: "B" },
      ],
    })),
  });

const renderRemoteList = (
  adapter: ReturnType<typeof makeAdapter>,
  run: () => Promise<{ content: [] }>,
) => {
  const globalRunStart = vi.fn();
  const globalRunEnd = vi.fn();
  const globalInitialize = vi.fn();
  const globalModelContextUpdate = vi.fn();
  const selectedRunStart = vi.fn();
  const selectedRunEnd = vi.fn();
  const selectedInitialize = vi.fn();
  const selectedModelContextUpdate = vi.fn();
  let runtime!: AssistantRuntime;

  const Listener = () => {
    useAuiEvent({ scope: "*", event: "thread.runStart" }, globalRunStart);
    useAuiEvent({ scope: "*", event: "thread.runEnd" }, globalRunEnd);
    useAuiEvent({ scope: "*", event: "thread.initialize" }, globalInitialize);
    useAuiEvent(
      { scope: "*", event: "thread.modelContextUpdate" },
      globalModelContextUpdate,
    );
    useAuiEvent("thread.runStart", selectedRunStart);
    useAuiEvent("thread.runEnd", selectedRunEnd);
    useAuiEvent("thread.initialize", selectedInitialize);
    useAuiEvent("thread.modelContextUpdate", selectedModelContextUpdate);
    return null;
  };
  const Harness = () => {
    runtime = useRemoteThreadListRuntime({
      adapter,
      initialThreadId: "thread-a",
      runtimeHook: function RuntimeHook() {
        return useLocalRuntime({ run });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Listener />
      </AssistantRuntimeProvider>
    );
  };
  render(<Harness />);

  return {
    getRuntime: () => runtime,
    globalRunStart,
    globalRunEnd,
    globalInitialize,
    globalModelContextUpdate,
    selectedRunStart,
    selectedRunEnd,
    selectedInitialize,
    selectedModelContextUpdate,
  };
};

const switchTo = async (runtime: AssistantRuntime, remoteId: string) => {
  await act(async () => {
    await runtime.threads.switchToThread(remoteId);
  });
  await waitFor(() => {
    expect(runtime.threads.mainItem.getState().remoteId).toBe(remoteId);
  });
};

describe("background thread run events", () => {
  it("delivers runEnd globally after the running thread is switched away", async () => {
    const runA = deferred<{ content: [] }>();
    const harness = renderRemoteList(listAdapter(), () => runA.promise);
    const runtime = harness.getRuntime();

    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
    });
    const threadAId = runtime.threads.mainItem.getState().id;

    await act(async () => {
      runtime.thread.startRun({ parentId: null });
    });
    await waitFor(() => expect(runtime.thread.getState().isRunning).toBe(true));
    await waitFor(() => {
      expect(harness.globalRunStart).toHaveBeenCalledExactlyOnceWith({
        threadId: threadAId,
      });
      expect(harness.selectedRunStart).toHaveBeenCalledExactlyOnceWith({
        threadId: threadAId,
      });
    });

    await switchTo(runtime, "thread-b");
    await act(async () => {
      runA.resolve({ content: [] });
    });

    await waitFor(() => {
      expect(harness.globalRunEnd).toHaveBeenCalledExactlyOnceWith({
        threadId: threadAId,
      });
    });
    expect(harness.selectedRunEnd).not.toHaveBeenCalled();
  });

  it("does not duplicate run events while the running thread is switched back and forth", async () => {
    const runA = deferred<{ content: [] }>();
    const harness = renderRemoteList(listAdapter(), () => runA.promise);
    const runtime = harness.getRuntime();

    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
    });
    const threadAId = runtime.threads.mainItem.getState().id;

    await act(async () => {
      runtime.thread.startRun({ parentId: null });
    });
    await waitFor(() => expect(runtime.thread.getState().isRunning).toBe(true));

    await switchTo(runtime, "thread-b");
    await switchTo(runtime, "thread-a");
    await switchTo(runtime, "thread-b");
    await switchTo(runtime, "thread-a");
    await switchTo(runtime, "thread-b");

    await act(async () => {
      runA.resolve({ content: [] });
    });

    await waitFor(() => {
      expect(harness.globalRunEnd).toHaveBeenCalledExactlyOnceWith({
        threadId: threadAId,
      });
    });
    expect(harness.globalRunStart).toHaveBeenCalledExactlyOnceWith({
      threadId: threadAId,
    });
    expect(harness.selectedRunStart).toHaveBeenCalledExactlyOnceWith({
      threadId: threadAId,
    });
    expect(harness.selectedRunEnd).not.toHaveBeenCalled();
  });

  it("leaves the run to the selected client when its thread is re-selected", async () => {
    const runA = deferred<{ content: [] }>();
    const harness = renderRemoteList(listAdapter(), () => runA.promise);
    const runtime = harness.getRuntime();

    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
    });
    const threadAId = runtime.threads.mainItem.getState().id;

    await act(async () => {
      runtime.thread.startRun({ parentId: null });
    });
    await waitFor(() => expect(runtime.thread.getState().isRunning).toBe(true));

    await switchTo(runtime, "thread-b");
    await switchTo(runtime, "thread-a");

    await act(async () => {
      runA.resolve({ content: [] });
    });

    await waitFor(() => {
      expect(harness.selectedRunEnd).toHaveBeenCalledExactlyOnceWith({
        threadId: threadAId,
      });
    });
    expect(harness.globalRunEnd).toHaveBeenCalledExactlyOnceWith({
      threadId: threadAId,
    });
    expect(harness.globalRunStart).toHaveBeenCalledExactlyOnceWith({
      threadId: threadAId,
    });
    expect(harness.selectedRunStart).toHaveBeenCalledExactlyOnceWith({
      threadId: threadAId,
    });
  });

  it("reports the start and end of a run that is never selected", async () => {
    const backgroundRun = deferred<{ content: [] }>();
    const harness = renderRemoteList(
      listAdapter(),
      () => backgroundRun.promise,
    );
    const runtime = harness.getRuntime();

    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
    });
    await switchTo(runtime, "thread-b");
    const threadBId = runtime.threads.mainItem.getState().id;
    const threadB = runtime.threads.getById(threadBId);
    await switchTo(runtime, "thread-a");

    await act(async () => {
      threadB.startRun({ parentId: null });
    });
    await waitFor(() => {
      expect(harness.globalRunStart).toHaveBeenCalledExactlyOnceWith({
        threadId: threadBId,
      });
    });

    await act(async () => {
      backgroundRun.resolve({ content: [] });
    });
    await waitFor(() => {
      expect(harness.globalRunEnd).toHaveBeenCalledExactlyOnceWith({
        threadId: threadBId,
      });
    });
    expect(harness.selectedRunStart).not.toHaveBeenCalled();
    expect(harness.selectedRunEnd).not.toHaveBeenCalled();
  });

  it("reports lifecycle events from a thread that is never selected", async () => {
    const backgroundRun = deferred<{ content: [] }>();
    const harness = renderRemoteList(
      listAdapter(),
      () => backgroundRun.promise,
    );
    const runtime = harness.getRuntime();

    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
    });
    await switchTo(runtime, "thread-b");
    const threadBId = runtime.threads.mainItem.getState().id;
    const threadB = runtime.threads.getById(threadBId);
    await switchTo(runtime, "thread-a");

    let updateModelContext!: () => void;
    const unregisterModelContext = runtime.registerModelContextProvider({
      getModelContext: () => ({}),
      subscribe: (callback) => {
        updateModelContext = callback;
        return () => {};
      },
    });
    vi.clearAllMocks();

    await act(async () => {
      threadB.startRun({ parentId: null });
    });
    await waitFor(() => {
      expect(harness.globalInitialize).toHaveBeenCalledExactlyOnceWith({
        threadId: threadBId,
      });
    });

    await act(async () => {
      updateModelContext();
    });
    await waitFor(() => {
      expect(harness.globalModelContextUpdate).toHaveBeenCalledWith({
        threadId: threadBId,
      });
    });

    expect(harness.selectedInitialize).not.toHaveBeenCalled();
    unregisterModelContext();

    await act(async () => {
      backgroundRun.resolve({ content: [] });
    });
  });

  it.each([
    { operation: "delete", state: "deleted" },
    { operation: "detach", state: "detached" },
  ] as const)(
    "stops reporting a background run once its thread is $state",
    async ({ operation }) => {
      const runA = deferred<{ content: [] }>();
      const runSettled = vi.fn();
      const harness = renderRemoteList(listAdapter(), async () => {
        const result = await runA.promise;
        runSettled();
        return result;
      });
      const runtime = harness.getRuntime();

      await waitFor(() => {
        expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
      });
      const threadAId = runtime.threads.mainItem.getState().id;

      await act(async () => {
        runtime.thread.startRun({ parentId: null });
      });
      await waitFor(() =>
        expect(runtime.thread.getState().isRunning).toBe(true),
      );
      await switchTo(runtime, "thread-b");

      await act(async () => {
        const item = runtime.threads.getItemById(threadAId);
        if (operation === "delete") await item.delete();
        else item.detach();
      });
      await act(async () => {
        runA.resolve({ content: [] });
      });

      await waitFor(() => expect(runSettled).toHaveBeenCalledExactlyOnceWith());
      expect(harness.globalRunEnd).not.toHaveBeenCalled();
    },
  );

  it("emits nothing for a thread list that keeps only the main runtime", async () => {
    const runningByThreadId = new Map<string, boolean>();
    const { runtime, sync } = createExternalStoreRuntime(runningByThreadId);
    const globalRunEnd = vi.fn();
    const Listener = () => {
      useAuiEvent({ scope: "*", event: "thread.runEnd" }, globalRunEnd);
      return null;
    };
    const Harness = () => {
      const aui = useAui({ threads: RuntimeAdapter(runtime) } as never);
      return (
        <AuiProvider value={aui}>
          <Listener />
        </AuiProvider>
      );
    };
    render(<Harness />);
    await act(async () => {});

    runningByThreadId.set("t1", true);
    await act(async () => sync());
    await waitFor(() => expect(runtime.thread.getState().isRunning).toBe(true));

    await act(async () => {
      await runtime.threads.switchToThread("t2");
    });
    expect(runtime.threads.getState().mainThreadId).toBe("t2");
    expect(globalRunEnd).not.toHaveBeenCalled();
  });
});
