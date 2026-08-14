// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui, useAuiEvent } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../react/AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../react/runtimes/useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "../react/runtimes/useRemoteThreadListRuntime";
import { makeAdapter } from "./remote-thread-list-test-helpers";
import { RuntimeAdapter } from "../react/RuntimeAdapter";
import { AssistantRuntimeImpl } from "../runtime/api/assistant-runtime";
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
