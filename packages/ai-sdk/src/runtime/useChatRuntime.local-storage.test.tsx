// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  createLocalStorageAdapter,
  useRemoteThreadListRuntime,
  type AsyncStorageLike,
} from "@assistant-ui/core/react";
import type { ChatTransport, UIMessage } from "ai";
import { useState, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  createControlledTransport,
  createStreamHarness,
} from "./__tests__/controlled-transport";
import { useChatRuntime } from "./useChatRuntime";

const createStorage = (): AsyncStorageLike & { keys(): string[] } => {
  const values = new Map<string, string>();
  return {
    keys: () => [...values.keys()],
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
};

const LocalStorageApp = ({
  storage,
  transport,
  threadId,
  probe,
}: {
  storage: AsyncStorageLike;
  transport: ChatTransport<UIMessage>;
  threadId?: string;
  probe: ReactNode;
}) => {
  const [adapter] = useState(() => createLocalStorageAdapter({ storage }));
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatRuntime({ transport });
    },
    adapter,
    ...(threadId !== undefined ? { threadId } : undefined),
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {probe}
    </AssistantRuntimeProvider>
  );
};

const threadText = (
  harness: ReturnType<typeof createStreamHarness>,
): string[] =>
  harness
    .client()
    .thread.getState()
    .messages.map((message) =>
      message.content
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(""),
    );

describe("useChatRuntime with createLocalStorageAdapter", () => {
  it("persists AI SDK messages and restores them after a remount", async () => {
    const storage = createStorage();
    const { transport, emit, close } = createControlledTransport();
    const harness = createStreamHarness();

    const first = render(
      <LocalStorageApp
        storage={storage}
        transport={transport}
        probe={<harness.Probe />}
      />,
    );

    await act(async () => harness.send());
    await waitFor(() => expect(harness.isRunning()).toBe(true));
    await act(async () => {
      emit(
        { type: "start" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "stored answer" },
        { type: "text-end", id: "t1" },
        { type: "finish" },
      );
      close();
    });
    await waitFor(() => expect(harness.isRunning()).toBe(false));

    const remoteId = harness.client().threadListItem.getState().remoteId;
    expect(remoteId).toBeDefined();
    await waitFor(() =>
      expect(storage.keys()).toContain(
        `@assistant-ui:messages:${remoteId}:ai-sdk/v6`,
      ),
    );
    first.unmount();

    const restored = createStreamHarness();
    render(
      <LocalStorageApp
        storage={storage}
        transport={createControlledTransport().transport}
        threadId={remoteId!}
        probe={<restored.Probe />}
      />,
    );

    await waitFor(() =>
      expect(threadText(restored)).toEqual(["keep streaming", "stored answer"]),
    );
  });
});
