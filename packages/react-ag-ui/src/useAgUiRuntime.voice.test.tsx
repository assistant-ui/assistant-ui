// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { HttpAgent, RunAgentInput } from "@ag-ui/client";
import type {
  RealtimeVoiceAdapter,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { useAgUiRuntime } from "./useAgUiRuntime";

type Subscriber = {
  onMessagesSnapshotEvent?: (payload: { event: unknown }) => void;
  onRunFinalized?: () => void;
};

const priorMessage: ThreadMessage = {
  id: "prior",
  role: "user",
  content: [{ type: "text", text: "Before voice" }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
};

const createHistory = () => ({
  load: vi.fn<ThreadHistoryAdapter["load"]>().mockResolvedValue({
    headId: priorMessage.id,
    messages: [{ parentId: null, message: priorMessage }],
  }),
  append: vi.fn<ThreadHistoryAdapter["append"]>().mockResolvedValue(undefined),
});

const createVoiceAdapter = (
  sendText?: RealtimeVoiceAdapter.Session["sendText"],
) => {
  let transcriptCallback:
    | ((transcript: RealtimeVoiceAdapter.TranscriptItem) => void)
    | undefined;
  const session: RealtimeVoiceAdapter.Session = {
    status: { type: "running" },
    isMuted: false,
    disconnect: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    ...(sendText && { sendText }),
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

const renderVoiceRuntime = async ({
  history = createHistory(),
  sendText,
  onRun,
}: {
  history?: ReturnType<typeof createHistory>;
  sendText?: RealtimeVoiceAdapter.Session["sendText"];
  onRun?: (input: RunAgentInput, subscriber: Subscriber) => void;
} = {}) => {
  const voice = createVoiceAdapter(sendText);
  const runAgent = vi.fn(
    async (input: RunAgentInput, subscriber: Subscriber) => {
      onRun?.(input, subscriber);
      subscriber.onRunFinalized?.();
    },
  );
  const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
  const rendered = renderHook(() =>
    useAgUiRuntime({ agent, adapters: { voice: voice.adapter, history } }),
  );
  await waitFor(() => {
    expect(rendered.result.current.thread.getState().isLoading).toBe(false);
  });
  return { ...rendered, voice, history, runAgent };
};

const emitTranscripts = (
  runtime: ReturnType<typeof useAgUiRuntime>,
  voice: ReturnType<typeof createVoiceAdapter>,
) => {
  let user!: ThreadMessage;
  let assistant!: ThreadMessage;
  act(() => {
    runtime.thread.connectVoice();
    voice.emitTranscript({
      role: "user",
      text: "Spoken question",
      isFinal: true,
    });
    user = runtime.thread.getState().messages.at(-1)!;
    voice.emitTranscript({
      role: "assistant",
      text: "Spoken answer",
      isFinal: true,
    });
    assistant = runtime.thread.getState().messages.at(-1)!;
  });
  return { user, assistant };
};

afterEach(() => cleanup());

describe("useAgUiRuntime voice transcripts", () => {
  it("keeps finalized transcripts under their runtime ids after disconnecting", async () => {
    const { result, voice, history, runAgent } = await renderVoiceRuntime();
    const { user, assistant } = emitTranscripts(result.current, voice);

    expect(user.metadata.modality).toBe("voice");
    expect(assistant.metadata.modality).toBe("voice");
    expect(result.current.thread.getState().messages.map((m) => m.id)).toEqual([
      priorMessage.id,
      user.id,
      assistant.id,
    ]);
    expect(history.append).toHaveBeenCalledTimes(2);
    expect(history.append).toHaveBeenNthCalledWith(1, {
      parentId: priorMessage.id,
      message: user,
    });
    expect(history.append).toHaveBeenNthCalledWith(2, {
      parentId: user.id,
      message: assistant,
    });
    expect(history.append.mock.calls[0]?.[0].message).toBe(user);
    expect(history.append.mock.calls[1]?.[0].message).toBe(assistant);

    act(() => result.current.thread.disconnectVoice());

    const messages = result.current.thread.getState().messages;
    expect(messages).toEqual([priorMessage, user, assistant]);
    expect(messages[1]).toBe(user);
    expect(messages[2]).toBe(assistant);
    expect(result.current.thread.getState().voice).toBeUndefined();
    expect(history.append).toHaveBeenCalledTimes(2);
    expect(runAgent).not.toHaveBeenCalled();
  });

  it("sends both transcripts as ordinary text before the next typed turn", async () => {
    const { result, voice, runAgent } = await renderVoiceRuntime();
    const { user, assistant } = emitTranscripts(result.current, voice);
    expect(runAgent).not.toHaveBeenCalled();
    act(() => result.current.thread.disconnectVoice());

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "Next question" }],
      });
    });

    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(runAgent.mock.calls[0]?.[0].messages).toEqual([
      { id: priorMessage.id, role: "user", content: "Before voice" },
      { id: user.id, role: "user", content: "Spoken question" },
      { id: assistant.id, role: "assistant", content: "Spoken answer" },
      { id: expect.any(String), role: "user", content: "Next question" },
    ]);
  });

  it("persists text sent into the voice session without a voice modality", async () => {
    const sendText = vi.fn(async (_text: string) => {});
    const { result, history, runAgent } = await renderVoiceRuntime({
      sendText,
    });
    act(() => result.current.thread.connectVoice());

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "Typed during voice" }],
      });
    });

    const typed = result.current.thread.getState().messages.at(-1)!;
    expect(sendText).toHaveBeenCalledExactlyOnceWith("Typed during voice");
    expect(typed.role).toBe("user");
    expect(typed.content).toEqual([
      { type: "text", text: "Typed during voice" },
    ]);
    expect(typed.metadata.modality).toBeUndefined();
    expect(history.append).toHaveBeenCalledExactlyOnceWith({
      parentId: priorMessage.id,
      message: typed,
    });
    expect(history.append.mock.calls[0]?.[0].message).toBe(typed);
    expect(runAgent).not.toHaveBeenCalled();

    act(() => result.current.thread.disconnectVoice());
    expect(result.current.thread.getState().messages).toEqual([
      priorMessage,
      typed,
    ]);

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "After voice" }],
      });
    });
    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(runAgent.mock.calls[0]?.[0].messages).toEqual([
      { id: priorMessage.id, role: "user", content: "Before voice" },
      { id: typed.id, role: "user", content: "Typed during voice" },
      { id: expect.any(String), role: "user", content: "After voice" },
    ]);
  });

  it.each([false, true])(
    "preserves voice modality through snapshot echoes with reparenting %s",
    async (reparent) => {
      const { result, voice, history } = await renderVoiceRuntime({
        onRun: (input, subscriber) => {
          const messages = (
            reparent ? input.messages.slice(1) : input.messages
          ).map((message) =>
            message.content === "Spoken question" ||
            message.content === "Spoken answer"
              ? { ...message, content: `Echoed ${message.role}` }
              : message,
          );
          subscriber.onMessagesSnapshotEvent?.({
            event: { type: "MESSAGES_SNAPSHOT", messages },
          });
          subscriber.onMessagesSnapshotEvent?.({
            event: { type: "MESSAGES_SNAPSHOT", messages },
          });
        },
      });
      const { user, assistant } = emitTranscripts(result.current, voice);
      act(() => result.current.thread.disconnectVoice());

      await act(async () => {
        await result.current.thread.append({
          role: "user",
          content: [{ type: "text", text: "Echo the conversation" }],
        });
      });

      const messages = result.current.thread.getState().messages;
      for (const transcript of [user, assistant]) {
        const copies = messages.filter(
          (message) => message.id === transcript.id,
        );
        expect(copies).toHaveLength(1);
        expect(copies[0]).toMatchObject({
          id: transcript.id,
          role: transcript.role,
          content: [{ type: "text", text: `Echoed ${transcript.role}` }],
          metadata: { modality: "voice" },
        });
        expect(
          history.append.mock.calls.filter(
            ([item]) => item.message.id === transcript.id,
          ),
        ).toHaveLength(1);
      }
      expect(
        messages.find((message) => message.id === priorMessage.id)?.metadata
          .modality,
      ).toBeUndefined();
    },
  );

  it("appends a transcript after history finishes loading", async () => {
    const history = createHistory();
    let finishLoad!: (
      repository: Awaited<ReturnType<ThreadHistoryAdapter["load"]>>,
    ) => void;
    history.load.mockReturnValueOnce(
      new Promise((resolve) => {
        finishLoad = resolve;
      }),
    );
    const voice = createVoiceAdapter();
    const runAgent = vi.fn();
    const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
    const { result } = renderHook(() =>
      useAgUiRuntime({
        agent,
        adapters: { voice: voice.adapter, history },
      }),
    );
    expect(result.current.thread.getState().isLoading).toBe(true);
    act(() => {
      result.current.thread.connectVoice();
      voice.emitTranscript({
        role: "user",
        text: "During loading",
        isFinal: true,
      });
    });
    const transcript = result.current.thread.getState().messages.at(-1)!;
    expect(history.append).not.toHaveBeenCalled();

    await act(async () => {
      finishLoad({
        headId: priorMessage.id,
        messages: [{ parentId: null, message: priorMessage }],
      });
    });
    expect(history.append).toHaveBeenCalledExactlyOnceWith({
      parentId: priorMessage.id,
      message: transcript,
    });
    act(() => result.current.thread.disconnectVoice());
    expect(result.current.thread.getState().messages).toEqual([
      priorMessage,
      transcript,
    ]);
    expect(runAgent).not.toHaveBeenCalled();
  });

  it.each(["interrupt", "tool-calls"] as const)(
    "leaves a pending %s unchanged when transcripts await history",
    async (reason) => {
      const pending: ThreadAssistantMessage = {
        id: "pending",
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "confirm",
            args: {},
            argsText: "{}",
          },
        ],
        createdAt: new Date(0),
        status: { type: "requires-action", reason },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom:
            reason === "interrupt"
              ? {
                  agui: {
                    interrupts: [{ id: "approval-1", reason: "confirmation" }],
                  },
                }
              : {},
        },
      };
      const history = createHistory();
      let finishLoad!: (
        repository: Awaited<ReturnType<ThreadHistoryAdapter["load"]>>,
      ) => void;
      history.load.mockReturnValueOnce(
        new Promise((resolve) => {
          finishLoad = resolve;
        }),
      );
      const voice = createVoiceAdapter();
      const runAgent = vi.fn();
      const agent = { runAgent, abortRun: vi.fn() } as unknown as HttpAgent;
      const { result } = renderHook(() =>
        useAgUiRuntime({
          agent,
          adapters: { voice: voice.adapter, history },
        }),
      );
      const { user, assistant } = emitTranscripts(result.current, voice);
      expect(history.append).not.toHaveBeenCalled();
      await act(async () => {
        finishLoad({
          headId: pending.id,
          messages: [{ parentId: null, message: pending }],
        });
      });
      act(() => result.current.thread.disconnectVoice());

      expect(result.current.thread.getState().messages).toEqual([
        pending,
        user,
        assistant,
      ]);
      expect(result.current.thread.getState().messages[0]).toBe(pending);
      expect(history.append).toHaveBeenCalledTimes(2);
      expect(history.append).toHaveBeenNthCalledWith(1, {
        parentId: pending.id,
        message: user,
      });
      expect(runAgent).not.toHaveBeenCalled();
    },
  );
});
