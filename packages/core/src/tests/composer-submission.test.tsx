// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
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

const deferred = () => Promise.withResolvers<void>();

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
