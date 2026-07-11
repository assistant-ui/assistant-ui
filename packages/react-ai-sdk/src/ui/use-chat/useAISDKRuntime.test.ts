// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateUIMessages } from "ai";

// Mock only the sibling module that requires AUI store context (not available
// in isolation). Every other dependency — useExternalStoreRuntime,
// useToolInvocations, the message converter — runs for real.
vi.mock("./useExternalHistory", () => ({
  useExternalHistory: vi.fn(() => ({
    isLoading: false,
    deleteMessage: vi.fn().mockResolvedValue(undefined),
  })),
  toExportedMessageRepository: vi.fn(),
}));

import { useExternalHistory } from "./useExternalHistory";
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

const textOf = (message: any): string =>
  message.content
    .filter((part: any) => part.type === "text")
    .map((part: any) => part.text)
    .join("|");

describe("useAISDKRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useExternalHistory).mockReturnValue({
      isLoading: false,
      deleteMessage: vi.fn().mockResolvedValue(undefined),
    });
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
        runConfig: { custom: { model: "gpt-5.4-nano" } },
      });
    });

    await waitFor(() => {
      expect(chat.sendMessage).toHaveBeenCalledWith(expect.anything(), {
        metadata: { custom: { model: "gpt-5.4-nano" } },
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

  it("strips stale approval when cancelling a tool pending approval so history stays valid (#4195)", async () => {
    const chat = createChatHelpers([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "mcp_search",
            toolCallId: "tc-1",
            state: "approval-requested",
            input: { q: "hi" },
            approval: { id: "appr-1" },
          },
        ],
      },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBeGreaterThan(
        0,
      );
    });

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "what" }],
      });
    });

    await waitFor(() => {
      expect(chat.sendMessage).toHaveBeenCalledTimes(1);
    });

    const part = chat.messages[0].parts[0];
    expect(part.state).toBe("output-error");
    // The pending-approval object must not survive into the terminal state,
    // otherwise AI SDK's validateUIMessages rejects the next request.
    expect(part.approval).toBeUndefined();

    await expect(
      validateUIMessages({ messages: chat.messages }),
    ).resolves.toBeDefined();
  });

  it("forwards a successful tool result through addToolOutput, not the deprecated addToolResult", async () => {
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
        ],
      },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBeGreaterThan(
        0,
      );
    });

    act(() => {
      result.current.thread
        .getMessageById("a1")
        .getMessagePartByToolCallId("tc-1")
        .addToolResult({ temp: 72 });
    });

    await waitFor(() => {
      expect(chat.addToolOutput).toHaveBeenCalledTimes(1);
    });

    expect(chat.addToolOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: "weather",
        toolCallId: "tc-1",
        output: { temp: 72 },
        options: { metadata: undefined },
      }),
    );
    expect(chat.addToolResult).not.toHaveBeenCalled();
  });

  it("appends a new user message without sending when startRun is false", async () => {
    const chat = createChatHelpers([
      { id: "u1", role: "user", parts: [{ type: "text", text: "earlier" }] },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(1);
    });

    act(() => {
      result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "hold this" }],
        startRun: false,
      });
    });

    await waitFor(() => {
      expect(chat.setMessages).toHaveBeenCalled();
    });

    expect(chat.sendMessage).not.toHaveBeenCalled();
    expect(chat.messages).toHaveLength(2);
    expect(chat.messages[1]).toEqual(
      expect.objectContaining({
        role: "user",
        id: expect.any(String),
        parts: expect.arrayContaining([
          expect.objectContaining({ type: "text", text: "hold this" }),
        ]),
      }),
    );
  });

  it("edits without sending when startRun is false", async () => {
    const chat = createChatHelpers([
      { id: "u1", role: "user", parts: [{ type: "text", text: "first" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "first-answer" }],
      },
      { id: "u2", role: "user", parts: [{ type: "text", text: "second" }] },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(3);
    });

    act(() => {
      result.current.thread.append({
        role: "user",
        parentId: "u1",
        content: [{ type: "text", text: "rewrite, no run" }],
        startRun: false,
      });
    });

    await waitFor(() => {
      expect(chat.setMessages).toHaveBeenCalled();
    });

    expect(chat.sendMessage).not.toHaveBeenCalled();
    expect(chat.messages.map((m: any) => m.id)).toEqual([
      "u1",
      "a1",
      expect.any(String),
    ]);
    expect(chat.messages[2]).toEqual(
      expect.objectContaining({
        role: "user",
        parts: expect.arrayContaining([
          expect.objectContaining({ type: "text", text: "rewrite, no run" }),
        ]),
      }),
    );
  });

  it("deletes only the selected message from AI SDK state", async () => {
    const deleteMessage = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useExternalHistory).mockReturnValue({
      isLoading: false,
      deleteMessage,
    });
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
      expect(result.current.thread.getState().messages).toHaveLength(4);
    });

    await act(async () => {
      result.current.thread.getMessageById("u2").delete();
    });

    expect(deleteMessage).toHaveBeenCalledWith("u2");
    expect(chat.messages.map((message: any) => message.id)).toEqual([
      "u1",
      "a1",
      "a2",
    ]);
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
        runConfig: { custom: { temperature: 0.2 } },
      });
    });

    await waitFor(() => {
      expect(chat.sendMessage).toHaveBeenCalledTimes(1);
    });

    // sliceMessagesUntil("u1") keeps u1 + following assistant messages (a1)
    expect(chat.messages.map((m: any) => m.id)).toEqual(["u1", "a1"]);
    expect(chat.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user" }),
      { metadata: { custom: { temperature: 0.2 } } },
    );
  });

  it("forwards onResume so runtime.thread.resumeRun is delivered to the adapter", async () => {
    const chat = createChatHelpers([
      { id: "u1", role: "user", parts: [{ type: "text", text: "first" }] },
    ]);
    const onResume = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAISDKRuntime(chat, { onResume }));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(1);
    });

    act(() => {
      result.current.thread.resumeRun({
        parentId: "u1",
        runConfig: { custom: { turnId: "t-42" } },
      });
    });

    await waitFor(() => {
      expect(onResume).toHaveBeenCalledTimes(1);
    });

    expect(onResume).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: "u1",
        sourceId: null,
        runConfig: { custom: { turnId: "t-42" } },
      }),
    );
  });

  it("rejects when resumeRun is called without an onResume adapter", async () => {
    const chat = createChatHelpers([
      { id: "u1", role: "user", parts: [{ type: "text", text: "first" }] },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(1);
    });

    await expect(
      result.current.thread.resumeRun({
        parentId: "u1",
      }) as unknown as Promise<void>,
    ).rejects.toThrow("Runtime does not support resuming runs.");
  });

  it("forwards onResumeToolCall so runtime.thread.resumeToolCall is delivered to the adapter", async () => {
    const chat = createChatHelpers([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-weather",
            toolCallId: "tc-42",
            state: "input-available",
            input: { city: "NYC" },
          },
        ],
      },
    ]);
    const onResumeToolCall = vi.fn();

    const { result } = renderHook(() =>
      useAISDKRuntime(chat, { onResumeToolCall }),
    );

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBeGreaterThan(
        0,
      );
    });

    act(() => {
      result.current.thread
        .getMessageById("a1")
        .getMessagePartByToolCallId("tc-42")
        .resumeToolCall({ answer: "yes" });
    });

    expect(onResumeToolCall).toHaveBeenCalledTimes(1);
    expect(onResumeToolCall).toHaveBeenCalledWith({
      toolCallId: "tc-42",
      payload: { answer: "yes" },
    });
  });

  it("throws when resumeToolCall is called without an onResumeToolCall adapter", async () => {
    const chat = createChatHelpers([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-weather",
            toolCallId: "tc-missing",
            state: "input-available",
            input: { city: "NYC" },
          },
        ],
      },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBeGreaterThan(
        0,
      );
    });

    expect(() =>
      result.current.thread
        .getMessageById("a1")
        .getMessagePartByToolCallId("tc-missing")
        .resumeToolCall({ answer: "yes" }),
    ).toThrow("Tool call tc-missing is not waiting for resume.");
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
        runConfig: { custom: { maxTokens: 100 } },
      });
    });

    await waitFor(() => {
      expect(chat.regenerate).toHaveBeenCalledTimes(1);
    });

    expect(chat.messages.map((m: any) => m.id)).toEqual(["u1", "a1"]);
    expect(chat.regenerate).toHaveBeenCalledWith({
      metadata: { custom: { maxTokens: 100 } },
    });
  });

  it("forwards isDisabled to thread state", () => {
    const chat = createChatHelpers();
    const { result } = renderHook(() =>
      useAISDKRuntime(chat, { isDisabled: true }),
    );
    expect(result.current.thread.getState().isDisabled).toBe(true);
  });

  it("forwards isSendDisabled to the composer canSend gate", () => {
    const chat = createChatHelpers();
    const { result } = renderHook(() =>
      useAISDKRuntime(chat, { isSendDisabled: true }),
    );
    act(() => {
      result.current.thread.composer.setText("hello");
    });
    expect(result.current.thread.composer.getState().canSend).toBe(false);
  });

  it("forwards unstable_capabilities to thread capabilities", () => {
    const chat = createChatHelpers();
    const { result } = renderHook(() =>
      useAISDKRuntime(chat, { unstable_capabilities: { copy: false } }),
    );
    expect(result.current.thread.getState().capabilities.unstable_copy).toBe(
      false,
    );
  });

  it("forwards suggestions to thread state", () => {
    const chat = createChatHelpers();
    const suggestions = [{ prompt: "tell me a joke" }];
    const { result } = renderHook(() => useAISDKRuntime(chat, { suggestions }));
    expect(result.current.thread.getState().suggestions).toEqual(suggestions);
  });

  it("merges consecutive assistant messages into one turn by default", async () => {
    const chat = createChatHelpers([
      { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "first" }] },
      {
        id: "a2",
        role: "assistant",
        parts: [{ type: "text", text: "second" }],
      },
    ]);

    const { result } = renderHook(() => useAISDKRuntime(chat));

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(2);
    });

    const messages = result.current.thread.getState().messages;
    expect(messages.map((m: any) => m.role)).toEqual(["user", "assistant"]);
    expect(textOf(messages[1])).toBe("first|second");
  });

  it('keeps consecutive assistant messages separate when joinStrategy is "none"', async () => {
    const chat = createChatHelpers([
      { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "first" }] },
      {
        id: "a2",
        role: "assistant",
        parts: [{ type: "text", text: "second" }],
      },
    ]);

    const { result } = renderHook(() =>
      useAISDKRuntime(chat, { joinStrategy: "none" }),
    );

    await waitFor(() => {
      expect(result.current.thread.getState().messages.length).toBe(3);
    });

    const messages = result.current.thread.getState().messages;
    expect(messages.map((m: any) => m.role)).toEqual([
      "user",
      "assistant",
      "assistant",
    ]);
    expect(messages.slice(1).map(textOf)).toEqual(["first", "second"]);
  });
});
