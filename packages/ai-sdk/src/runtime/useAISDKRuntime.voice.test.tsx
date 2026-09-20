// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import {
  getExternalStoreMessages,
  type RealtimeVoiceAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/core";
import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

import { useAISDKRuntime } from "./useAISDKRuntime";

const createChatHelpers = (initialMessages: UIMessage[] = []) => {
  let currentMessages: UIMessage[] = initialMessages;
  const chatHelpers: any = {
    id: "chat-1",
    status: "ready",
    error: null,
    messages: currentMessages,
    setMessages: vi.fn(
      (next: UIMessage[] | ((current: UIMessage[]) => UIMessage[])) => {
        currentMessages =
          typeof next === "function" ? next(currentMessages) : [...next];
        chatHelpers.messages = currentMessages;
        return currentMessages;
      },
    ),
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

const createHistoryAdapter = () => {
  const append = vi.fn(async () => {});
  const adapter: ThreadHistoryAdapter = {
    load: vi.fn(),
    append: vi.fn(),
    withFormat: vi.fn().mockReturnValue({
      load: vi.fn().mockResolvedValue({ headId: null, messages: [] }),
      append,
    }),
  };
  return { adapter, append };
};

const textOf = (message: ThreadMessage) =>
  message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

const renderVoiceRuntime = async (
  chat: ReturnType<typeof createChatHelpers>,
  adapters: { voice: RealtimeVoiceAdapter; history?: ThreadHistoryAdapter },
) => {
  const rendered = renderHook(() => useAISDKRuntime(chat, { adapters }));
  await waitFor(() => {
    expect(rendered.result.current.thread.getState().capabilities.voice).toBe(
      true,
    );
  });
  return rendered;
};

describe("useAISDKRuntime voice transcripts", () => {
  it("persists finalized transcripts through the useChat messages", async () => {
    const chat = createChatHelpers();
    const voice = createVoiceAdapter();
    const { result, rerender } = await renderVoiceRuntime(chat, {
      voice: voice.adapter,
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
      expect(getExternalStoreMessages(messages[0]!)).toEqual([transcript]);
    });
  });

  it("keeps a transcript spoken after a typed reply as its own message", async () => {
    const chat = createChatHelpers([
      {
        id: "typed-user",
        role: "user",
        parts: [{ type: "text", text: "Hi" }],
      },
      {
        id: "typed-assistant",
        role: "assistant",
        parts: [{ type: "text", text: "Typed reply" }],
      },
    ]);
    const voice = createVoiceAdapter();
    const { result, rerender } = await renderVoiceRuntime(chat, {
      voice: voice.adapter,
    });

    act(() => {
      result.current.thread.connectVoice();
      voice.emitTranscript({
        role: "assistant",
        text: "Spoken reply",
        isFinal: true,
      });
    });
    const transcript = chat.messages[2];
    rerender();

    await waitFor(() => {
      const spoken = result.current.thread.getState().messages.at(-1)!;
      expect(getExternalStoreMessages(spoken)).toEqual([transcript]);
    });
    const messages = result.current.thread.getState().messages;
    expect(messages.map((message) => message.id)).toEqual([
      "typed-user",
      "typed-assistant",
      transcript.id,
    ]);
    expect(textOf(messages[1]!)).toBe("Typed reply");
    expect(messages[1]?.metadata.modality).toBeUndefined();
    expect(textOf(messages[2]!)).toBe("Spoken reply");
    expect(messages[2]?.metadata.modality).toBe("voice");
  });

  it("keeps consecutive assistant transcripts as separate messages", async () => {
    const chat = createChatHelpers();
    const voice = createVoiceAdapter();
    const { result, rerender } = await renderVoiceRuntime(chat, {
      voice: voice.adapter,
    });

    act(() => {
      result.current.thread.connectVoice();
      voice.emitTranscript({ role: "assistant", text: "First", isFinal: true });
      voice.emitTranscript({
        role: "assistant",
        text: "Second",
        isFinal: true,
      });
    });
    const [first, second] = chat.messages;
    rerender();

    await waitFor(() => {
      const messages = result.current.thread.getState().messages;
      expect(
        messages.map((message) => getExternalStoreMessages(message)),
      ).toEqual([[first], [second]]);
    });
    expect(result.current.thread.getState().messages.map(textOf)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("keeps the transcript in the thread after the session disconnects", async () => {
    const chat = createChatHelpers();
    const voice = createVoiceAdapter();
    const { result, rerender } = await renderVoiceRuntime(chat, {
      voice: voice.adapter,
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
    rerender();
    await waitFor(() => {
      const messages = result.current.thread.getState().messages;
      expect(getExternalStoreMessages(messages[0]!)).toEqual([transcript]);
    });

    act(() => {
      result.current.thread.disconnectVoice();
    });
    rerender();

    const messages = result.current.thread.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.id).toBe(transcript.id);
    expect(messages[0]?.metadata.modality).toBe("voice");
    expect(result.current.thread.getState().voice).toBeUndefined();
  });

  it("appends a finalized transcript to the history adapter without a text run", async () => {
    const chat = createChatHelpers();
    const voice = createVoiceAdapter();
    const history = createHistoryAdapter();
    const { result, rerender } = await renderVoiceRuntime(chat, {
      voice: voice.adapter,
      history: history.adapter,
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
    rerender();

    await waitFor(() => expect(history.append).toHaveBeenCalledTimes(1));
    expect(history.append).toHaveBeenCalledWith({
      parentId: null,
      message: transcript,
    });
  });
});
