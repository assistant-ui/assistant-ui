// @vitest-environment jsdom

import { act, render, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  AppendMessage,
  AssistantRuntime,
  RealtimeVoiceAdapter,
  RemoteThreadListAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { getThreadMessageText } from "@assistant-ui/core/internal";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { LangChainBaseMessage } from "./types";
import { useStreamRuntime } from "./useStreamRuntime";

const { mockUseStream, streamController } = vi.hoisted(() => ({
  mockUseStream: vi.fn(),
  streamController: Symbol("STREAM_CONTROLLER"),
}));

vi.mock("@langchain/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@langchain/react")>()),
  STREAM_CONTROLLER: streamController,
  useChannel: vi.fn(() => []),
  useStream: mockUseStream,
}));

const createMockStream = (messages: LangChainBaseMessage[] = []) => ({
  messages,
  isLoading: false,
  isThreadLoading: false,
  values: {},
  interrupts: [],
  toolCalls: [],
  subagents: new Map(),
  subgraphs: [],
  error: undefined,
  submit: vi.fn(async (_values: Record<string, unknown>) => {}),
  respond: vi.fn(),
  respondAll: vi.fn(),
  interrupt: vi.fn(),
  stop: vi.fn(),
  client: {},
  [streamController]: {
    messageMetadataStore: { getSnapshot: vi.fn() },
    resolveSubagentNamespace: vi.fn(async () => {}),
    registry: { acquire: vi.fn() },
  },
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

const renderVoiceRuntime = async (
  stream: ReturnType<typeof createMockStream>,
  voice: ReturnType<typeof createVoiceAdapter>,
) => {
  mockUseStream.mockReturnValue(stream);
  const rendered = renderHook(() =>
    useStreamRuntime({
      apiUrl: "/api",
      assistantId: "agent",
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
      message.id,
      message.role,
      getThreadMessageText(message),
      message.metadata.modality,
    ]);

const spokenTurns = [
  { role: "user", text: "Spoken question" },
  { role: "assistant", text: "Spoken answer" },
] as const;

const speak = (
  runtime: AssistantRuntime,
  voice: ReturnType<typeof createVoiceAdapter>,
  turns: readonly Pick<
    RealtimeVoiceAdapter.TranscriptItem,
    "role" | "text"
  >[] = spokenTurns,
) => {
  const spoken: ThreadMessage[] = [];
  act(() => {
    runtime.thread.connectVoice();
    for (const turn of turns) {
      voice.emitTranscript({ ...turn, isFinal: true });
      spoken.push(runtime.thread.getState().messages.at(-1)!);
    }
  });
  return spoken;
};

describe("useStreamRuntime voice transcripts", () => {
  it("keeps finalized transcripts under the runtime ids through disconnect and stream updates", async () => {
    const stream = createMockStream();
    const voice = createVoiceAdapter();
    const { result, rerender } = await renderVoiceRuntime(stream, voice);
    const [user, assistant] = speak(result.current, voice);
    const spokenRows = [
      [user!.id, "user", "Spoken question", "voice"],
      [assistant!.id, "assistant", "Spoken answer", "voice"],
    ];

    expect(rowsOf(result.current)).toEqual(spokenRows);
    act(() => result.current.thread.disconnectVoice());
    expect(rowsOf(result.current)).toEqual(spokenRows);

    stream.messages = [
      {
        id: "server-message",
        _getType: () => "human",
        content: "Spoken question",
      },
    ];
    rerender();

    expect(rowsOf(result.current)).toEqual([
      ["server-message", "user", "Spoken question", undefined],
      ...spokenRows,
    ]);
    expect(stream.submit).not.toHaveBeenCalled();
  });

  it("submits transcripts once after cancellation stubs and before the new human message", async () => {
    const stream = createMockStream([
      {
        id: "pending-tool",
        _getType: () => "ai",
        content: "",
        tool_calls: [{ id: "call-1", name: "lookup", args: {} }],
        status: { type: "incomplete", reason: "cancelled" },
      },
    ]);
    const voice = createVoiceAdapter();
    const { result } = await renderVoiceRuntime(stream, voice);
    const [user, assistant] = speak(result.current, voice);
    act(() => result.current.thread.disconnectVoice());

    await act(async () => {
      await result.current.thread.append("Next question");
    });
    await act(async () => {
      await result.current.thread.append("Another question");
    });

    const cancellation = {
      type: "tool",
      name: "lookup",
      tool_call_id: "call-1",
      content: JSON.stringify({ cancelled: true }),
      status: "error",
    };
    expect(stream.submit).toHaveBeenCalledTimes(2);
    expect(stream.submit.mock.calls[0]![0]).toEqual({
      messages: [
        cancellation,
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
      ],
    });
    expect(stream.submit.mock.calls[1]![0]).toEqual({
      messages: [
        cancellation,
        { id: expect.any(String), type: "human", content: "Another question" },
      ],
    });
    expect(rowsOf(result.current).slice(1, 3)).toEqual([
      [user!.id, "user", "Spoken question", "voice"],
      [assistant!.id, "assistant", "Spoken answer", "voice"],
    ]);
  });

  it("reconciles echoed transcripts by id and keeps them spoken", async () => {
    const stream = createMockStream();
    const voice = createVoiceAdapter();
    const { result, rerender } = await renderVoiceRuntime(stream, voice);
    const [user, assistant] = speak(result.current, voice);
    act(() => result.current.thread.disconnectVoice());
    await act(async () => {
      await result.current.thread.append("Next question");
    });
    const typed = result.current.thread.getState().messages.at(-1)!;
    stream.messages = [
      {
        id: user!.id,
        _getType: () => "human",
        content: "Spoken question",
        additional_kwargs: { modality: "voice" },
      },
      {
        id: assistant!.id,
        _getType: () => "ai",
        content: "Spoken answer",
        additional_kwargs: { modality: "voice" },
      },
      { id: typed.id, _getType: () => "human", content: "Next question" },
      { id: "reply", _getType: () => "ai", content: "Typed reply" },
    ];
    rerender();

    expect(rowsOf(result.current)).toEqual([
      [user!.id, "user", "Spoken question", "voice"],
      [assistant!.id, "assistant", "Spoken answer", "voice"],
      [typed.id, "user", "Next question", undefined],
      ["reply", "assistant", "Typed reply", undefined],
    ]);
  });

  it("keeps an assistant transcript separate from the preceding assistant message", async () => {
    const stream = createMockStream([
      {
        id: "greeting",
        _getType: () => "ai",
        content: "Hello",
      },
    ]);
    const voice = createVoiceAdapter();
    const { result } = await renderVoiceRuntime(stream, voice);
    const [spoken] = speak(result.current, voice, [
      { role: "assistant", text: "Spoken follow up" },
    ]);
    const expected = [
      ["greeting", "assistant", "Hello", undefined],
      [spoken!.id, "assistant", "Spoken follow up", "voice"],
    ];

    expect(rowsOf(result.current)).toEqual(expected);
    act(() => result.current.thread.disconnectVoice());
    expect(rowsOf(result.current)).toEqual(expected);
  });

  it("submits text typed into a voice session as a plain human message", async () => {
    const stream = createMockStream();
    const sendText = vi.fn(async () => {});
    const voice = createVoiceAdapter(sendText);
    const { result } = await renderVoiceRuntime(stream, voice);

    act(() => result.current.thread.connectVoice());
    await act(async () => {
      await result.current.thread.append("Typed during the call");
    });
    const typed = result.current.thread.getState().messages.at(-1)!;
    act(() => result.current.thread.disconnectVoice());

    expect(sendText).toHaveBeenCalledExactlyOnceWith("Typed during the call");
    expect(rowsOf(result.current)).toEqual([
      [typed.id, "user", "Typed during the call", undefined],
    ]);
    expect(stream.submit).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.thread.append("After the call");
    });

    expect(stream.submit.mock.calls[0]![0]).toEqual({
      messages: [
        { id: typed.id, type: "human", content: "Typed during the call" },
        { id: expect.any(String), type: "human", content: "After the call" },
      ],
    });
  });

  it("includes only preceding unsent transcripts in a staged reload and retains them until echo", async () => {
    const stream = createMockStream();
    const voice = createVoiceAdapter();
    const { result, rerender } = await renderVoiceRuntime(stream, voice);
    const [user, assistant] = speak(result.current, voice);
    act(() => result.current.thread.disconnectVoice());
    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "Staged question" }],
        startRun: false,
      });
    });
    const parent = result.current.thread.getState().messages.at(-1)!;
    const [later] = speak(result.current, voice, [
      { role: "user", text: "Later transcript" },
    ]);
    act(() => result.current.thread.disconnectVoice());

    await act(async () => {
      await result.current.thread.startRun({
        parentId: parent.id,
        sourceId: null,
        runConfig: {},
      });
    });

    expect(stream.submit.mock.calls[0]![0]).toEqual({
      messages: [
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
        { id: parent.id, type: "human", content: "Staged question" },
      ],
    });
    stream.messages = [];
    rerender();
    expect(rowsOf(result.current)).toEqual([
      [user!.id, "user", "Spoken question", "voice"],
      [assistant!.id, "assistant", "Spoken answer", "voice"],
      [later!.id, "user", "Later transcript", "voice"],
    ]);

    await act(async () => {
      await result.current.thread.append("Next question");
    });
    expect(stream.submit.mock.calls[1]![0]).toEqual({
      messages: [
        {
          id: later!.id,
          type: "human",
          content: "Later transcript",
          additional_kwargs: { modality: "voice" },
        },
        { id: expect.any(String), type: "human", content: "Next question" },
      ],
    });
  });

  it("does not resend submitted transcripts when reloading an unacknowledged staged parent", async () => {
    const stream = createMockStream();
    const voice = createVoiceAdapter();
    const { result } = await renderVoiceRuntime(stream, voice);
    speak(result.current, voice);
    act(() => result.current.thread.disconnectVoice());
    await act(async () => {
      await result.current.thread.append("Next question");
    });
    const parent = result.current.thread.getState().messages.at(-1)!;
    await act(async () => {
      await result.current.thread.startRun({
        parentId: parent.id,
        sourceId: null,
        runConfig: {},
      });
    });

    expect(stream.submit.mock.calls[1]![0]).toEqual({
      messages: [{ id: parent.id, type: "human", content: "Next question" }],
    });
  });
});

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "thread-a",
        externalId: "thread-a",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "thread-a",
    externalId: "thread-a",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream()),
  fetch: vi.fn(async (threadId) => ({
    status: "regular" as const,
    remoteId: threadId,
    externalId: threadId,
  })),
});

const baseMessage = (
  id: string,
  type: "human" | "ai",
  content: string,
  additional_kwargs?: Record<string, unknown>,
): LangChainBaseMessage => ({
  id,
  _getType: () => type,
  content,
  ...(additional_kwargs && { additional_kwargs }),
});

const renderThreadRuntime = async (
  stream: ReturnType<typeof createMockStream>,
  voice: ReturnType<typeof createVoiceAdapter>,
  checkpoints: { id: string; messages: LangChainBaseMessage[] }[],
) => {
  stream.client = {
    threads: {
      getHistory: vi.fn(async () =>
        checkpoints.map(({ id, messages }) => ({
          values: { messages },
          checkpoint: { checkpoint_id: id },
        })),
      ),
    },
  };
  mockUseStream.mockReturnValue(stream);
  const rendered = renderHook(() =>
    useStreamRuntime({
      apiUrl: "/api",
      assistantId: "agent",
      adapters: { voice: voice.adapter },
      unstable_threadListAdapter: makeThreadListAdapter(),
    } as never),
  );
  render(
    <AssistantRuntimeProvider runtime={rendered.result.current}>
      {null}
    </AssistantRuntimeProvider>,
  );
  await act(async () => {
    await rendered.result.current.threads.switchToThread("thread-a");
  });
  await waitFor(() =>
    expect(rendered.result.current.thread.getState().capabilities.voice).toBe(
      true,
    ),
  );
  return rendered;
};

describe("useStreamRuntime voice transcripts across forks", () => {
  it("forks an edit of the turn after persisted transcripts from before them and resubmits them", async () => {
    const spokenUser = baseMessage("spoken-user", "human", "Spoken question", {
      modality: "voice",
    });
    const spokenAi = baseMessage("spoken-ai", "ai", "Spoken answer", {
      modality: "voice",
    });
    const typed = baseMessage("typed", "human", "Typed question");
    const reply = baseMessage("reply", "ai", "Reply");
    const stream = createMockStream([spokenUser, spokenAi, typed, reply]);
    const { result } = await renderThreadRuntime(stream, createVoiceAdapter(), [
      { id: "before-voice", messages: [] },
    ]);

    await act(async () => {
      const composer = result.current.thread.getMessageById("typed").composer;
      composer.beginEdit();
      composer.setText("Edited question");
      await composer.send();
    });

    await waitFor(() => expect(stream.submit).toHaveBeenCalledTimes(1));
    expect(stream.submit).toHaveBeenCalledWith(
      {
        messages: [
          {
            id: "spoken-user",
            type: "human",
            content: "Spoken question",
            additional_kwargs: { modality: "voice" },
          },
          {
            id: "spoken-ai",
            type: "ai",
            content: "Spoken answer",
            additional_kwargs: { modality: "voice" },
          },
          { type: "human", content: "Edited question" },
        ],
      },
      expect.objectContaining({ forkFrom: "before-voice" }),
    );
  });

  it("regenerates an unsent assistant transcript by sending the user transcript before it", async () => {
    const typed = baseMessage("typed", "human", "Hi");
    const reply = baseMessage("reply", "ai", "Hello");
    const stream = createMockStream([typed, reply]);
    const voice = createVoiceAdapter();
    const { result } = await renderVoiceRuntime(stream, voice);
    const [user, assistant] = speak(result.current, voice);
    act(() => result.current.thread.disconnectVoice());

    await act(async () => {
      await result.current.thread.getMessageById(assistant!.id).reload();
    });

    expect(stream.submit).toHaveBeenCalledExactlyOnceWith(
      {
        messages: [
          {
            id: user!.id,
            type: "human",
            content: "Spoken question",
            additional_kwargs: { modality: "voice" },
          },
        ],
      },
      undefined,
    );
    expect(
      result.current.thread.getState().messages.map((message) => message.id),
    ).toEqual(["typed", "reply", user!.id]);
  });

  it("drops unsent transcripts that an edit of an earlier turn truncates", async () => {
    const typed = baseMessage("typed", "human", "Hi");
    const reply = baseMessage("reply", "ai", "Hello");
    const stream = createMockStream([typed, reply]);
    const voice = createVoiceAdapter();
    const { result } = await renderThreadRuntime(stream, voice, [
      { id: "initial", messages: [] },
    ]);
    speak(result.current, voice);
    act(() => result.current.thread.disconnectVoice());

    await act(async () => {
      const composer = result.current.thread.getMessageById("typed").composer;
      composer.beginEdit();
      composer.setText("Edited hi");
      await composer.send();
    });
    await waitFor(() => expect(stream.submit).toHaveBeenCalledTimes(1));
    expect(stream.submit).toHaveBeenCalledWith(
      { messages: [{ type: "human", content: "Edited hi" }] },
      expect.objectContaining({ forkFrom: "initial" }),
    );
    expect(
      result.current.thread.getState().messages.map((message) => message.id),
    ).toEqual(["typed", "reply"]);

    await act(async () => {
      await result.current.thread.append("Next question");
    });
    expect(stream.submit.mock.calls[1]![0]).toEqual({
      messages: [
        { id: expect.any(String), type: "human", content: "Next question" },
      ],
    });
  });

  it("carries transcripts again after a submit that failed", async () => {
    const stream = createMockStream();
    stream.submit.mockRejectedValueOnce(new Error("offline"));
    const voice = createVoiceAdapter();
    const { result } = await renderVoiceRuntime(stream, voice);
    const [user, assistant] = speak(result.current, voice);
    act(() => result.current.thread.disconnectVoice());

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

    expect(stream.submit.mock.calls[1]![0]).toEqual({
      messages: [
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
        { id: expect.any(String), type: "human", content: "Second" },
      ],
    });
  });

  it("keeps a transcript on one in-flight submit and hands it back when that submit fails", async () => {
    const stream = createMockStream();
    let rejectFirst!: (error: Error) => void;
    stream.submit.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );
    const voice = createVoiceAdapter();
    const { result } = await renderVoiceRuntime(stream, voice);
    const [user, assistant] = speak(result.current, voice);
    act(() => result.current.thread.disconnectVoice());
    const core = (
      result.current.thread as unknown as {
        __internal_threadBinding: {
          getState(): { append(message: AppendMessage): Promise<void> };
        };
      }
    ).__internal_threadBinding.getState();
    const appendText = (text: string) =>
      core.append({
        role: "user",
        content: [{ type: "text", text }],
        parentId: result.current.thread.getState().messages.at(-1)!.id,
        sourceId: null,
        runConfig: undefined,
        attachments: [],
        metadata: { custom: {} },
        createdAt: new Date(0),
      });

    let first!: Promise<void>;
    act(() => {
      first = appendText("First");
    });
    await waitFor(() => expect(stream.submit).toHaveBeenCalledTimes(1));
    await act(async () => {
      await appendText("Overlap");
    });
    await act(async () => {
      rejectFirst(new Error("offline"));
      await expect(first).rejects.toThrow("offline");
    });
    await act(async () => {
      await result.current.thread.append("Retry");
    });

    const submittedIds = stream.submit.mock.calls.map(([values]) =>
      (values.messages as { id?: string }[]).map((message) => message.id),
    );
    expect(submittedIds).toEqual([
      [user!.id, assistant!.id, expect.any(String)],
      [expect.any(String)],
      [user!.id, assistant!.id, expect.any(String)],
    ]);
  });
});
