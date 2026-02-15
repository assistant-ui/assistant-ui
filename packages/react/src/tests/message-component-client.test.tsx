// @vitest-environment jsdom

import type { RefObject } from "react";
import { renderHook } from "@testing-library/react";
import { useAui } from "@assistant-ui/store";
import { describe, expect, it, vi } from "vitest";
import type { ThreadAssistantMessage } from "../types";
import type {
  MessageRuntime,
  MessageState as RuntimeMessageState,
} from "../legacy-runtime/runtime/MessageRuntime";
import type { MessagePartRuntime } from "../legacy-runtime/runtime/MessagePartRuntime";
import { MessageClient } from "../legacy-runtime/client/MessageRuntimeClient";
import { ThreadMessageClient } from "../client/ThreadMessageClient";

const flushMicrotaskQueue = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createAssistantMessage = (
  unstableState: unknown,
  content: ThreadAssistantMessage["content"],
): ThreadAssistantMessage => ({
  id: "m1",
  role: "assistant",
  createdAt: new Date("2026-02-15T12:00:00Z"),
  content,
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state:
      unstableState as ThreadAssistantMessage["metadata"]["unstable_state"],
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const createFakeMessageRuntime = (
  initialState: RuntimeMessageState,
): MessageRuntime & { setState: (state: RuntimeMessageState) => void } => {
  let state = initialState;
  const listeners = new Set<() => void>();

  const partRuntimeForIndex = (index: number): MessagePartRuntime =>
    ({
      path: {} as MessagePartRuntime["path"],
      getState: () => {
        const part = state.content[index];
        if (!part) throw new Error(`No part at index ${index}`);
        return {
          ...part,
          status: { type: "complete" as const },
        };
      },
      subscribe: (callback: () => void) => {
        listeners.add(callback);
        return () => listeners.delete(callback);
      },
      addToolResult: () => {},
      resumeToolCall: () => {},
    }) as MessagePartRuntime;

  const runtime = {
    path: {} as MessageRuntime["path"],
    composer: {
      getState: () => ({
        text: "",
        role: "user",
        attachments: [],
        runConfig: {},
        isEditing: true,
        canCancel: false,
        attachmentAccept: "*",
        isEmpty: true,
        dictation: undefined,
        quote: undefined,
      }),
      subscribe: () => () => {},
      unstable_on: () => () => {},
      setText: () => {},
      setRole: () => {},
      setRunConfig: () => {},
      addAttachment: async () => {},
      reset: async () => {},
      clearAttachments: async () => {},
      send: () => {},
      cancel: () => {},
      beginEdit: () => {},
      startDictation: () => {},
      stopDictation: () => {},
      setQuote: () => {},
      getAttachmentByIndex: () => {
        throw new Error("No composer attachments in fake runtime");
      },
    } as unknown as MessageRuntime["composer"],
    getState: () => state,
    subscribe: (callback: () => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    reload: () => {},
    speak: () => {},
    stopSpeaking: () => {},
    submitFeedback: () => {},
    switchToBranch: () => {},
    unstable_getCopyText: () => "",
    getMessagePartByIndex: (index: number) => partRuntimeForIndex(index),
    getMessagePartByToolCallId: (toolCallId: string) => {
      const index = state.content.findIndex(
        (part) => part.type === "tool-call" && part.toolCallId === toolCallId,
      );
      if (index === -1) throw new Error(`No tool part for id ${toolCallId}`);
      return partRuntimeForIndex(index);
    },
    getAttachmentByIndex: () => {
      throw new Error("No message attachments in fake runtime");
    },
    setState: (next: RuntimeMessageState) => {
      state = next;
      for (const callback of listeners) callback();
    },
  };

  return runtime as MessageRuntime & {
    setState: (state: RuntimeMessageState) => void;
  };
};

describe("message.component client", () => {
  it("resolves components by component index and instanceId with hydrated state", () => {
    const message = createAssistantMessage(
      {
        components: {
          card_1: { seq: 5, lifecycle: "active", state: { title: "Primary" } },
          card_2: {
            seq: 2,
            lifecycle: "mounting",
            state: { title: "Secondary" },
          },
        },
      },
      [
        { type: "component", name: "status-card", instanceId: "card_2" },
        { type: "text", text: "between" },
        { type: "component", name: "status-card", instanceId: "card_1" },
      ],
    );

    const { result } = renderHook(
      ({ currentMessage }) => {
        return useAui({
          message: ThreadMessageClient({ message: currentMessage, index: 0 }),
        });
      },
      { initialProps: { currentMessage: message } },
    );

    const firstByIndex = result.current
      .message()
      .component({ index: 0 })
      .getState();
    const secondByIndex = result.current
      .message()
      .component({ index: 1 })
      .getState();
    const byInstanceId = result.current
      .message()
      .component({ instanceId: "card_1" })
      .getState();

    expect(firstByIndex.instanceId).toBe("card_2");
    expect(firstByIndex.seq).toBe(2);
    expect(firstByIndex.lifecycle).toBe("mounting");
    expect(firstByIndex.state).toEqual({ title: "Secondary" });

    expect(secondByIndex.instanceId).toBe("card_1");
    expect(secondByIndex.seq).toBe(5);
    expect(secondByIndex.lifecycle).toBe("active");
    expect(secondByIndex.state).toEqual({ title: "Primary" });

    expect(byInstanceId.instanceId).toBe("card_1");
    expect(byInstanceId.seq).toBe(5);
  });

  it("emits scoped component lifecycle/state events when seq advances", async () => {
    const lifecycleSpy = vi.fn();
    const stateSpy = vi.fn();

    const initialMessage = createAssistantMessage(
      {
        components: {
          card_1: { seq: 1, lifecycle: "mounting", state: { phase: "draft" } },
        },
      },
      [{ type: "component", name: "status-card", instanceId: "card_1" }],
    );

    const { result, rerender } = renderHook(
      ({ currentMessage }) => {
        return useAui({
          message: ThreadMessageClient({ message: currentMessage, index: 0 }),
        });
      },
      { initialProps: { currentMessage: initialMessage } },
    );

    const unsubLifecycle = result.current.on(
      { scope: "message", event: "component.lifecycle" },
      lifecycleSpy,
    );
    const unsubState = result.current.on(
      { scope: "message", event: "component.state" },
      stateSpy,
    );

    await flushMicrotaskQueue();
    expect(lifecycleSpy).not.toHaveBeenCalled();
    expect(stateSpy).not.toHaveBeenCalled();

    rerender({
      currentMessage: createAssistantMessage(
        {
          components: {
            card_1: { seq: 2, lifecycle: "active", state: { phase: "ready" } },
          },
        },
        [{ type: "component", name: "status-card", instanceId: "card_1" }],
      ),
    });

    await flushMicrotaskQueue();

    expect(lifecycleSpy).toHaveBeenCalledWith({
      messageId: "m1",
      instanceId: "card_1",
      lifecycle: "active",
      seq: 2,
    });
    expect(stateSpy).toHaveBeenCalledWith({
      messageId: "m1",
      instanceId: "card_1",
      seq: 2,
      state: { phase: "ready" },
    });

    unsubLifecycle();
    unsubState();
  });

  it("hydrates legacy MessageClient component state", () => {
    const initialState = createAssistantMessage(
      {
        components: {
          card_9: { seq: 3, lifecycle: "active", state: { label: "init" } },
        },
      },
      [{ type: "component", name: "status-chip", instanceId: "card_9" }],
    ) as RuntimeMessageState;

    const runtime = createFakeMessageRuntime(initialState);
    const threadIdRef = { current: "thread-1" } as RefObject<string>;

    const { result } = renderHook(() => {
      return useAui({
        message: MessageClient({ runtime, threadIdRef }),
      });
    });

    const componentState = result.current
      .message()
      .component({ instanceId: "card_9" })
      .getState();

    expect(componentState.instanceId).toBe("card_9");
    expect(componentState.seq).toBe(3);
    expect(componentState.state).toEqual({ label: "init" });

    const byIndex = result.current.message().component({ index: 0 }).getState();
    expect(byIndex.instanceId).toBe("card_9");
    expect(byIndex.seq).toBe(3);
  });

  it("routes component.invoke with scoped payload and resolves from ack", async () => {
    const initialMessage = createAssistantMessage(
      {
        components: {
          card_1: { seq: 1, lifecycle: "active", state: { phase: "ready" } },
        },
      },
      [{ type: "component", name: "status-card", instanceId: "card_1" }],
    );

    const { result } = renderHook(
      ({ currentMessage }) => {
        return useAui({
          message: ThreadMessageClient({ message: currentMessage, index: 0 }),
        });
      },
      { initialProps: { currentMessage: initialMessage } },
    );

    const invokeListener = vi.fn((payload: { ack: (value: unknown) => void }) =>
      payload.ack({ ok: true }),
    );
    const unsubscribe = result.current.on(
      { scope: "message", event: "component.invoke" },
      invokeListener,
    );

    const component = result.current
      .message()
      .component({ instanceId: "card_1" });
    const invocation = component.invoke("refresh", { source: "test" });

    await expect(invocation).resolves.toEqual({ ok: true });
    expect(invokeListener).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: "m1",
        instanceId: "card_1",
        action: "refresh",
        payload: { source: "test" },
      }),
    );

    unsubscribe();
  });

  it("settles component.invoke only once when listeners call ack and reject", async () => {
    const initialMessage = createAssistantMessage(
      {
        components: {
          card_1: { seq: 1, lifecycle: "active", state: { phase: "ready" } },
        },
      },
      [{ type: "component", name: "status-card", instanceId: "card_1" }],
    );

    const { result } = renderHook(
      ({ currentMessage }) => {
        return useAui({
          message: ThreadMessageClient({ message: currentMessage, index: 0 }),
        });
      },
      { initialProps: { currentMessage: initialMessage } },
    );

    const invokeListener = vi.fn(
      (payload: {
        ack: (value: unknown) => void;
        reject: (reason?: unknown) => void;
      }) => {
        payload.ack({ ok: true });
        payload.reject(new Error("ignored after ack"));
      },
    );
    const unsubscribe = result.current.on(
      { scope: "message", event: "component.invoke" },
      invokeListener,
    );

    const component = result.current
      .message()
      .component({ instanceId: "card_1" });

    await expect(
      component.invoke("refresh", { source: "test" }),
    ).resolves.toEqual({ ok: true });

    expect(invokeListener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("routes component.emit as fire-and-forget scoped event", async () => {
    const initialMessage = createAssistantMessage(
      {
        components: {
          card_1: { seq: 1, lifecycle: "active", state: { phase: "ready" } },
        },
      },
      [{ type: "component", name: "status-card", instanceId: "card_1" }],
    );

    const { result } = renderHook(
      ({ currentMessage }) => {
        return useAui({
          message: ThreadMessageClient({ message: currentMessage, index: 0 }),
        });
      },
      { initialProps: { currentMessage: initialMessage } },
    );

    const emitListener = vi.fn();
    const unsubscribe = result.current.on(
      { scope: "message", event: "component.emit" },
      emitListener,
    );

    const component = result.current
      .message()
      .component({ instanceId: "card_1" });
    component.emit("selected", { tab: "metrics" });

    await flushMicrotaskQueue();

    expect(emitListener).toHaveBeenCalledWith({
      messageId: "m1",
      instanceId: "card_1",
      event: "selected",
      payload: { tab: "metrics" },
    });

    unsubscribe();
  });
});
