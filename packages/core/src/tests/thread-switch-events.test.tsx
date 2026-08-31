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
import { AssistantRuntimeImpl } from "../runtime/api/assistant-runtime";
import type { AssistantRuntime } from "../runtime/api/assistant-runtime";
import { ThreadRuntimeImpl } from "../runtime/api/thread-runtime";
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

const createRuntime = (runningByThreadId = new Map<string, boolean>()) => {
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
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const sync = () => core.setAdapter(makeAdapter());
  return { runtime, sync };
};

describe("thread switch events", () => {
  it("delivers switchedTo to default-scope, star-scope, and aui.on listeners", async () => {
    const { runtime } = createRuntime();
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
    const { runtime } = createRuntime();
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
    const { runtime } = createRuntime();
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

  it("does not hand off an external-store runtime discarded during a switch", async () => {
    const runningByThreadId = new Map<string, boolean>();
    const { runtime, sync } = createRuntime(runningByThreadId);
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
    const discardedCore = (
      runtime.thread as ThreadRuntimeImpl
    ).__internal_threadBinding.getState() as {
      __internal_setAdapter(adapter: ExternalStoreAdapter<DemoMessage>): void;
    };

    await act(async () => {
      await runtime.threads.switchToThread("t2");
    });
    await act(async () => {
      discardedCore.__internal_setAdapter({
        messages: [],
        isRunning: false,
        onNew: async () => {},
      });
    });
    expect(runtime.threads.getState().mainThreadId).toBe("t2");
    expect(globalRunEnd).not.toHaveBeenCalled();
  });

  it("delivers runEnd globally after switching away without duplicating selected-thread events", async () => {
    const runA = deferred<{ content: [] }>();
    const runB = deferred<{ content: [] }>();
    const run = vi
      .fn()
      .mockImplementationOnce(() => runA.promise)
      .mockImplementationOnce(() => runB.promise);
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "thread-a", title: "A" },
          { status: "regular" as const, remoteId: "thread-b", title: "B" },
        ],
      })),
    });
    const globalRunStart = vi.fn();
    const globalRunEnd = vi.fn();
    const selectedRunStart = vi.fn();
    const selectedRunEnd = vi.fn();
    let runtime!: AssistantRuntime;

    const Listener = () => {
      useAuiEvent({ scope: "*", event: "thread.runStart" }, globalRunStart);
      useAuiEvent({ scope: "*", event: "thread.runEnd" }, globalRunEnd);
      useAuiEvent("thread.runStart", selectedRunStart);
      useAuiEvent("thread.runEnd", selectedRunEnd);
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

    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
    });
    const threadAId = runtime.threads.mainItem.getState().id;

    await act(async () => {
      runtime.thread.startRun({ parentId: null });
    });
    await waitFor(() => expect(runtime.thread.getState().isRunning).toBe(true));
    await waitFor(() => {
      expect(globalRunStart).toHaveBeenCalledExactlyOnceWith({
        threadId: threadAId,
      });
      expect(selectedRunStart).toHaveBeenCalledExactlyOnceWith({
        threadId: threadAId,
      });
    });

    await act(async () => {
      await runtime.threads.switchToThread("thread-b");
    });
    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-b");
    });
    const threadBId = runtime.threads.mainItem.getState().id;

    await act(async () => {
      await runtime.threads.switchToThread("thread-a");
    });
    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
    });
    await act(async () => {
      await runtime.threads.switchToThread("thread-b");
    });
    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-b");
    });
    await act(async () => {
      await runtime.threads.switchToThread("thread-a");
    });
    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
    });
    expect(globalRunStart).toHaveBeenCalledExactlyOnceWith({
      threadId: threadAId,
    });
    await act(async () => {
      await runtime.threads.switchToThread("thread-b");
    });
    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-b");
    });

    await act(async () => {
      runA.resolve({ content: [] });
    });
    await waitFor(() => {
      expect(globalRunEnd).toHaveBeenCalledExactlyOnceWith({
        threadId: threadAId,
      });
    });
    expect(selectedRunEnd).not.toHaveBeenCalled();

    await act(async () => {
      runtime.thread.startRun({ parentId: null });
    });
    await waitFor(() => expect(runtime.thread.getState().isRunning).toBe(true));
    await act(async () => {
      await runtime.threads.switchToThread("thread-a");
    });
    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
    });
    await act(async () => {
      await runtime.threads.switchToThread("thread-b");
    });
    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-b");
    });
    await act(async () => {
      runB.resolve({ content: [] });
    });
    await waitFor(() => {
      expect(globalRunEnd).toHaveBeenCalledTimes(2);
      expect(globalRunEnd).toHaveBeenLastCalledWith({ threadId: threadBId });
      expect(selectedRunEnd).toHaveBeenCalledExactlyOnceWith({
        threadId: threadBId,
      });
    });
    expect(globalRunStart).toHaveBeenCalledTimes(2);
    expect(globalRunStart).toHaveBeenLastCalledWith({ threadId: threadBId });
    expect(selectedRunStart).toHaveBeenCalledTimes(2);
    expect(selectedRunStart).toHaveBeenLastCalledWith({ threadId: threadBId });
  });

  it("hands off a retained thread that was already running when selected", async () => {
    const backgroundRun = deferred<{ content: [] }>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "thread-a", title: "A" },
          { status: "regular" as const, remoteId: "thread-b", title: "B" },
        ],
      })),
    });
    const globalRunStart = vi.fn();
    const globalRunEnd = vi.fn();
    const selectedRunStart = vi.fn();
    const selectedRunEnd = vi.fn();
    let runtime!: AssistantRuntime;

    const Listener = () => {
      useAuiEvent({ scope: "*", event: "thread.runStart" }, globalRunStart);
      useAuiEvent({ scope: "*", event: "thread.runEnd" }, globalRunEnd);
      useAuiEvent("thread.runStart", selectedRunStart);
      useAuiEvent("thread.runEnd", selectedRunEnd);
      return null;
    };
    const Harness = () => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        initialThreadId: "thread-a",
        runtimeHook: function RuntimeHook() {
          return useLocalRuntime({ run: () => backgroundRun.promise });
        },
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Listener />
        </AssistantRuntimeProvider>
      );
    };
    render(<Harness />);

    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().remoteId).toBe("thread-a");
    });
    await act(async () => {
      await runtime.threads.switchToThread("thread-b");
    });
    const threadBId = runtime.threads.mainItem.getState().id;
    const threadB = runtime.threads.getById(threadBId);
    await act(async () => {
      await runtime.threads.switchToThread("thread-a");
    });

    await act(async () => {
      threadB.startRun({ parentId: null });
    });
    await waitFor(() => expect(threadB.getState().isRunning).toBe(true));
    await act(async () => {
      await runtime.threads.switchToThread("thread-b");
    });
    await waitFor(() => {
      expect(globalRunStart).toHaveBeenCalledExactlyOnceWith({
        threadId: threadBId,
      });
      expect(selectedRunStart).toHaveBeenCalledExactlyOnceWith({
        threadId: threadBId,
      });
    });
    await act(async () => {
      await runtime.threads.switchToThread("thread-a");
    });
    await act(async () => {
      backgroundRun.resolve({ content: [] });
    });

    await waitFor(() => {
      expect(globalRunEnd).toHaveBeenCalledExactlyOnceWith({
        threadId: threadBId,
      });
    });
    expect(selectedRunEnd).not.toHaveBeenCalled();
  });

  it.each([
    { operation: "delete", state: "deleted" },
    { operation: "detach", state: "detached" },
  ] as const)(
    "drops the background runEnd handoff when its thread is $state",
    async ({ operation }) => {
      const runA = deferred<{ content: [] }>();
      const runSettled = vi.fn();
      const adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [
            { status: "regular" as const, remoteId: "thread-a", title: "A" },
            { status: "regular" as const, remoteId: "thread-b", title: "B" },
          ],
        })),
      });
      const globalRunEnd = vi.fn();
      let runtime!: AssistantRuntime;

      const Listener = () => {
        useAuiEvent({ scope: "*", event: "thread.runEnd" }, globalRunEnd);
        return null;
      };
      const Harness = () => {
        runtime = useRemoteThreadListRuntime({
          adapter,
          initialThreadId: "thread-a",
          runtimeHook: function RuntimeHook() {
            return useLocalRuntime({
              run: async () => {
                const result = await runA.promise;
                runSettled();
                return result;
              },
            });
          },
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <Listener />
          </AssistantRuntimeProvider>
        );
      };
      render(<Harness />);

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
      await act(async () => {
        await runtime.threads.switchToThread("thread-b");
      });

      await act(async () => {
        const item = runtime.threads.getItemById(threadAId);
        if (operation === "delete") await item.delete();
        else item.detach();
      });
      await act(async () => {
        runA.resolve({ content: [] });
      });

      await waitFor(() => expect(runSettled).toHaveBeenCalledExactlyOnceWith());
      expect(globalRunEnd).not.toHaveBeenCalled();
    },
  );

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
