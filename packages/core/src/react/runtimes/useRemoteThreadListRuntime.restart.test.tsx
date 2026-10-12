// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import {
  actSettled,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import type { ThreadMessage } from "../../types/message";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly ThreadMessage[] = [];

const toolMessage = (id: string): ThreadMessage => ({
  id,
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: `call-${id}`,
      toolName: "probe",
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
});

it("restarts a running thread without notifying store subscribers during render", async () => {
  const adapter = makeAdapter();
  let isRunning = true;
  let aui: AssistantClient | undefined;
  const Probe = () => {
    aui = useAui();
    return null;
  };
  const App = () => {
    const runtime = useRemoteThreadListRuntime({
      adapter,
      initialThreadId: "thread-1",
      runtimeHook: function useRunningThreadRuntime() {
        return useExternalStoreRuntime<ThreadMessage>({
          messages: EMPTY_MESSAGES,
          isRunning,
          onNew: async () => {},
        });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Probe />
      </AssistantRuntimeProvider>
    );
  };

  render(<App />);
  await waitFor(() => {
    expect(aui!.threadListItem.getState().status).toBe("regular");
    expect(aui!.threadListItem.getState().isRunning).toBe(true);
  });
  const error = vi.spyOn(console, "error");

  isRunning = false;
  await actSettled(() => aui!.threads.reloadMainThread());

  expect(aui!.threadListItem.getState().isRunning).toBe(false);
  expect(error).not.toHaveBeenCalled();
});

it("records from a retained part on the successor core after a thread restart", async () => {
  const events: Array<{ host: string; messageId: string; toolCallId: string }> =
    [];
  let mounts = 0;
  let runtime!: AssistantRuntime;
  const adapter = makeAdapter({
    list: vi.fn(async () => ({
      threads: [{ status: "regular" as const, remoteId: "thread-1" }],
    })),
  });
  const App = () => {
    runtime = useRemoteThreadListRuntime({
      adapter,
      initialThreadId: "thread-1",
      runtimeHook: function useThreadRuntime() {
        const [host] = useState(() => `host-${++mounts}`);
        return useExternalStoreRuntime<ThreadMessage>({
          messages: [toolMessage("message-1")],
          onNew: async () => {},
          unstable_onRecordToolInteraction: async ({
            messageId,
            toolCallId,
          }) => {
            events.push({ host, messageId, toolCallId });
          },
        });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };

  render(<App />);
  await waitFor(() =>
    expect(runtime.thread.getState().messages[0]?.id).toBe("message-1"),
  );
  const threadId = runtime.thread.getState().threadId;
  const recordInteraction = runtime.thread
    .getMessageByIndex(0)
    .getMessagePartByIndex(0).unstable_recordInteraction!;
  await recordInteraction({ type: "action", payload: { source: "before" } });
  const originalHost = events[0]!.host;
  events.length = 0;

  await actSettled(() => runtime.threads.reloadMainThread());
  expect(runtime.thread.getState().threadId).toBe(threadId);
  const currentRecordInteraction = runtime.thread
    .getMessageByIndex(0)
    .getMessagePartByIndex(0).unstable_recordInteraction!;
  await currentRecordInteraction({
    type: "action",
    payload: { source: "current" },
  });
  const currentHost = events[0]!.host;
  expect(currentHost).not.toBe(originalHost);
  events.length = 0;

  await recordInteraction({ type: "action", payload: { source: "retained" } });
  expect(events).toEqual([
    {
      host: currentHost,
      messageId: "message-1",
      toolCallId: "call-message-1",
    },
  ]);
});

it("records from a retained part on its original thread after a thread switch", async () => {
  const events: Array<{ host: string; messageId: string; toolCallId: string }> =
    [];
  let runtime!: AssistantRuntime;
  const adapter = makeAdapter({
    list: vi.fn(async () => ({
      threads: [
        { status: "regular" as const, remoteId: "thread-1" },
        { status: "regular" as const, remoteId: "thread-2" },
      ],
    })),
  });
  const App = () => {
    runtime = useRemoteThreadListRuntime({
      adapter,
      initialThreadId: "thread-1",
      runtimeHook: function useThreadRuntime() {
        const threadId = useAui().threadListItem.getState().id;
        return useExternalStoreRuntime<ThreadMessage>({
          messages: [toolMessage(`message-${threadId}`)],
          onNew: async () => {},
          unstable_onRecordToolInteraction: async ({
            messageId,
            toolCallId,
          }) => {
            events.push({ host: threadId, messageId, toolCallId });
          },
        });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };

  render(<App />);
  await waitFor(() =>
    expect(runtime.thread.getState().messages[0]?.id).toBe("message-thread-1"),
  );
  const recordInteraction = runtime.thread
    .getMessageByIndex(0)
    .getMessagePartByIndex(0).unstable_recordInteraction!;

  await actSettled(() => runtime.threads.switchToThread("thread-2"));
  await waitFor(() =>
    expect(runtime.thread.getState().messages[0]?.id).toBe("message-thread-2"),
  );

  await recordInteraction({ type: "action", payload: { source: "retained" } });
  expect(events).toEqual([
    {
      host: "thread-1",
      messageId: "message-thread-1",
      toolCallId: "call-message-thread-1",
    },
  ]);
});

it("records from a retained part on its original branch after a branch switch", async () => {
  const events: Array<{ messageId: string; toolCallId: string }> = [];
  let runtime!: AssistantRuntime;
  const root: ThreadMessage = {
    id: "root",
    role: "user",
    content: [{ type: "text", text: "hello" }],
    attachments: [],
    createdAt: new Date(0),
    metadata: { custom: {} },
  };
  let messages = [root, toolMessage("branch-a")];
  const App = () => {
    runtime = useExternalStoreRuntime<ThreadMessage>({
      messages,
      onNew: async () => {},
      setMessages: (next) => {
        messages = [...next];
      },
      unstable_onRecordToolInteraction: async ({ messageId, toolCallId }) => {
        events.push({ messageId, toolCallId });
      },
    });
    return null;
  };

  const view = render(<App />);
  messages = [root, toolMessage("branch-b")];
  await act(async () => view.rerender(<App />));
  const recordInteraction = runtime.thread
    .getMessageByIndex(1)
    .getMessagePartByIndex(0).unstable_recordInteraction!;

  await act(async () =>
    runtime.thread.getMessageByIndex(1).switchToBranch({
      branchId: "branch-a",
    }),
  );
  await act(async () => view.rerender(<App />));
  expect(
    runtime.thread.getState().messages.map((message) => message.id),
  ).toEqual(["root", "branch-a"]);

  await recordInteraction({ type: "action", payload: { source: "retained" } });
  expect(events).toEqual([
    { messageId: "branch-b", toolCallId: "call-branch-b" },
  ]);
});
