// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useChat } from "@ai-sdk/react";
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

vi.mock("./useExternalHistory", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./useExternalHistory")>();
  return {
    ...original,
    useExternalHistory: vi.fn(() => ({
      isLoading: false,
      deleteMessage: vi.fn().mockResolvedValue(undefined),
      persistToolInteractions: vi.fn().mockResolvedValue(undefined),
      persistToolApprovalResponses: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

import { useAISDKRuntime } from "./useAISDKRuntime";

const text = (id: string, role: UIMessage["role"], value: string) =>
  ({ id, role, parts: [{ type: "text", text: value }] }) as UIMessage;

const makeTransport = () => {
  const sent: string[][] = [];
  const transport: ChatTransport<UIMessage> = {
    async sendMessages({ messages }) {
      sent.push(messages.map((message) => message.id));
      const chunks: UIMessageChunk[] = [
        { type: "start", messageId: "regenerated" },
        { type: "text-start", id: "t" },
        { type: "text-delta", id: "t", delta: "new" },
        { type: "text-end", id: "t" },
        { type: "finish" },
      ];
      return new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(chunk);
          controller.close();
        },
      });
    },
    async reconnectToStream() {
      return null;
    },
  };
  return { transport, sent };
};

const setup = (
  initial: UIMessage[],
  options: Parameters<typeof useAISDKRuntime>[1] = {},
) => {
  const { transport, sent } = makeTransport();
  const { result } = renderHook(() => {
    const chat = useChat({ messages: initial, transport });
    const runtime = useAISDKRuntime(chat, options);
    return { chat, runtime };
  });
  return { result, sent };
};

describe("useAISDKRuntime reload and edit of a joined response", () => {
  it("does not send any part of the response being reloaded", async () => {
    const { result, sent } = setup([
      text("u1", "user", "hi"),
      text("a1", "assistant", "old-1"),
      text("a2", "assistant", "old-2"),
    ]);
    await waitFor(() =>
      expect(result.current.runtime.thread.getState().messages).toHaveLength(2),
    );
    const assistant = result.current.runtime.thread.getState().messages[1]!;

    act(() => {
      result.current.runtime.thread.getMessageById(assistant.id).reload();
    });

    await waitFor(() => expect(sent).toHaveLength(1));
    await waitFor(() => expect(result.current.chat.status).toBe("ready"));
    expect(sent[0]).toEqual(["u1"]);
    expect(result.current.chat.messages.map((m) => m.id)).toEqual([
      "u1",
      "regenerated",
    ]);
  });

  it('does not send the reloaded message with joinStrategy "none"', async () => {
    const { result, sent } = setup(
      [
        text("u1", "user", "hi"),
        text("a1", "assistant", "old-1"),
        text("a2", "assistant", "old-2"),
      ],
      { joinStrategy: "none" },
    );
    await waitFor(() =>
      expect(result.current.runtime.thread.getState().messages).toHaveLength(3),
    );

    act(() => {
      result.current.runtime.thread.getMessageById("a1").reload();
    });

    await waitFor(() => expect(sent).toHaveLength(1));
    await waitFor(() => expect(result.current.chat.status).toBe("ready"));
    expect(sent[0]).toEqual(["u1"]);
  });

  it("replaces every part of a joined response when it is edited", async () => {
    const { result, sent } = setup([
      text("u1", "user", "hi"),
      text("a1", "assistant", "old-1"),
      text("a2", "assistant", "old-2"),
    ]);
    await waitFor(() =>
      expect(result.current.runtime.thread.getState().messages).toHaveLength(2),
    );
    const assistant = result.current.runtime.thread.getState().messages[1]!;
    const composer = result.current.runtime.thread.getMessageById(
      assistant.id,
    ).composer;

    act(() => {
      composer.beginEdit();
      composer.setText("edited");
    });
    await act(async () => {
      await composer.send();
    });

    await waitFor(() =>
      expect(result.current.chat.messages.map((m) => m.role)).toEqual([
        "user",
        "assistant",
      ]),
    );
    expect(result.current.chat.messages[1]!.parts).toEqual([
      expect.objectContaining({ type: "text", text: "edited" }),
    ]);
    expect(sent).toEqual([]);
  });

  it("keeps every part of a joined response that a new branch follows", async () => {
    const { result, sent } = setup([
      text("u1", "user", "hi"),
      text("a1", "assistant", "part-1"),
      text("a2", "assistant", "part-2"),
      text("u2", "user", "next"),
      text("a3", "assistant", "answer"),
    ]);
    await waitFor(() =>
      expect(result.current.runtime.thread.getState().messages).toHaveLength(4),
    );
    const assistant = result.current.runtime.thread.getState().messages[1]!;

    act(() => {
      result.current.runtime.thread.append({
        role: "user",
        parentId: assistant.id,
        content: [{ type: "text", text: "rewritten" }],
      });
    });

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]!.slice(0, 3)).toEqual(["u1", "a1", "a2"]);
    expect(sent[0]).toHaveLength(4);
  });
});
