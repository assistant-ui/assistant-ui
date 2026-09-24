// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { useSyncExternalStore } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import type { ExternalStoreAdapter } from "../../../runtimes/external-store/external-store-adapter";
import type { ThreadMessage } from "../../../types/message";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";
import { useCloudThreadListAdapter } from "./useCloudThreadListAdapter";

const user = (id: string): ThreadMessage => ({
  id,
  role: "user",
  content: [{ type: "text", text: id }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
});

const assistant = (id: string): ThreadMessage =>
  ({
    id,
    role: "assistant",
    content: [
      { type: "text", text: id },
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "choose",
        args: {},
        argsText: "{}",
      },
    ],
    status: { type: "complete", reason: "stop" },
    createdAt: new Date(0),
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as ThreadMessage;

const makeCloud = (
  telemetry: { enabled?: boolean; messages?: boolean } = {},
) => {
  let threadCount = 0;
  const listMessages = vi.fn().mockResolvedValue({ messages: [] });
  const createMessage = vi.fn().mockImplementation(async () => ({
    message_id: `cloud-message-${createMessage.mock.calls.length}`,
  }));
  const cloud = {
    threads: {
      list: vi.fn().mockResolvedValue({ threads: [] }),
      create: vi.fn().mockImplementation(async () => ({
        thread_id: `cloud-${++threadCount}`,
      })),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      messages: {
        list: listMessages,
        create: createMessage,
        update: vi.fn().mockResolvedValue(undefined),
      },
    },
    events: { track: vi.fn() },
    telemetry: { enabled: true, ...telemetry },
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
  return { cloud, listMessages, createMessage };
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const setup = (
  cloud: AssistantCloud,
  { persistsHistory = false }: { persistsHistory?: boolean } = {},
) => {
  const subscribers = new Set<() => void>();
  let store: ExternalStoreAdapter<ThreadMessage> = {
    messages: [],
    isRunning: false,
    onNew: async () => {},
    ...(persistsHistory ? { unstable_persistsHistory: true } : undefined),
  };
  const subscribe = (callback: () => void) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };
  const getSnapshot = () => store;
  const useControlledExternalStoreRuntime = () =>
    useExternalStoreRuntime(useSyncExternalStore(subscribe, getSnapshot));
  let runtime!: AssistantRuntime;
  const Harness = () => {
    const adapter = useCloudThreadListAdapter({ cloud });
    runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: useControlledExternalStoreRuntime,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };
  const view = render(<Harness />);
  const update = (next: Partial<ExternalStoreAdapter<ThreadMessage>>) => {
    act(() => {
      store = { ...store, ...next };
      for (const subscriber of subscribers) subscriber();
    });
  };
  const ready = async () => {
    await waitFor(() =>
      expect(runtime.threads.mainItem.getState().id).toBeDefined(),
    );
    await settle();
  };
  return { getRuntime: () => runtime, ready, update, view };
};

describe("Assistant Cloud external-store transcript copy", () => {
  it("copies a settled turn and only the new messages from the next turn", async () => {
    const { cloud, listMessages, createMessage } = makeCloud();
    const app = setup(cloud);
    const firstUser = user("user-1");
    const firstReply = assistant("assistant-1");

    await app.ready();
    app.update({ isRunning: true, messages: [firstUser] });
    app.update({ isRunning: false, messages: [firstUser, firstReply] });
    await settle();
    await waitFor(() => expect(createMessage).toHaveBeenCalledTimes(2));

    const firstTurn = createMessage.mock.calls.map(([, body]) => body);
    expect(firstTurn).toMatchObject([
      { format: "aui/v0", external_id: "user-1" },
      {
        format: "aui/v0",
        external_id: "assistant-1",
        parent_external_id: "user-1",
      },
    ]);
    expect(firstTurn[0]).not.toHaveProperty("parent_external_id");
    expect(listMessages).toHaveBeenCalledOnce();

    const secondUser = user("user-2");
    const secondReply = assistant("assistant-2");
    app.update({ isRunning: true });
    app.update({
      isRunning: false,
      messages: [firstUser, firstReply, secondUser, secondReply],
    });
    await settle();
    await waitFor(() => expect(createMessage).toHaveBeenCalledTimes(4));

    const writes = createMessage.mock.calls.map(([, body]) => body);
    expect(writes.map((body) => body.external_id)).toEqual([
      "user-1",
      "assistant-1",
      "user-2",
      "assistant-2",
    ]);
    expect(writes.slice(2)).toMatchObject([
      {
        format: "aui/v0",
        external_id: "user-2",
        parent_external_id: "assistant-1",
      },
      {
        format: "aui/v0",
        external_id: "assistant-2",
        parent_external_id: "user-2",
      },
    ]);
    expect(listMessages).toHaveBeenCalledOnce();
    app.view.unmount();
  });

  it("rewrites a copied reply with a recorded tool interaction", async () => {
    const { cloud, listMessages, createMessage } = makeCloud();
    const app = setup(cloud);
    const firstUser = user("user-1");
    const firstReply = assistant("assistant-1");

    await app.ready();
    app.update({ isRunning: true, messages: [firstUser] });
    app.update({ isRunning: false, messages: [firstUser, firstReply] });
    await settle();
    await waitFor(() => expect(createMessage).toHaveBeenCalledTimes(2));

    await act(async () => {
      await app
        .getRuntime()
        .thread.getMessageById("assistant-1")
        .getMessagePartByToolCallId("call-1").unstable_recordInteraction!({
        type: "action",
        payload: { choice: "yes" },
      });
    });

    await waitFor(() => expect(createMessage).toHaveBeenCalledTimes(3));
    const copied = createMessage.mock.calls[2]![1];
    const copiedToolCall = copied.content.content.find(
      (part: { type: string }) => part.type === "tool-call",
    );
    expect(copied).toMatchObject({ external_id: "assistant-1" });
    expect(copiedToolCall).toMatchObject({
      unstable_interactions: {
        entries: [{ type: "action", payload: { choice: "yes" } }],
      },
    });
    expect(firstReply.content[1]).not.toHaveProperty("unstable_interactions");
    expect(
      app.getRuntime().thread.getMessageById("assistant-1").getState()
        .content[1],
    ).not.toHaveProperty("unstable_interactions");
    expect(listMessages).toHaveBeenCalledOnce();
    app.view.unmount();
  });

  it("neither copies a turn nor records a tool interaction when Cloud message telemetry is disabled", async () => {
    const { cloud, listMessages, createMessage } = makeCloud({
      messages: false,
    });
    const app = setup(cloud);
    const firstUser = user("user-1");

    await app.ready();
    app.update({ isRunning: true, messages: [firstUser] });
    app.update({
      isRunning: false,
      messages: [firstUser, assistant("assistant-1")],
    });
    await settle();

    await expect(
      app
        .getRuntime()
        .thread.getMessageById("assistant-1")
        .getMessagePartByToolCallId("call-1").unstable_recordInteraction!({
        type: "action",
        payload: { choice: "yes" },
      }),
    ).rejects.toThrow("Runtime does not support recording tool interactions.");
    expect(listMessages).not.toHaveBeenCalled();
    expect(createMessage).not.toHaveBeenCalled();
    app.view.unmount();
  });

  it("does not copy a finished turn from a store that persists history", async () => {
    const { cloud, listMessages, createMessage } = makeCloud();
    const app = setup(cloud, { persistsHistory: true });
    const firstUser = user("user-1");

    await app.ready();
    app.update({ isRunning: true, messages: [firstUser] });
    app.update({
      isRunning: false,
      messages: [firstUser, assistant("assistant-1")],
    });
    await settle();

    expect(listMessages).not.toHaveBeenCalled();
    expect(createMessage).not.toHaveBeenCalled();
    app.view.unmount();
  });
});
