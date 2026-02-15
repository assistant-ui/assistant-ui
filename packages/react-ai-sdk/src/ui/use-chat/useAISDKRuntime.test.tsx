// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
