// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuiProvider,
  type ThreadAssistantMessage,
  useAui,
} from "@assistant-ui/react";
import { ThreadMessageClient } from "../../../../react/src/client/ThreadMessageClient";

// Mock only the sibling module that requires AUI store context (not available
// in isolation). Every other dependency — useExternalStoreRuntime,
// useToolInvocations, the message converter — runs for real.
vi.mock("./useExternalHistory", () => ({
  useExternalHistory: vi.fn(() => false),
  toExportedMessageRepository: vi.fn(),
}));

import { useAISDKRuntime } from "./useAISDKRuntime";

const createChatHelpers = (messages: any[] = []) => {
  let currentMessages = [...messages];

  const chatHelpers: any = {
    status: "ready",
    error: null,
    messages: currentMessages,
    setMessages: vi.fn((next: any) => {
      currentMessages =
        typeof next === "function" ? next(currentMessages) : [...next];
      chatHelpers.messages = currentMessages;
      return currentMessages;
    }),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    regenerate: vi.fn().mockResolvedValue(undefined),
    addToolResult: vi.fn(),
    addToolOutput: vi.fn(),
    stop: vi.fn(),
  };

  return chatHelpers;
};

const withTimeout = <T,>(promise: Promise<T>, ms = 150): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    }),
  ]);
};

const createComponentMessage = (): ThreadAssistantMessage => ({
  id: "m1",
  role: "assistant",
  createdAt: new Date("2026-02-15T12:00:00Z"),
  content: [
    {
      type: "component",
      name: "status-card",
      instanceId: "card1",
    },
  ],
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: {
      components: {
        card1: {
          seq: 1,
          lifecycle: "active",
          state: { phase: "ready" },
        },
      },
    },
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const createAuiWrapper = (
  message: ThreadAssistantMessage,
): ((props: { children: ReactNode }) => ReactNode) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    const aui = useAui({
      message: ThreadMessageClient({ message, index: 0 }),
    });

    return <AuiProvider value={aui}>{children}</AuiProvider>;
  };
};

describe("useAISDKRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a new user message through the runtime", async () => {
    const chat = createChatHelpers();

    const { result } = renderHook(() => useAISDKRuntime(chat));

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });

    await waitFor(() => {
      expect(chat.sendMessage).toHaveBeenCalledTimes(1);
    });

    expect(chat.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "user",
        parts: expect.arrayContaining([
          expect.objectContaining({ type: "text", text: "hello" }),
        ]),
      }),
      expect.anything(),
    );
  });

  it("forwards runConfig as metadata when sending", async () => {
    const chat = createChatHelpers();

    const { result } = renderHook(() => useAISDKRuntime(chat));

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
        runConfig: { model: "gpt-4.1" },
      });
    });

    await waitFor(() => {
      expect(chat.sendMessage).toHaveBeenCalledWith(expect.anything(), {
        metadata: { model: "gpt-4.1" },
      });
    });
  });

  it("cancels pending tool calls before sending a new message", async () => {
    const chat = createChatHelpers([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-weather",
            toolCallId: "tc-1",
            state: "input-available",
            input: { city: "NYC" },
          },
          {
            type: "tool-weather",
            toolCallId: "tc-2",
            state: "output-available",
            input: { city: "LA" },
            output: { temp: 70 },
          },
        ],
      },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    // Wait for the runtime to process the initial messages
    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBeGreaterThan(
        0,
      );
    });

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "continue" }],
      });
    });

    await waitFor(() => {
      expect(chat.sendMessage).toHaveBeenCalledTimes(1);
    });

    // Pending tool (tc-1) should be marked as cancelled
    expect(chat.messages[0].parts[0].state).toBe("output-error");
    expect(chat.messages[0].parts[0].errorText).toBe(
      "User cancelled tool call by sending a new message.",
    );
    // Completed tool (tc-2) should remain unchanged
    expect(chat.messages[0].parts[1].state).toBe("output-available");
  });

  it("edit slices history to parentId and sends the edited message", async () => {
    const chat = createChatHelpers([
      { id: "u1", role: "user", parts: [{ type: "text", text: "first" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "first-answer" }],
      },
      { id: "u2", role: "user", parts: [{ type: "text", text: "second" }] },
      {
        id: "a2",
        role: "assistant",
        parts: [{ type: "text", text: "second-answer" }],
      },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(4);
    });

    // Append with parentId != last message triggers onEdit
    act(() => {
      result.current.thread.append({
        role: "user",
        parentId: "u1",
        content: [{ type: "text", text: "rewrite first" }],
        runConfig: { temperature: 0.2 },
      });
    });

    await waitFor(() => {
      expect(chat.sendMessage).toHaveBeenCalledTimes(1);
    });

    // sliceMessagesUntil("u1") keeps u1 + following assistant messages (a1)
    expect(chat.messages.map((m: any) => m.id)).toEqual(["u1", "a1"]);
    expect(chat.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user" }),
      { metadata: { temperature: 0.2 } },
    );
  });

  it("reload slices history and regenerates with metadata", async () => {
    const chat = createChatHelpers([
      { id: "u1", role: "user", parts: [{ type: "text", text: "first" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "first-answer" }],
      },
      { id: "u2", role: "user", parts: [{ type: "text", text: "second" }] },
      {
        id: "a2",
        role: "assistant",
        parts: [{ type: "text", text: "second-answer" }],
      },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(4);
    });

    act(() => {
      result.current.thread.startRun({
        parentId: "u1",
        runConfig: { maxTokens: 100 },
      });
    });

    await waitFor(() => {
      expect(chat.regenerate).toHaveBeenCalledTimes(1);
    });

    expect(chat.messages.map((m: any) => m.id)).toEqual(["u1", "a1"]);
    expect(chat.regenerate).toHaveBeenCalledWith({
      metadata: { maxTokens: 100 },
    });
  });

  it("converts data-spec parts into hosted component parts in runtime state", async () => {
    const chat = createChatHelpers([
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "before" },
          {
            type: "data-spec",
            data: {
              instanceId: "spec1",
              seq: 1,
              spec: { type: "card", props: { title: "Draft" } },
            },
          },
          {
            type: "data-spec",
            data: {
              instanceId: "spec1",
              seq: 2,
              patch: [{ op: "replace", path: "/props/title", value: "Ready" }],
            },
          },
        ],
      },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(1);
    });

    const assistant = result.current.thread.getState()
      .messages[0] as ThreadAssistantMessage;
    const componentPart = assistant.content.find(
      (
        part,
      ): part is Extract<
        (typeof assistant.content)[number],
        { type: "component" }
      > => part.type === "component",
    );

    expect(componentPart).toBeDefined();
    expect(componentPart).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec1",
      props: {
        spec: {
          type: "card",
          props: { title: "Ready" },
        },
      },
    });
  });

  it("applies runtime unstable_dataSpec validate/repair hooks during conversion", async () => {
    const chat = createChatHelpers([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "data-spec",
            data: {
              instanceId: "spec1",
              seq: 1,
              spec: { type: "unknown-layout", props: { title: "Draft" } },
            },
          },
        ],
      },
    ]);
    const validateSpec = vi.fn(
      (context) =>
        (context.spec as { type?: unknown } | undefined)?.type === "card",
    );
    const repairSpec = vi.fn(() => ({
      type: "card",
      props: { title: "Repaired" },
    }));

    const { result } = renderHook(() =>
      useAISDKRuntime(chat, {
        unstable_dataSpec: {
          validateSpec,
          repairSpec,
        },
      }),
    );

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(1);
    });

    const assistant = result.current.thread.getState()
      .messages[0] as ThreadAssistantMessage;
    const componentPart = assistant.content.find(
      (
        part,
      ): part is Extract<
        (typeof assistant.content)[number],
        { type: "component" }
      > => part.type === "component",
    );

    expect(validateSpec).toHaveBeenCalled();
    expect(repairSpec).toHaveBeenCalled();
    expect(componentPart).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec1",
      props: {
        spec: {
          type: "card",
          props: { title: "Repaired" },
        },
      },
    });
  });

  it("forwards runtime unstable_dataSpec telemetry callbacks from converter", async () => {
    const chat = createChatHelpers([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "data-spec",
            data: {
              instanceId: "spec1",
              seq: 2,
              spec: { type: "card", props: { title: "Initial" } },
            },
          },
          {
            type: "data-spec",
            data: {
              instanceId: "spec1",
              seq: 1,
              patch: [{ op: "replace", path: "/props/title", value: "Stale" }],
            },
          },
          {
            type: "data-spec",
            data: {
              instanceId: "spec1",
              seq: 3,
              patch: [{ op: "replace", path: "props/title", value: "Broken" }],
            },
          },
        ],
      },
    ]);
    const onTelemetry = vi.fn();

    renderHook(() =>
      useAISDKRuntime(chat, {
        unstable_dataSpec: {
          onTelemetry,
        },
      }),
    );

    await waitFor(() => {
      expect(onTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "stale-seq-ignored",
          instanceId: "spec1",
        }),
      );
    });
    expect(onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "malformed-patch-dropped",
        instanceId: "spec1",
      }),
    );
  });

  it("routes component.invoke through AI SDK adapter and resolves from ack", async () => {
    const chat = createChatHelpers();
    const onComponentInvoke = vi.fn(async (payload) => ({
      ok: true,
      action: payload.action,
    }));

    const wrapper = createAuiWrapper(createComponentMessage());
    const { result } = renderHook(
      () => {
        useAISDKRuntime(chat, {
          onComponentInvoke,
        });
        return useAui();
      },
      { wrapper },
    );

    const component = result.current
      .message()
      .component({ instanceId: "card1" });

    await expect(
      withTimeout(component.invoke("refresh", { source: "test" })),
    ).resolves.toEqual({ ok: true, action: "refresh" });

    expect(onComponentInvoke).toHaveBeenCalledWith({
      messageId: "m1",
      instanceId: "card1",
      action: "refresh",
      payload: { source: "test" },
    });
  });

  it("routes component.invoke through AI SDK adapter and rejects on handler failure", async () => {
    const chat = createChatHelpers();
    const rejection = new Error("invoke failed");
    const onComponentInvoke = vi.fn(async () => {
      throw rejection;
    });

    const wrapper = createAuiWrapper(createComponentMessage());
    const { result } = renderHook(
      () => {
        useAISDKRuntime(chat, {
          onComponentInvoke,
        });
        return useAui();
      },
      { wrapper },
    );

    const component = result.current
      .message()
      .component({ instanceId: "card1" });

    await expect(
      withTimeout(component.invoke("refresh", { source: "test" })),
    ).rejects.toBe(rejection);
  });

  it("rejects component.invoke when onComponentInvoke throws synchronously", async () => {
    const chat = createChatHelpers();
    const rejection = new Error("sync invoke throw");
    const onComponentInvoke = vi.fn(() => {
      throw rejection;
    });

    const wrapper = createAuiWrapper(createComponentMessage());
    const { result } = renderHook(
      () => {
        useAISDKRuntime(chat, {
          onComponentInvoke,
        });
        return useAui();
      },
      { wrapper },
    );

    const component = result.current
      .message()
      .component({ instanceId: "card1" });

    await expect(
      withTimeout(component.invoke("refresh", { source: "test" })),
    ).rejects.toBe(rejection);
  });

  it("rejects component.invoke deterministically when onComponentInvoke is missing", async () => {
    const chat = createChatHelpers();
    const wrapper = createAuiWrapper(createComponentMessage());

    const { result } = renderHook(
      () => {
        useAISDKRuntime(chat);
        return useAui();
      },
      { wrapper },
    );

    const component = result.current
      .message()
      .component({ instanceId: "card1" });

    await expect(
      withTimeout(component.invoke("refresh", { source: "test" })),
    ).rejects.toThrow(
      "component.invoke requires AISDK runtime onComponentInvoke handler",
    );
  });

  it("routes component.emit through AI SDK adapter as fire-and-forget", async () => {
    const chat = createChatHelpers();
    const onComponentEmit = vi.fn();

    const wrapper = createAuiWrapper(createComponentMessage());
    const { result } = renderHook(
      () => {
        useAISDKRuntime(chat, {
          onComponentEmit,
        });
        return useAui();
      },
      { wrapper },
    );

    const component = result.current
      .message()
      .component({ instanceId: "card1" });

    component.emit("selected", { tab: "metrics" });

    await waitFor(() => {
      expect(onComponentEmit).toHaveBeenCalledWith({
        messageId: "m1",
        instanceId: "card1",
        event: "selected",
        payload: { tab: "metrics" },
      });
    });
  });

  it("keeps component.emit as a no-op when onComponentEmit is missing", async () => {
    const chat = createChatHelpers();
    const wrapper = createAuiWrapper(createComponentMessage());

    const { result } = renderHook(
      () => {
        useAISDKRuntime(chat);
        return useAui();
      },
      { wrapper },
    );

    const component = result.current
      .message()
      .component({ instanceId: "card1" });

    expect(() => component.emit("selected", { tab: "metrics" })).not.toThrow();
  });
});
