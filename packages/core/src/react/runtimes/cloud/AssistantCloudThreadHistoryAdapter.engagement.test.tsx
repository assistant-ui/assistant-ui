// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { flushTapSync, withKey } from "@assistant-ui/tap";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { AssistantCloud, AssistantCloudEvent } from "assistant-cloud";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { RemoteThreadList } from "../../client/RemoteThreadList";
import { ThreadClient } from "../../../store/runtime-clients/thread-runtime-client";
import { ExternalStoreRuntimeCore } from "../../../runtimes/external-store/external-store-runtime-core";
import type { ExternalStoreAdapter } from "../../../runtimes/external-store/external-store-adapter";
import { AssistantRuntimeImpl } from "../../../runtime/api/assistant-runtime";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import { deferred } from "../../../tests/remote-thread-list-test-helpers";
import { useLocalRuntime } from "../useLocalRuntime";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";
import { createCloudThreadListAdapter } from "./createCloudThreadListAdapter";
import { useCloudThreadListAdapter } from "./useCloudThreadListAdapter";

const makeCloud = () => {
  let created = 0;
  return {
    threads: {
      list: vi.fn().mockResolvedValue({ threads: [] }),
      create: vi.fn(async () => ({ thread_id: `remote-${++created}` })),
      update: vi.fn().mockResolvedValue(undefined),
      messages: {
        list: vi.fn().mockResolvedValue({ messages: [] }),
        create: vi.fn().mockResolvedValue({ message_id: "remote-message-1" }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    },
    events: { track: vi.fn() },
    telemetry: { enabled: true },
    runs: {
      report: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn(
        async () =>
          new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
      ),
    },
    registerSdk: vi.fn(),
  } as unknown as AssistantCloud;
};

const tracked = (cloud: AssistantCloud, kind: AssistantCloudEvent["kind"]) =>
  vi
    .mocked(cloud.events.track)
    .mock.calls.map(([event]) => event)
    .filter((event) => event.kind === kind);

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("cloud engagement events under useRemoteThreadListRuntime", () => {
  const renderRuntime = (cloud: AssistantCloud) => {
    const runs: ReturnType<typeof deferred<{ content: [] }>>[] = [];
    let runtime!: AssistantRuntime;
    let aui!: AssistantClient;
    const Capture = () => {
      aui = useAui();
      return null;
    };
    const Harness = () => {
      const adapter = useCloudThreadListAdapter({ cloud });
      runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: function RuntimeHook() {
          return useLocalRuntime({
            run: () => {
              const run = deferred<{ content: [] }>();
              runs.push(run);
              return run.promise;
            },
          });
        },
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
        </AssistantRuntimeProvider>
      );
    };
    render(<Harness />);
    const send = async (text: string) => {
      await act(async () => {
        aui.thread.append(text);
      });
      await waitFor(() =>
        expect(runtime.threads.mainItem.getState().remoteId).toBeDefined(),
      );
      await act(settle);
    };
    const finishRun = async (index: number) => {
      await act(async () => {
        runs[index]!.resolve({ content: [] });
      });
      await act(settle);
    };
    return { getRuntime: () => runtime, send, finishRun };
  };

  it("reports one event per send and per switch with every visited thread mounted", async () => {
    const cloud = makeCloud();
    const harness = renderRuntime(cloud);
    await act(settle);
    const runtime = harness.getRuntime();
    const first = runtime.threads.mainItem.getState().id;

    await harness.send("0123456789");
    await harness.finishRun(0);
    await act(async () => {
      await runtime.threads.switchToNewThread();
    });
    await harness.send("01234567890123456789");
    await harness.finishRun(1);
    await act(async () => {
      await runtime.threads.switchToNewThread();
    });
    await harness.send("012345678901234567890123456789");

    await waitFor(() => expect(tracked(cloud, "message_sent")).toHaveLength(3));
    expect(
      tracked(cloud, "message_sent").map((event) => [
        event.thread_id,
        event.props?.chars,
      ]),
    ).toEqual([
      ["remote-1", 10],
      ["remote-2", 20],
      ["remote-3", 30],
    ]);
    expect(tracked(cloud, "thread_switched")).toHaveLength(0);

    await act(async () => {
      await runtime.threads.switchToThread(first);
    });
    await waitFor(() =>
      expect(tracked(cloud, "thread_switched")).toHaveLength(1),
    );
    expect(tracked(cloud, "thread_switched")[0]).toMatchObject({
      thread_id: "remote-1",
    });
  });

  it("times the next send from a run that ended while its thread was in the background", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    const cloud = makeCloud();
    const harness = renderRuntime(cloud);
    await act(settle);
    const runtime = harness.getRuntime();
    const first = runtime.threads.mainItem.getState().id;

    await harness.send("first");
    await harness.finishRun(0);
    await act(async () => {
      await runtime.threads.switchToNewThread();
    });
    const second = runtime.threads.mainItem.getState().id;
    await harness.send("second");
    await act(async () => {
      await runtime.threads.switchToThread(first);
    });
    now.mockReturnValue(2_000);
    await harness.finishRun(1);
    await act(async () => {
      await runtime.threads.switchToThread(second);
    });
    now.mockReturnValue(2_500);
    await harness.send("again");

    await waitFor(() => expect(tracked(cloud, "message_sent")).toHaveLength(3));
    expect(tracked(cloud, "message_sent")[2]).toMatchObject({
      thread_id: "remote-2",
      value: 500,
    });
  });
});

describe("cloud engagement events under RemoteThreadList with backgroundThreads", () => {
  type DemoMessage = { role: "user" | "assistant"; text: string };
  const makeThreadRuntime = (threadId: string) => {
    const adapter: ExternalStoreAdapter<DemoMessage> = {
      messages: [],
      convertMessage: (message) => ({
        role: message.role,
        content: [{ type: "text", text: message.text }],
      }),
      onNew: async () => {},
      adapters: {
        threadList: {
          threadId,
          threads: [{ status: "regular", id: threadId, title: threadId }],
          onSwitchToThread: () => {},
          onSwitchToNewThread: () => {},
        },
      },
    };
    return new AssistantRuntimeImpl(new ExternalStoreRuntimeCore(adapter))
      .thread;
  };

  it("reports one event per send and per switch across mounted bodies", async () => {
    const cloud = makeCloud();
    const handle = createAssistantClient(
      AuiConfig({
        threads: RemoteThreadList({
          adapter: createCloudThreadListAdapter({ cloud }),
          backgroundThreads: true,
          thread: (id) =>
            withKey(id, ThreadClient({ runtime: makeThreadRuntime(id) })),
        }),
      }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();
    try {
      await aui.threads.getLoadThreadsPromise();
      const send = async (text: string) => {
        flushTapSync(() => aui.thread.append(text));
        await settle();
        await aui.threads.item("main").initialize();
        await settle();
      };
      const first = aui.threads.getState().mainThreadId;

      await send("0123456789");
      flushTapSync(() => aui.threads.switchToNewThread());
      await settle();
      await send("01234567890123456789");
      flushTapSync(() => aui.threads.switchToNewThread());
      await settle();
      await send("012345678901234567890123456789");

      await vi.waitFor(() =>
        expect(tracked(cloud, "message_sent")).toHaveLength(3),
      );
      expect(
        tracked(cloud, "message_sent").map((event) => [
          event.thread_id,
          event.props?.chars,
        ]),
      ).toEqual([
        ["remote-1", 10],
        ["remote-2", 20],
        ["remote-3", 30],
      ]);
      expect(tracked(cloud, "thread_switched")).toHaveLength(0);

      flushTapSync(() => aui.threads.switchToThread(first));
      await vi.waitFor(() =>
        expect(tracked(cloud, "thread_switched")).toHaveLength(1),
      );
      expect(tracked(cloud, "thread_switched")[0]).toMatchObject({
        thread_id: "remote-1",
      });
    } finally {
      handle.destroy();
    }
  });
});
