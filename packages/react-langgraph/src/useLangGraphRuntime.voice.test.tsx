import { describe, expect, it, vi } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import type {
  AppendMessage,
  AssistantRuntime,
  RealtimeVoiceAdapter,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { getThreadMessageText } from "@assistant-ui/core/internal";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
import { mockStreamCallbackFactory } from "./testUtils";
import type { LangChainMessage } from "./types";
import type { LangGraphStreamCallback } from "./useLangGraphMessages";

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

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "lg-thread-1",
        externalId: "lg-thread-1",
        title: "Existing LangGraph thread",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "lg-thread-1",
    externalId: "lg-thread-1",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream()),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "lg-thread-1",
    externalId: "lg-thread-1",
    title: "Existing LangGraph thread",
  })),
});

const echoValues =
  (reply: (index: number) => LangChainMessage[]) =>
  (
    history: () => LangChainMessage[],
  ): LangGraphStreamCallback<LangChainMessage> => {
    let runs = 0;
    return (messages) => {
      const index = runs++;
      return mockStreamCallbackFactory([
        {
          event: "values",
          data: { messages: [...history(), ...messages, ...reply(index)] },
        },
      ])();
    };
  };

const renderVoiceRuntime = async (
  options: Omit<Parameters<typeof useLangGraphRuntime>[0], "adapters"> & {
    voice: ReturnType<typeof createVoiceAdapter>;
  },
) => {
  const { voice, ...runtimeOptions } = options;
  const rendered = renderHook(() =>
    useLangGraphRuntime({
      ...runtimeOptions,
      adapters: { voice: voice.adapter },
    }),
  );
  render(
    <AssistantRuntimeProvider runtime={rendered.result.current}>
      {null}
    </AssistantRuntimeProvider>,
  );
  await waitFor(() =>
    expect(rendered.result.current.thread.getState().capabilities.voice).toBe(
      true,
    ),
  );
  return rendered;
};

const rowsOf = (runtime: AssistantRuntime) =>
  runtime.thread
    .getState()
    .messages.map((message) => [
      message.role,
      getThreadMessageText(message),
      message.metadata.modality,
    ]);

const speak = (
  runtime: AssistantRuntime,
  voice: ReturnType<typeof createVoiceAdapter>,
  turns: readonly Pick<RealtimeVoiceAdapter.TranscriptItem, "role" | "text">[],
) => {
  act(() => {
    runtime.thread.connectVoice();
    for (const turn of turns) voice.emitTranscript({ ...turn, isFinal: true });
  });
  const messages = runtime.thread.getState().messages;
  const spoken = messages.slice(messages.length - turns.length);
  act(() => runtime.thread.disconnectVoice());
  return spoken;
};

const spokenTurns = [
  { role: "user", text: "Spoken question" },
  { role: "assistant", text: "Spoken answer" },
] as const;

describe("useLangGraphRuntime voice transcripts", () => {
  it("keeps finalized transcripts as spoken messages after the session ends", async () => {
    const voice = createVoiceAdapter();
    const stream = vi.fn<LangGraphStreamCallback<LangChainMessage>>(() =>
      mockStreamCallbackFactory([])(),
    );
    const { result } = await renderVoiceRuntime({ stream, voice });

    const [user, assistant] = speak(result.current, voice, spokenTurns);

    const messages = result.current.thread.getState().messages;
    expect(messages.map((message) => message.id)).toEqual([
      user!.id,
      assistant!.id,
    ]);
    expect(rowsOf(result.current)).toEqual([
      ["user", "Spoken question", "voice"],
      ["assistant", "Spoken answer", "voice"],
    ]);
    expect(stream).not.toHaveBeenCalled();
  });

  it("sends unsent transcripts with the next run, ahead of the new message, once", async () => {
    const voice = createVoiceAdapter();
    const stream = vi.fn<LangGraphStreamCallback<LangChainMessage>>(() =>
      mockStreamCallbackFactory([])(),
    );
    const { result } = await renderVoiceRuntime({ stream, voice });
    const [user, assistant] = speak(result.current, voice, spokenTurns);

    await act(async () => {
      await result.current.thread.append("Next question");
    });
    await act(async () => {
      await result.current.thread.append("Another question");
    });

    expect(stream).toHaveBeenCalledTimes(2);
    expect(stream.mock.calls[0]![0]).toEqual([
      {
        id: user!.id,
        type: "human",
        content: "Spoken question",
        additional_kwargs: { modality: "voice" },
      },
      {
        id: assistant!.id,
        type: "ai",
        content: "Spoken answer",
        additional_kwargs: { modality: "voice" },
      },
      { id: expect.any(String), type: "human", content: "Next question" },
    ]);
    expect(stream.mock.calls[1]![0]).toEqual([
      { id: expect.any(String), type: "human", content: "Another question" },
    ]);
  });

  it("keeps each transcript once and spoken when the run echoes it back", async () => {
    const voice = createVoiceAdapter();
    const stream = vi.fn(
      echoValues(() => [{ id: "reply", type: "ai", content: "Typed reply" }])(
        () => [],
      ),
    );
    const { result } = await renderVoiceRuntime({ stream, voice });
    speak(result.current, voice, spokenTurns);

    await act(async () => {
      await result.current.thread.append("Next question");
    });

    expect(rowsOf(result.current)).toEqual([
      ["user", "Spoken question", "voice"],
      ["assistant", "Spoken answer", "voice"],
      ["user", "Next question", undefined],
      ["assistant", "Typed reply", undefined],
    ]);
  });

  it("keeps an assistant transcript apart from the assistant message before it", async () => {
    const voice = createVoiceAdapter();
    const stream = vi.fn(
      echoValues(() => [{ id: "greeting", type: "ai", content: "Hello" }])(
        () => [],
      ),
    );
    const { result } = await renderVoiceRuntime({ stream, voice });
    await act(async () => {
      await result.current.thread.append("Hi");
    });

    const [spoken] = speak(result.current, voice, [
      { role: "assistant", text: "Spoken follow up" },
    ]);

    const messages = result.current.thread.getState().messages;
    expect(messages.at(-1)!.id).toBe(spoken!.id);
    expect(rowsOf(result.current)).toEqual([
      ["user", "Hi", undefined],
      ["assistant", "Hello", undefined],
      ["assistant", "Spoken follow up", "voice"],
    ]);
  });

  it("sends text typed into the session as a plain human message", async () => {
    const voice = createVoiceAdapter(async () => {});
    const stream = vi.fn<LangGraphStreamCallback<LangChainMessage>>(() =>
      mockStreamCallbackFactory([])(),
    );
    const { result } = await renderVoiceRuntime({ stream, voice });

    act(() => result.current.thread.connectVoice());
    await act(async () => {
      await result.current.thread.append("Typed during the call");
    });
    const typed = result.current.thread.getState().messages.at(-1)!;
    act(() => result.current.thread.disconnectVoice());

    expect(typed.metadata.modality).toBeUndefined();
    expect(rowsOf(result.current)).toEqual([
      ["user", "Typed during the call", undefined],
    ]);

    await act(async () => {
      await result.current.thread.append("After the call");
    });
    expect(stream.mock.calls[0]![0]).toEqual([
      { id: typed.id, type: "human", content: "Typed during the call" },
      { id: expect.any(String), type: "human", content: "After the call" },
    ]);
  });

  it("forks an edit of the turn after the transcripts from before them and sends them again", async () => {
    const voice = createVoiceAdapter();
    const stream = vi.fn(
      echoValues((index) => [
        { id: `reply-${index}`, type: "ai", content: `Reply ${index}` },
      ])(() => []),
    );
    const getCheckpointId = vi.fn(
      async (_threadId: string, _parentMessages: LangChainMessage[]) =>
        "before-voice",
    );
    const { result } = await renderVoiceRuntime({
      stream,
      getCheckpointId,
      voice,
      unstable_threadListAdapter: makeThreadListAdapter(),
    });
    await act(async () => {
      await result.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() =>
      expect(result.current.thread.getState().capabilities.voice).toBe(true),
    );
    const [user, assistant] = speak(result.current, voice, spokenTurns);
    await act(async () => {
      await result.current.thread.append("Typed question");
    });
    const typed = result.current.thread.getState().messages[2]!;

    await act(async () => {
      const composer = result.current.thread.getMessageById(typed.id).composer;
      composer.beginEdit();
      composer.setText("Edited question");
      await composer.send();
    });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));

    expect(getCheckpointId).toHaveBeenCalledExactlyOnceWith("lg-thread-1", []);
    const [messages, config] = stream.mock.calls[1]!;
    expect(messages.map((message) => message.id)).toEqual([
      user!.id,
      assistant!.id,
      expect.any(String),
    ]);
    expect(messages.at(-1)).toMatchObject({
      type: "human",
      content: "Edited question",
    });
    expect(config).toMatchObject({ checkpointId: "before-voice" });
  });

  it("carries only what the session finalized", async () => {
    const voice = createVoiceAdapter();
    const stream = vi.fn<LangGraphStreamCallback<LangChainMessage>>(() =>
      mockStreamCallbackFactory([])(),
    );
    const { result } = await renderVoiceRuntime({ stream, voice });

    act(() => {
      result.current.thread.connectVoice();
      voice.emitTranscript({ role: "user", text: "Spoken qu", isFinal: false });
      voice.emitTranscript({
        role: "assistant",
        text: "Spoken ans",
        isFinal: false,
      });
    });
    act(() => result.current.thread.disconnectVoice());
    await act(async () => {
      await result.current.thread.append("Next question");
    });

    expect(stream.mock.calls[0]![0]).toEqual([
      {
        id: expect.any(String),
        type: "ai",
        content: "Spoken ans",
        additional_kwargs: { modality: "voice" },
      },
      { id: expect.any(String), type: "human", content: "Next question" },
    ]);
  });

  it("hands transcripts back when the run carrying them fails", async () => {
    const voice = createVoiceAdapter();
    const stream = vi.fn<LangGraphStreamCallback<LangChainMessage>>(() =>
      mockStreamCallbackFactory([])(),
    );
    stream.mockImplementationOnce(async function* () {
      yield* [];
      throw new Error("offline");
    });
    const { result } = await renderVoiceRuntime({ stream, voice });
    const [user, assistant] = speak(result.current, voice, spokenTurns);
    const core = (
      result.current.thread as unknown as {
        __internal_threadBinding: {
          getState(): { append(message: AppendMessage): Promise<void> };
        };
      }
    ).__internal_threadBinding.getState();

    await act(async () => {
      await expect(
        core.append({
          role: "user",
          content: [{ type: "text", text: "First" }],
          parentId: assistant!.id,
          sourceId: null,
          runConfig: undefined,
          attachments: [],
          metadata: { custom: {} },
          createdAt: new Date(0),
        }),
      ).rejects.toThrow("offline");
    });
    await act(async () => {
      await result.current.thread.append("Second");
    });

    expect(stream.mock.calls[1]![0].map((message) => message.id)).toEqual([
      user!.id,
      assistant!.id,
      expect.any(String),
    ]);
  });

  it("regenerates an unsent assistant transcript by forking before the user transcript", async () => {
    const voice = createVoiceAdapter();
    const stream = vi.fn<LangGraphStreamCallback<LangChainMessage>>(() =>
      mockStreamCallbackFactory([])(),
    );
    const getCheckpointId = vi.fn(
      async (_threadId: string, _parentMessages: LangChainMessage[]) =>
        "latest",
    );
    const { result } = await renderVoiceRuntime({
      stream,
      getCheckpointId,
      voice,
      unstable_threadListAdapter: makeThreadListAdapter(),
    });
    await act(async () => {
      await result.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() =>
      expect(result.current.thread.getState().capabilities.voice).toBe(true),
    );
    const [user, assistant] = speak(result.current, voice, spokenTurns);

    await act(async () => {
      await result.current.thread.getMessageById(assistant!.id).reload();
    });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));

    expect(getCheckpointId).toHaveBeenCalledExactlyOnceWith("lg-thread-1", []);
    const [messages, config] = stream.mock.calls[0]!;
    expect(messages).toEqual([
      {
        id: user!.id,
        type: "human",
        content: "Spoken question",
        additional_kwargs: { modality: "voice" },
      },
    ]);
    expect(config).toMatchObject({ checkpointId: "latest" });
    expect(
      result.current.thread.getState().messages.map((message) => message.id),
    ).toEqual([user!.id]);
  });
});
