// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import type {
  RealtimeVoiceAdapter,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { getThreadMessageText } from "@assistant-ui/core/internal";
import { describe, expect, it, vi } from "vitest";
import type { A2AClient } from "./A2AClient";
import type { A2AStreamEvent } from "./types";
import { a2aExtras } from "./a2aExtras";
import { useA2ARuntime } from "./useA2ARuntime";

const createMockClient = () => {
  const mocks = {
    getAgentCard: vi.fn().mockResolvedValue(undefined),
    streamMessage: vi.fn(
      (_message: unknown): AsyncIterable<A2AStreamEvent> => ({
        async *[Symbol.asyncIterator]() {
          yield {
            type: "task",
            task: {
              id: "task-1",
              contextId: "existing-context",
              status: {
                state: "completed",
                message: {
                  messageId: "response",
                  role: "agent",
                  parts: [{ text: "Done" }],
                },
              },
              artifacts: [
                { artifactId: "artifact-1", parts: [{ text: "Artifact" }] },
              ],
            },
          };
        },
      }),
    ),
    sendMessage: vi.fn(),
    cancelTask: vi.fn(),
    getTask: vi.fn(),
    listTasks: vi.fn(),
    subscribeToTask: vi.fn(),
    getExtendedAgentCard: vi.fn(),
    createTaskPushNotificationConfig: vi.fn(),
    getTaskPushNotificationConfig: vi.fn(),
    listTaskPushNotificationConfigs: vi.fn(),
    deleteTaskPushNotificationConfig: vi.fn(),
  };
  return { client: mocks as unknown as A2AClient, mocks };
};

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

const priorMessage: ThreadMessage = {
  id: "prior-head",
  role: "user",
  content: [{ type: "text", text: "Earlier turn" }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
};

const createHistory = () => ({
  load: vi.fn().mockResolvedValue({
    headId: priorMessage.id,
    messages: [{ parentId: null, message: priorMessage }],
  }),
  append: vi.fn<ThreadHistoryAdapter["append"]>().mockResolvedValue(undefined),
});

const renderVoiceRuntime = async (
  options: {
    history?: ThreadHistoryAdapter;
    sendText?: RealtimeVoiceAdapter.Session["sendText"];
  } = {},
) => {
  const { client, mocks } = createMockClient();
  const voice = createVoiceAdapter(options.sendText);
  const rendered = renderHook(() =>
    useA2ARuntime({
      client,
      adapters: {
        voice: voice.adapter,
        ...(options.history && { history: options.history }),
      },
    }),
  );
  await waitFor(() => {
    expect(rendered.result.current.thread.getState().isLoading).toBe(false);
    expect(rendered.result.current.thread.getState().capabilities.voice).toBe(
      true,
    );
    expect(mocks.getAgentCard).toHaveBeenCalledOnce();
  });
  return { ...rendered, mocks, voice };
};

describe("useA2ARuntime voice transcripts", () => {
  it("keeps finalized user and assistant transcripts unchanged after disconnect", async () => {
    const { result, voice, mocks } = await renderVoiceRuntime();
    const callsBefore = Object.values(mocks).map(
      (mock) => mock.mock.calls.length,
    );
    let user!: ThreadMessage;
    let assistant!: ThreadMessage;

    act(() => {
      result.current.thread.connectVoice();
      voice.emitTranscript({
        role: "user",
        text: "Spoken user",
        isFinal: true,
      });
      user = result.current.thread.getState().messages.at(-1)!;
      voice.emitTranscript({
        role: "assistant",
        text: "Spoken assistant",
        isFinal: true,
      });
      assistant = result.current.thread.getState().messages.at(-1)!;
    });

    expect(user).toMatchObject({
      id: expect.any(String),
      role: "user",
      content: [{ type: "text", text: "Spoken user" }],
      metadata: { modality: "voice" },
    });
    expect(assistant).toMatchObject({
      id: expect.any(String),
      role: "assistant",
      content: [{ type: "text", text: "Spoken assistant" }],
      metadata: { modality: "voice" },
    });
    expect(user.id).not.toBe(assistant.id);
    expect(result.current.thread.getState().messages.map((m) => m.id)).toEqual([
      user.id,
      assistant.id,
    ]);

    act(() => result.current.thread.disconnectVoice());

    const messages = result.current.thread.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0]).toBe(user);
    expect(messages[1]).toBe(assistant);
    expect(messages[0]?.metadata).toBe(user.metadata);
    expect(messages[1]?.metadata).toBe(assistant.metadata);
    expect(result.current.thread.getState().voice).toBeUndefined();
    expect(Object.values(mocks).map((mock) => mock.mock.calls.length)).toEqual(
      callsBefore,
    );
  });

  it("appends each transcript once to history under the current head", async () => {
    const history = createHistory();
    const { result, voice } = await renderVoiceRuntime({ history });

    act(() => {
      result.current.thread.connectVoice();
      voice.emitTranscript({
        role: "user",
        text: "Spoken user",
        isFinal: true,
      });
      voice.emitTranscript({
        role: "assistant",
        text: "Spoken assistant",
        isFinal: true,
      });
    });

    const [, user, assistant] = result.current.thread.getState().messages;
    expect(history.append).toHaveBeenCalledTimes(2);
    expect(history.append).toHaveBeenNthCalledWith(1, {
      parentId: priorMessage.id,
      message: user,
    });
    expect(history.append).toHaveBeenNthCalledWith(2, {
      parentId: user!.id,
      message: assistant,
    });
    expect(history.append.mock.calls[0]![0].message).toBe(user);
    expect(history.append.mock.calls[1]![0].message).toBe(assistant);

    act(() => result.current.thread.disconnectVoice());

    expect(result.current.thread.export()).toEqual({
      headId: assistant!.id,
      messages: [
        { parentId: null, message: priorMessage },
        { parentId: priorMessage.id, message: user },
        { parentId: user!.id, message: assistant },
      ],
    });
    expect(history.append).toHaveBeenCalledTimes(2);
  });

  it("restores persisted transcripts when the next runtime loads its history", async () => {
    const appended: Parameters<ThreadHistoryAdapter["append"]>[0][] = [];
    const firstHistory = createHistory();
    firstHistory.append.mockImplementation(async (item) => {
      appended.push(item);
    });
    const first = await renderVoiceRuntime({ history: firstHistory });
    act(() => {
      first.result.current.thread.connectVoice();
      first.voice.emitTranscript({
        role: "user",
        text: "Spoken user",
        isFinal: true,
      });
      first.voice.emitTranscript({
        role: "assistant",
        text: "Spoken assistant",
        isFinal: true,
      });
    });
    act(() => first.result.current.thread.disconnectVoice());
    first.unmount();

    const secondHistory = createHistory();
    secondHistory.load.mockResolvedValue({
      headId: appended.at(-1)!.message.id,
      messages: [{ parentId: null, message: priorMessage }, ...appended],
    });
    const second = await renderVoiceRuntime({ history: secondHistory });

    expect(
      second.result.current.thread
        .getState()
        .messages.map((message) => [
          message.id,
          message.role,
          getThreadMessageText(message),
          message.metadata.modality,
        ]),
    ).toEqual([
      [priorMessage.id, "user", "Earlier turn", undefined],
      [appended[0]!.message.id, "user", "Spoken user", "voice"],
      [appended[1]!.message.id, "assistant", "Spoken assistant", "voice"],
    ]);
  });

  it("preserves A2A state and sends only the next typed turn with the existing context", async () => {
    const { result, voice, mocks } = await renderVoiceRuntime();
    await act(async () => {
      await result.current.thread.append("First typed turn");
    });
    expect(mocks.streamMessage).toHaveBeenCalledOnce();
    const before = a2aExtras.tryGet(result.current.thread.getState().extras)!;
    expect(before.task?.id).toBe("task-1");
    expect(before.artifacts).toHaveLength(1);
    const callsBefore = Object.values(mocks).map(
      (mock) => mock.mock.calls.length,
    );

    act(() => {
      result.current.thread.connectVoice();
      voice.emitTranscript({
        role: "user",
        text: "Spoken user",
        isFinal: true,
      });
      voice.emitTranscript({
        role: "assistant",
        text: "Spoken assistant",
        isFinal: true,
      });
    });

    const after = a2aExtras.tryGet(result.current.thread.getState().extras)!;
    expect(after.task).toBe(before.task);
    expect(after.artifacts).toBe(before.artifacts);
    expect(Object.values(mocks).map((mock) => mock.mock.calls.length)).toEqual(
      callsBefore,
    );

    act(() => result.current.thread.disconnectVoice());
    expect(result.current.thread.getState().isRunning).toBe(false);
    expect(result.current.thread.getState().messages).toHaveLength(4);

    await act(async () => {
      await result.current.thread.append("Next typed turn");
    });

    expect(mocks.streamMessage).toHaveBeenCalledTimes(2);
    expect(mocks.streamMessage.mock.calls[1]![0]).toMatchObject({
      role: "user",
      parts: [{ text: "Next typed turn" }],
      contextId: "existing-context",
    });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.cancelTask).not.toHaveBeenCalled();
  });

  it("persists text sent into the voice session without voice modality or an A2A call", async () => {
    const history = createHistory();
    const sendText = vi.fn(async (_text: string) => {});
    const { result, mocks } = await renderVoiceRuntime({ history, sendText });
    const callsBefore = Object.values(mocks).map(
      (mock) => mock.mock.calls.length,
    );

    act(() => result.current.thread.connectVoice());
    await act(async () => {
      await result.current.thread.append("Typed into voice");
    });

    expect(sendText).toHaveBeenCalledExactlyOnceWith("Typed into voice");
    const typed = result.current.thread.getState().messages.at(-1)!;
    expect(typed).toMatchObject({
      id: expect.any(String),
      role: "user",
      content: [{ type: "text", text: "Typed into voice" }],
    });
    expect(typed.metadata.modality).toBeUndefined();
    expect(result.current.thread.getState().messages.map((m) => m.id)).toEqual([
      priorMessage.id,
      typed.id,
    ]);
    expect(history.append).toHaveBeenCalledExactlyOnceWith({
      parentId: priorMessage.id,
      message: typed,
    });
    expect(history.append.mock.calls[0]![0].message).toBe(typed);

    act(() => result.current.thread.disconnectVoice());

    expect(result.current.thread.getState().messages).toHaveLength(2);
    expect(result.current.thread.getState().messages[1]).toBe(typed);
    expect(history.append).toHaveBeenCalledOnce();
    expect(Object.values(mocks).map((mock) => mock.mock.calls.length)).toEqual(
      callsBefore,
    );
  });
});
