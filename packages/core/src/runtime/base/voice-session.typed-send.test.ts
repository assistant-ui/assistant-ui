import { describe, expect, it, vi } from "vitest";
import {
  createVoiceSession,
  type RealtimeVoiceAdapter,
  type VoiceSessionHelpers,
} from "../../adapters/voice";
import { LocalRuntimeCore } from "../../runtimes/local/local-runtime-core";
import { ExternalStoreThreadRuntimeCore } from "../../runtimes/external-store/external-store-thread-runtime-core";
import { MessageNotSentError } from "../../types/error";
import type { AppendMessage, ThreadMessage } from "../../types/message";
import { getThreadMessageText } from "../../utils/text";
import { disposeThreadRuntime } from "../utils/thread-runtime-lifecycle";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const createThread = async (
  kind: "local" | "external",
  persist: () => Promise<void> = async () => {},
) => {
  const sendText = vi.fn<(text: string) => void | Promise<void>>();
  const record = vi.fn<(message: ThreadMessage) => void>();
  const sessions: VoiceSessionHelpers[] = [];
  const voice: RealtimeVoiceAdapter = {
    connect: (options) =>
      createVoiceSession(options, async (helpers) => {
        sessions.push(helpers);
        helpers.setStatus({ type: "running" });
        return { sendText, disconnect() {}, mute() {}, unmute() {} };
      }),
  };
  const thread =
    kind === "local"
      ? new LocalRuntimeCore(
          {
            adapters: {
              voice,
              chatModel: { run: async () => ({}) },
              history: {
                load: async () => ({ messages: [] }),
                append: async ({ message }) => {
                  record(message);
                  await persist();
                },
              },
            },
          },
          undefined,
        ).threads.getMainThreadRuntimeCore()
      : new ExternalStoreThreadRuntimeCore(
          { getModelContext: () => ({}) },
          {
            messages: [],
            onNew: async () => {},
            onVoiceTranscript: record,
            adapters: { voice },
          },
        );
  if ("__internal_load" in thread) await thread.__internal_load();
  const connect = async () => {
    const ready = deferred();
    const unsubscribe = thread.subscribe(() => {
      if (thread.voice?.canSendText) ready.resolve();
    });
    thread.connectVoice();
    await ready.promise;
    unsubscribe();
    return sessions.at(-1)!;
  };
  await connect();
  return {
    thread,
    sendText,
    record,
    connect,
    get voice() {
      return sessions.at(-1)!;
    },
  };
};

const typedMessage = (
  thread: { messages: readonly ThreadMessage[] },
  text = "Question",
): AppendMessage => ({
  parentId: thread.messages.at(-1)?.id ?? null,
  sourceId: null,
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(0),
  runConfig: {},
});

const contents = (messages: readonly ThreadMessage[]) =>
  messages.map((message) => [message.role, getThreadMessageText(message)]);

describe.each(["local", "external"] as const)(
  "%s typed voice turns",
  (kind) => {
    it.each([false, true])(
      "records the question before an early reply (already final: %s)",
      async (isFinal) => {
        const { thread, sendText, voice, record } = await createThread(kind);
        const acceptance = deferred();
        sendText.mockReturnValueOnce(acceptance.promise);
        try {
          const sending = thread.append(typedMessage(thread));
          expect(sendText).toHaveBeenCalledExactlyOnceWith("Question");
          voice.emitTranscript({ role: "assistant", text: "Answer", isFinal });
          acceptance.resolve();
          await sending;

          expect(contents(thread.messages)).toEqual([
            ["user", "Question"],
            ["assistant", "Answer"],
          ]);
          const replyId = thread.messages[1]!.id;
          expect(thread.messages[1]!.status?.type).toBe(
            isFinal ? "complete" : "running",
          );
          if (!isFinal) {
            voice.emitTranscript({
              role: "assistant",
              text: "Answer completed",
              isFinal: true,
            });
            expect(contents(thread.messages)).toEqual([
              ["user", "Question"],
              ["assistant", "Answer completed"],
            ]);
            expect(thread.messages[1]!.id).toBe(replyId);
          }
          expect(
            contents(record.mock.calls.map(([message]) => message)),
          ).toEqual(contents(thread.messages));
        } finally {
          thread.disconnectVoice();
        }
      },
    );

    it("keeps the existing reply intact when the typed send is rejected", async () => {
      const { thread, sendText, voice, record } = await createThread(kind);
      const acceptance = deferred();
      sendText.mockReturnValueOnce(acceptance.promise);
      try {
        voice.emitTranscript({ role: "assistant", text: "Existing" });
        const replyId = thread.messages[0]!.id;
        const sending = thread.append(typedMessage(thread));
        const rejected =
          expect(sending).rejects.toBeInstanceOf(MessageNotSentError);
        voice.emitTranscript({
          role: "assistant",
          text: "Existing reply completed",
          isFinal: true,
        });
        acceptance.reject(new Error("provider rejected the send"));
        await rejected;

        expect(contents(thread.messages)).toEqual([
          ["assistant", "Existing reply completed"],
        ]);
        expect(thread.messages[0]!.id).toBe(replyId);
        expect(contents(record.mock.calls.map(([message]) => message))).toEqual(
          [["assistant", "Existing reply completed"]],
        );
      } finally {
        thread.disconnectVoice();
      }
    });

    it.each(["disconnect", "end"] as const)(
      "preserves a received reply when the session closes during a send (%s)",
      async (close) => {
        const { thread, sendText, voice, record } = await createThread(kind);
        const acceptance = deferred();
        sendText.mockReturnValueOnce(acceptance.promise);
        const sending = thread.append(typedMessage(thread));
        const rejected =
          expect(sending).rejects.toBeInstanceOf(MessageNotSentError);
        voice.emitTranscript({ role: "assistant", text: "Received reply" });
        if (close === "disconnect") thread.disconnectVoice();
        else voice.end("finished");
        acceptance.resolve();
        await rejected;

        expect(contents(record.mock.calls.map(([message]) => message))).toEqual(
          [["assistant", "Received reply"]],
        );
        expect(record.mock.calls[0]![0].status).toEqual({
          type: "complete",
          reason: "stop",
        });
        expect(thread.voice).toBeUndefined();
      },
    );

    it("keeps overlapping typed sends and their early replies in submission order", async () => {
      const { thread, sendText, voice } = await createThread(kind);
      const first = deferred();
      const second = deferred();
      const secondStarted = deferred();
      sendText.mockReturnValueOnce(first.promise).mockImplementationOnce(() => {
        secondStarted.resolve();
        return second.promise;
      });
      try {
        const firstSend = thread.append(typedMessage(thread, "First question"));
        const secondSend = thread.append(
          typedMessage(thread, "Second question"),
        );
        expect(sendText).toHaveBeenCalledExactlyOnceWith("First question");
        voice.emitTranscript({
          role: "assistant",
          text: "First answer",
          isFinal: true,
        });
        first.resolve();
        await secondStarted.promise;
        voice.emitTranscript({
          role: "assistant",
          text: "Second answer",
          isFinal: true,
        });
        second.resolve();
        await Promise.all([firstSend, secondSend]);

        expect(contents(thread.messages)).toEqual([
          ["user", "First question"],
          ["assistant", "First answer"],
          ["user", "Second question"],
          ["assistant", "Second answer"],
        ]);
      } finally {
        thread.disconnectVoice();
      }
    });

    it("discards a buffered reply when the runtime is disposed", async () => {
      const { thread, sendText, voice, record } = await createThread(kind);
      const acceptance = deferred();
      sendText.mockReturnValueOnce(acceptance.promise);
      const sending = thread.append(typedMessage(thread));
      voice.emitTranscript({
        role: "assistant",
        text: "Discarded reply",
        isFinal: true,
      });
      disposeThreadRuntime(thread);
      acceptance.resolve();
      await sending;

      expect(thread.messages).toEqual([]);
      expect(record).not.toHaveBeenCalled();
      expect(thread.voice).toBeUndefined();
    });

    it("does not flush a replacement session's reply when an old send settles", async () => {
      const { thread, sendText, connect } = await createThread(kind);
      const oldAcceptance = deferred();
      const newAcceptance = deferred();
      sendText
        .mockReturnValueOnce(oldAcceptance.promise)
        .mockReturnValueOnce(newAcceptance.promise);
      const oldSend = thread.append(typedMessage(thread, "Old question"));
      const rejected =
        expect(oldSend).rejects.toBeInstanceOf(MessageNotSentError);
      thread.disconnectVoice();
      const replacement = await connect();
      try {
        const newSend = thread.append(typedMessage(thread, "New question"));
        replacement.emitTranscript({
          role: "assistant",
          text: "New answer",
          isFinal: true,
        });
        oldAcceptance.reject(new Error("old send rejected"));
        await rejected;
        newAcceptance.resolve();
        await newSend;

        expect(contents(thread.messages)).toEqual([
          ["user", "New question"],
          ["assistant", "New answer"],
        ]);
        expect(thread.voice?.status.type).toBe("running");
      } finally {
        thread.disconnectVoice();
      }
    });
  },
);

it.each(["local", "external"] as const)(
  "accepts transcripts from a session connected during buffered delivery in %s",
  async (kind) => {
    const fixture = await createThread(kind);
    const { thread, sendText, record } = fixture;
    const acceptance = deferred();
    sendText.mockReturnValueOnce(acceptance.promise);
    record.mockImplementation((message) => {
      if (getThreadMessageText(message) !== "Old answer") return;
      thread.connectVoice();
      fixture.voice.emitTranscript({
        role: "assistant",
        text: "Replacement answer",
        isFinal: true,
      });
    });
    try {
      const sending = thread.append(typedMessage(thread));
      fixture.voice.emitTranscript({
        role: "assistant",
        text: "Old answer",
        isFinal: true,
      });
      acceptance.resolve();
      await sending;

      expect(contents(record.mock.calls.map(([message]) => message))).toEqual([
        ["user", "Question"],
        ["assistant", "Old answer"],
        ["assistant", "Replacement answer"],
      ]);
      expect(thread.voice?.status.type).toBe("running");
    } finally {
      thread.disconnectVoice();
    }
  },
);

it.each(["local", "external"] as const)(
  "preserves a buffered reply when persisting the previous turn disconnects %s",
  async (kind) => {
    const { thread, sendText, record, voice } = await createThread(kind);
    const acceptance = deferred();
    sendText.mockReturnValueOnce(acceptance.promise);
    record.mockImplementation((message) => {
      if (getThreadMessageText(message) === "Previous reply")
        thread.disconnectVoice();
    });
    voice.emitTranscript({ role: "assistant", text: "Previous reply" });
    const sending = thread.append(typedMessage(thread));
    const rejected =
      expect(sending).rejects.toBeInstanceOf(MessageNotSentError);
    voice.emitTranscript({
      role: "assistant",
      text: "Received reply",
      isFinal: true,
    });
    acceptance.resolve();
    await rejected;

    expect(contents(record.mock.calls.map(([message]) => message))).toEqual([
      ["assistant", "Previous reply"],
      ["assistant", "Received reply"],
    ]);
    expect(thread.voice).toBeUndefined();
  },
);

it("streams an early reply while the typed message is still being persisted", async () => {
  const persistence = deferred();
  const { thread, sendText, voice, record } = await createThread(
    "local",
    () => persistence.promise,
  );
  const acceptance = deferred();
  const replyVisible = deferred();
  const unsubscribe = thread.subscribe(() => {
    if (thread.messages.at(-1)?.role === "assistant") replyVisible.resolve();
  });
  sendText.mockReturnValueOnce(acceptance.promise);
  try {
    const sending = thread.append(typedMessage(thread));
    voice.emitTranscript({ role: "assistant", text: "Streaming reply" });
    acceptance.resolve();
    await replyVisible.promise;

    expect(contents(thread.messages)).toEqual([
      ["user", "Question"],
      ["assistant", "Streaming reply"],
    ]);
    expect(thread.messages[1]!.status?.type).toBe("running");
    expect(record).toHaveBeenCalledOnce();
    persistence.resolve();
    await sending;
  } finally {
    unsubscribe();
    thread.disconnectVoice();
  }
});
