// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { DefaultThreadComposerRuntimeCore } from "../runtime/base/default-thread-composer-runtime-core";
import type { AttachmentAdapter } from "../adapters/attachment";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";
import { MessageNotSentError } from "../types/error";
import type {
  CompleteAttachment,
  PendingAttachment,
} from "../types/attachment";
import type {
  ExternalThreadMessage,
  ExternalThreadProps,
} from "../store/clients/external-thread";
import { ExternalThread } from "../store/clients/external-thread";
import { submissionThreadMessage } from "../store/clients/submission-message";

afterEach(() => {
  vi.restoreAllMocks();
});

const deferred = () => Promise.withResolvers<void>();
const settledUpload = Promise.resolve();

const textFile = (name = "f.txt") =>
  new File(["content"], name, { type: "text/plain" });

const uploadAdapter = (
  upload: Promise<void>,
  overrides: Partial<AttachmentAdapter> = {},
): AttachmentAdapter => ({
  accept: "*",
  add: async ({ file }: { file: File }): Promise<PendingAttachment> => ({
    id: file.name,
    type: "file",
    name: file.name,
    contentType: file.type,
    file,
    status: { type: "requires-action", reason: "composer-send" },
  }),
  remove: async () => {},
  send: async (attachment) => {
    await upload;
    return { ...attachment, status: { type: "complete" }, content: [] };
  },
  ...overrides,
});

const makeComposer = (adapter: AttachmentAdapter, messages: unknown[] = []) => {
  const append = vi.fn();
  const runtime = {
    append,
    cancelRun: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    capabilities: { cancel: false },
    messages,
    getModelContext: () => ({ unstable_composerMetadata: undefined }),
    adapters: { attachments: adapter },
  } as unknown as Omit<ThreadRuntimeCore, "composer">;
  return { composer: new DefaultThreadComposerRuntimeCore(runtime), append };
};

const makeThread = (adapter: AttachmentAdapter) => {
  const listeners = new Set<() => void>();
  const runtime = {
    append: vi.fn(),
    cancelRun: vi.fn(),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    capabilities: { cancel: false },
    messages: [] as { id: string; role: string }[],
    getModelContext: () => ({ unstable_composerMetadata: undefined }),
    adapters: { attachments: adapter },
  };
  const composer = new DefaultThreadComposerRuntimeCore(
    runtime as unknown as Omit<ThreadRuntimeCore, "composer">,
  );
  return {
    composer,
    append: runtime.append,
    show: (id: string, role = "user") => {
      runtime.messages = [...runtime.messages, { id, role }];
      for (const listener of listeners) listener();
    },
  };
};

describe("composer submission", () => {
  it("holds the sent message while its attachments are prepared", async () => {
    const upload = deferred();
    const { composer, append } = makeComposer(uploadAdapter(upload.promise));

    composer.setText("hello");
    await composer.addAttachment(textFile());

    const sending = composer.send();
    await Promise.resolve();

    expect(composer.text).toBe("");
    expect(composer.attachments).toEqual([]);
    expect(composer.canSend).toBe(false);
    expect(composer.submission).toMatchObject({
      text: "hello",
      role: "user",
      attachments: [{ id: "f.txt" }],
    });
    expect(append).not.toHaveBeenCalled();

    upload.resolve();
    await sending;

    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "hello" }],
      attachments: [{ id: "f.txt", status: { type: "complete" } }],
    });
    // The runtime here never shows the message, and a submission it already
    // took must not hold the composer.
    composer.setText("next");
    expect(composer.canSend).toBe(true);
  });

  it("takes the message back into the draft when it is cancelled", async () => {
    const upload = deferred();
    const { composer, append } = makeComposer(uploadAdapter(upload.promise));

    composer.setText("hello");
    await composer.addAttachment(textFile());
    const sending = composer.send();
    await Promise.resolve();

    composer.setText("typed while sending");
    composer.cancel();

    expect(composer.submission).toBeUndefined();
    expect(composer.text).toBe("hello\ntyped while sending");
    expect(composer.attachments.map((a) => a.id)).toEqual(["f.txt"]);

    upload.resolve();
    await sending;
    expect(append).not.toHaveBeenCalled();
  });

  it("takes the message back with the reason when an upload fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const upload = deferred();
    const send = vi.fn(async (): Promise<CompleteAttachment> => {
      await upload.promise;
      throw new Error("upload failed");
    });
    const { composer, append } = makeComposer(
      uploadAdapter(upload.promise, { send }),
    );

    composer.setText("hello");
    await composer.addAttachment(textFile());
    const sending = composer.send();
    upload.resolve();
    await sending;

    expect(append).not.toHaveBeenCalled();
    expect(composer.submission).toBeUndefined();
    expect(composer.text).toBe("hello");
    expect(composer.attachments[0]?.status).toEqual({
      type: "incomplete",
      reason: "error",
      message: "upload failed",
    });
    expect(composer.canSend).toBe(true);
  });

  it("reuses an upload that finished when the message is sent again", async () => {
    const send = vi.fn(
      async (attachment: PendingAttachment): Promise<CompleteAttachment> => ({
        ...attachment,
        status: { type: "complete" },
        content: [],
      }),
    );
    const upload = deferred();
    upload.resolve();
    const { composer, append } = makeComposer(
      uploadAdapter(upload.promise, { send }),
    );
    append.mockImplementation(() => Promise.reject(new MessageNotSentError()));

    composer.setText("hello");
    await composer.addAttachment(textFile());
    await composer.send();
    await vi.waitFor(() => expect(composer.text).toBe("hello"));

    expect(send).toHaveBeenCalledTimes(1);
    expect(composer.attachments).toHaveLength(1);

    await composer.send();

    expect(append).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("a message in transit", () => {
  it("stays in the thread until the runtime shows it, even after the next send", async () => {
    const { composer, show } = makeThread(uploadAdapter(settledUpload));

    composer.setText("one");
    await composer.addAttachment(textFile("a.txt"));
    await composer.send();

    expect(composer.submission).toBeUndefined();
    expect(composer.inTransit).toMatchObject([
      {
        text: "one",
        attachments: [{ id: "a.txt", status: { type: "complete" } }],
      },
    ]);

    composer.setText("two");
    await composer.addAttachment(textFile("b.txt"));
    await composer.send();
    expect(composer.inTransit.map((message) => message.text)).toEqual([
      "one",
      "two",
    ]);

    show("m1");
    expect(composer.inTransit.map((message) => message.text)).toEqual(["two"]);
    show("a1", "assistant");
    expect(composer.inTransit.map((message) => message.text)).toEqual(["two"]);
    show("m2");
    expect(composer.inTransit).toEqual([]);
  });

  it("leaves the thread when the runtime rejects it", async () => {
    const { composer, append } = makeThread(uploadAdapter(settledUpload));
    append.mockImplementation(() => Promise.reject(new Error("offline")));

    composer.setText("hello");
    await composer.addAttachment(textFile());
    await composer.send();

    await vi.waitFor(() => expect(composer.inTransit).toEqual([]));
    expect(composer.text).toBe("");
  });

  it("keeps its attachments when the composer resets", async () => {
    const remove = vi.fn(async () => {});
    const { composer } = makeThread(uploadAdapter(settledUpload, { remove }));

    composer.setText("hello");
    await composer.addAttachment(textFile());
    await composer.send();
    await composer.reset();

    expect(remove).not.toHaveBeenCalled();
    expect(composer.inTransit).toHaveLength(1);
  });

  it("belongs to the runtime even when handing it over resets the composer", async () => {
    const remove = vi.fn(async () => {});
    const { composer, append } = makeThread(
      uploadAdapter(settledUpload, { remove }),
    );
    append.mockImplementation(() => {
      void composer.reset();
    });

    composer.setText("hello");
    await composer.addAttachment(textFile());
    await composer.send();

    expect(append).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(composer.submission).toBeUndefined();
    expect(composer.inTransit).toHaveLength(1);
  });
});

describe("taking a send back", () => {
  it("does not start the draft with a blank line when the message had no text", async () => {
    const upload = deferred();
    const { composer } = makeThread(uploadAdapter(upload.promise));

    await composer.addAttachment(textFile());
    const sending = composer.send();
    composer.setText("typed while sending");
    composer.cancel();

    expect(composer.text).toBe("typed while sending");
    upload.resolve();
    await sending;
  });

  it("gives each attachment that failed its own reason", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn(
      async (attachment: PendingAttachment): Promise<CompleteAttachment> => {
        throw new Error(`${attachment.name} failed`);
      },
    );
    const { composer } = makeThread(uploadAdapter(settledUpload, { send }));

    await composer.addAttachment(textFile("a.txt"));
    await composer.addAttachment(textFile("b.txt"));
    await composer.send();

    expect(composer.attachments.map((attachment) => attachment.status)).toEqual(
      [
        { type: "incomplete", reason: "error", message: "a.txt failed" },
        { type: "incomplete", reason: "error", message: "b.txt failed" },
      ],
    );
  });

  it("keeps an attachment it could not remove out of the message, with the reason", async () => {
    const upload = deferred();
    const remove = vi.fn(async () => {
      throw new Error("remove failed");
    });
    const { composer, append } = makeThread(
      uploadAdapter(upload.promise, { remove }),
    );

    composer.setText("hello");
    await composer.addAttachment(textFile());
    const sending = composer.send();

    await expect(composer.removeAttachment("f.txt")).rejects.toThrow(
      "remove failed",
    );
    expect(composer.submission?.attachments[0]?.status).toEqual({
      type: "incomplete",
      reason: "error",
      message: "remove failed",
    });

    upload.resolve();
    await sending;
    expect(append.mock.calls[0]![0]).toMatchObject({ attachments: [] });
  });
});

describe("submissionThreadMessage", () => {
  it("gives a system message without text its one text part", () => {
    expect(
      submissionThreadMessage({
        id: "s1",
        role: "system",
        text: "",
        quote: undefined,
        attachments: [],
      }).content,
    ).toEqual([{ type: "text", text: "" }]);
  });
});

const renderThread = (props: Partial<ExternalThreadProps>) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC<{ messages: readonly ExternalThreadMessage[] }> = ({
    messages,
  }) => {
    const aui = useAui({
      thread: ExternalThread({ isRunning: false, ...props, messages }),
    });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };
  const view = render(<App messages={[]} />);
  return {
    aui: () => captured.aui!,
    setMessages: (messages: readonly ExternalThreadMessage[]) =>
      view.rerender(<App messages={messages} />),
  };
};

describe("the thread's submission row", () => {
  it("renders the message being sent and gives way to the runtime's own", async () => {
    const upload = deferred();
    const onNew = vi.fn();
    const { aui, setMessages } = renderThread({
      onNew,
      attachmentAdapter: uploadAdapter(upload.promise),
    });
    const composer = () => aui().thread.composer();

    await act(async () => {
      await composer().addAttachment(textFile());
      composer().setText("hello");
    });
    await act(async () => {
      composer().send();
    });

    const thread = () => aui().thread.getState();
    expect(thread().messages).toHaveLength(1);
    const row = thread().messages[0]!;
    expect(row.role).toBe("user");
    expect(row.submission).toMatchObject({ text: "hello" });
    expect(row.attachments).toEqual([]);
    expect(
      aui().thread.message({ index: 0 }).attachment({ index: 0 }).getState(),
    ).toMatchObject({ id: "f.txt", status: { type: "requires-action" } });
    expect(thread().isEmpty).toBe(false);

    await act(async () => {
      upload.resolve();
      await upload.promise;
    });
    await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));

    // The row stays until the host shows the message it was dispatched as.
    expect(thread().messages).toHaveLength(1);
    expect(thread().messages[0]!.submission).toBeDefined();

    await act(async () => {
      setMessages([
        {
          id: "m1",
          role: "user",
          content: [{ type: "text", text: "hello" }],
          attachments: [],
          createdAt: new Date(0),
          metadata: { custom: {} },
        },
      ]);
    });

    await waitFor(() => expect(thread().messages).toHaveLength(1));
    expect(thread().messages[0]!.id).toBe("m1");
    expect(thread().messages[0]!.submission).toBeUndefined();
    expect(composer().getState().submission).toBeUndefined();
  });
});

describe("the thread's rows for messages in transit", () => {
  const hostMessage = (id: string, text: string): ExternalThreadMessage => ({
    id,
    role: "user",
    content: [{ type: "text", text }],
    attachments: [],
    createdAt: new Date(0),
    metadata: { custom: {} },
  });

  it("keeps each sent message until the host shows it, in order", async () => {
    const onNew = vi.fn();
    const { aui, setMessages } = renderThread({
      onNew,
      attachmentAdapter: uploadAdapter(settledUpload),
    });
    const composer = () => aui().thread.composer();
    const rows = () =>
      aui()
        .thread.getState()
        .messages.map((message) => message.submission?.text ?? message.id);

    for (const [text, name] of [
      ["one", "a.txt"],
      ["two", "b.txt"],
    ] as const) {
      await act(async () => {
        await composer().addAttachment(textFile(name));
        composer().setText(text);
      });
      await act(async () => {
        composer().send();
      });
    }
    await waitFor(() => expect(onNew).toHaveBeenCalledTimes(2));
    expect(rows()).toEqual(["one", "two"]);

    await act(async () => {
      setMessages([hostMessage("m1", "one")]);
    });
    expect(rows()).toEqual(["m1", "two"]);

    await act(async () => {
      setMessages([hostMessage("m1", "one"), hostMessage("m2", "two")]);
    });
    expect(rows()).toEqual(["m1", "m2"]);
  });

  it("marks only the last row as the thread's last message", async () => {
    const upload = deferred();
    const { aui, setMessages } = renderThread({
      onNew: vi.fn(),
      attachmentAdapter: uploadAdapter(upload.promise),
    });
    const composer = () => aui().thread.composer();
    await act(async () => {
      setMessages([hostMessage("m0", "earlier")]);
    });
    await act(async () => {
      await composer().addAttachment(textFile());
      composer().setText("hello");
    });
    await act(async () => {
      composer().send();
    });

    expect(
      aui()
        .thread.getState()
        .messages.map(({ isLast }) => isLast),
    ).toEqual([false, true]);
    upload.resolve();
  });

  it("keeps a second send cancellable while the first is still in transit", async () => {
    const slow = deferred();
    const send = vi.fn(async (attachment: PendingAttachment) => {
      if (attachment.name === "b.txt") await slow.promise;
      return {
        ...attachment,
        status: { type: "complete" as const },
        content: [],
      };
    });
    const onNew = vi.fn();
    const { aui, setMessages } = renderThread({
      onNew,
      attachmentAdapter: uploadAdapter(settledUpload, { send }),
    });
    const composer = () => aui().thread.composer();

    await act(async () => {
      await composer().addAttachment(textFile("a.txt"));
      composer().setText("one");
    });
    await act(async () => {
      composer().send();
    });
    await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
    await act(async () => {
      await composer().addAttachment(textFile("b.txt"));
      composer().setText("two");
    });
    await act(async () => {
      composer().send();
    });

    await act(async () => {
      setMessages([hostMessage("m1", "one")]);
    });
    expect(composer().getState().submission).toMatchObject({ text: "two" });

    await act(async () => {
      composer().cancel();
    });
    expect(composer().getState().submission).toBeUndefined();
    expect(composer().getState().text).toBe("two");
    slow.resolve();
  });

  it("returns the message to the draft when the host throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onNew = vi.fn(() => {
      throw new Error("offline");
    });
    const { aui } = renderThread({
      onNew,
      attachmentAdapter: uploadAdapter(settledUpload),
    });
    const composer = () => aui().thread.composer();

    await act(async () => {
      composer().setText("plain");
    });
    await act(async () => {
      composer().send();
    });
    expect(composer().getState().text).toBe("plain");

    await act(async () => {
      composer().setText("");
      await composer().addAttachment(textFile());
      composer().setText("with a file");
    });
    await act(async () => {
      composer().send();
    });
    await waitFor(() => expect(composer().getState().text).toBe("with a file"));
    expect(composer().getState().attachments).toHaveLength(1);
    expect(aui().thread.getState().messages).toEqual([]);
  });

  it("gives each attachment that failed its own reason", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn(
      async (attachment: PendingAttachment): Promise<CompleteAttachment> => {
        throw new Error(`${attachment.name} failed`);
      },
    );
    const { aui } = renderThread({
      onNew: vi.fn(),
      attachmentAdapter: uploadAdapter(settledUpload, { send }),
    });
    const composer = () => aui().thread.composer();

    await act(async () => {
      await composer().addAttachment(textFile("a.txt"));
      await composer().addAttachment(textFile("b.txt"));
    });
    await act(async () => {
      composer().send();
    });

    await waitFor(() =>
      expect(
        composer()
          .getState()
          .attachments.map((attachment) => attachment.status),
      ).toEqual([
        { type: "incomplete", reason: "error", message: "a.txt failed" },
        { type: "incomplete", reason: "error", message: "b.txt failed" },
      ]),
    );
  });

  it("keeps an attachment it could not remove out of the message, with the reason", async () => {
    const upload = deferred();
    const remove = vi.fn(async () => {
      throw new Error("remove failed");
    });
    const onNew = vi.fn();
    const { aui } = renderThread({
      onNew,
      attachmentAdapter: uploadAdapter(upload.promise, { remove }),
    });
    const composer = () => aui().thread.composer();

    await act(async () => {
      await composer().addAttachment(textFile());
      composer().setText("hello");
    });
    await act(async () => {
      composer().send();
    });
    await act(async () => {
      await expect(
        composer().attachment({ id: "f.txt" }).remove(),
      ).rejects.toThrow("remove failed");
    });
    expect(composer().getState().submission?.attachments[0]?.status).toEqual({
      type: "incomplete",
      reason: "error",
      message: "remove failed",
    });

    await act(async () => {
      upload.resolve();
      await upload.promise;
    });
    await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
    expect(onNew.mock.calls[0]![0]).toMatchObject({ attachments: [] });
  });
});
