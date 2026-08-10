// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui, useAuiEvent } from "@assistant-ui/store";
import { RuntimeAdapter } from "../react/RuntimeAdapter";
import { AssistantRuntimeImpl } from "../runtime/api/assistant-runtime";
import { ExternalStoreRuntimeCore } from "../runtimes/external-store/external-store-runtime-core";
import type { ExternalStoreAdapter } from "../runtimes/external-store/external-store-adapter";

type DemoMessage = { id: string; role: "user" | "assistant"; text: string };

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

  it("does not emit for the initially selected thread on mount", async () => {
    const runtime = createRuntime();
    const anySwitch = vi.fn();
    const Consumer = () => {
      useAuiEvent(
        { scope: "*", event: "threadListItem.switchedTo" } as never,
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
});
