// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import type { RealtimeVoiceAdapter } from "@assistant-ui/core";
import { describe, expect, it, vi } from "vitest";

vi.mock("./useExternalHistory", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./useExternalHistory")>();
  return {
    ...original,
    useExternalHistory: vi.fn(() => ({
      isLoading: false,
      deleteMessage: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

import { useAISDKRuntime } from "./useAISDKRuntime";

const createChatHelpers = () => {
  let currentMessages: any[] = [];
  const chatHelpers: any = {
    id: "chat-1",
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

const createVoiceAdapter = () => {
  let transcriptCallback:
    | ((transcript: RealtimeVoiceAdapter.TranscriptItem) => void)
    | undefined;
  const session: RealtimeVoiceAdapter.Session = {
    status: { type: "running" },
    isMuted: false,
    disconnect: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    onStatusChange: () => () => {},
    onTranscript: (callback) => {
      transcriptCallback = callback;
      return () => {
        transcriptCallback = undefined;
      };
    },
    onModeChange: () => () => {},
    onVolumeChange: () => () => {},
  };
  return {
    adapter: { connect: () => session } satisfies RealtimeVoiceAdapter,
    emitTranscript: (transcript: RealtimeVoiceAdapter.TranscriptItem) =>
      transcriptCallback?.(transcript),
  };
};

describe("useAISDKRuntime voice transcripts", () => {
  it("persists finalized transcripts through the useChat messages", async () => {
    const chat = createChatHelpers();
    const voice = createVoiceAdapter();
    const { result, rerender } = renderHook(() =>
      useAISDKRuntime(chat, { adapters: { voice: voice.adapter } }),
    );

    await waitFor(() => {
      expect(result.current.thread.getState().capabilities.voice).toBe(true);
    });

    act(() => {
      result.current.thread.connectVoice();
      voice.emitTranscript({
        role: "assistant",
        text: "Spoken reply",
        isFinal: true,
      });
    });

    const transcript = chat.messages[0];
    expect(transcript).toEqual({
      id: expect.any(String),
      role: "assistant",
      parts: [{ type: "text", text: "Spoken reply" }],
      metadata: { modality: "voice" },
    });

    rerender();

    await waitFor(() => {
      const messages = result.current.thread
        .getState()
        .messages.filter((message) => message.id === transcript.id);
      expect(messages).toHaveLength(1);
      expect(messages[0]?.metadata.modality).toBe("voice");
    });
  });
});
