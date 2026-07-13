import { describe, expect, it, vi } from "vitest";
import { DefaultThreadComposerRuntimeCore } from "../runtime/base/default-thread-composer-runtime-core";
import type { AttachmentAdapter } from "../adapters/attachment";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";
import type {
  CompleteAttachment,
  PendingAttachment,
} from "../types/attachment";

const makeAdapter = (
  overrides: Partial<AttachmentAdapter> = {},
): AttachmentAdapter => ({
  accept: "*",
  add: async ({ file }: { file: File }): Promise<PendingAttachment> => ({
    id: "att-1",
    type: "image",
    name: file.name,
    contentType: file.type,
    file,
    status: { type: "requires-action", reason: "composer-send" },
  }),
  remove: async () => {},
  send: async (a) => ({ ...a, status: { type: "complete" }, content: [] }),
  ...overrides,
});

const makeComposer = (
  adapter?: AttachmentAdapter,
  options: { optimisticAttachments?: boolean } = {},
) => {
  const append = vi.fn();
  const __internal_appendOptimisticAttachmentSend = vi.fn(
    (
      message: Parameters<NonNullable<ThreadRuntimeCore["append"]>>[0],
      uploadAttachments: () => Promise<readonly CompleteAttachment[]>,
    ) => {
      append(message);
      return uploadAttachments().then((attachments) => {
        append({ ...message, attachments });
      });
    },
  );
  const runtime = {
    append,
    cancelRun: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    capabilities: { cancel: false },
    messages: [],
    getModelContext: () => ({ unstable_composerMetadata: undefined }),
    adapters: adapter ? { attachments: adapter } : undefined,
    ...(options.optimisticAttachments && {
      __internal_appendOptimisticAttachmentSend,
    }),
  } as unknown as Omit<ThreadRuntimeCore, "composer"> & {
    adapters?: { attachments?: AttachmentAdapter };
  };
  const composer = new DefaultThreadComposerRuntimeCore(runtime);
  return { composer, append, __internal_appendOptimisticAttachmentSend };
};

const textFile = () => new File(["content"], "f.txt", { type: "text/plain" });

describe("BaseComposerRuntimeCore.send restore-on-failure", () => {
  it("restores text, attachments, and quote when an upload fails", async () => {
    const adapter = makeAdapter({
      send: async () => {
        throw new Error("upload failed");
      },
    });
    const { composer, append } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(textFile());
    composer.setQuote({ text: "quoted", messageId: "m-1" });
    const originalAttachments = composer.attachments;

    await expect(composer.send()).rejects.toThrow("upload failed");

    expect(composer.text).toBe("hello");
    expect(composer.attachments).toEqual(originalAttachments);
    expect(composer.attachments).toHaveLength(1);
    expect(composer.quote).toEqual({ text: "quoted", messageId: "m-1" });
    expect(composer.canSend).toBe(true);
    expect(append).not.toHaveBeenCalled();
  });

  it("keeps text locked while the upload is in flight", async () => {
    let rejectSend!: (e: Error) => void;
    const adapter = makeAdapter({
      send: () =>
        new Promise((_resolve, reject) => {
          rejectSend = reject;
        }),
    });
    const { composer, append } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(textFile());

    const sendPromise = composer.send();
    composer.setText("new draft");
    rejectSend(new Error("upload failed"));

    await expect(sendPromise).rejects.toThrow("upload failed");

    expect(composer.text).toBe("hello");
    expect(composer.attachments).toHaveLength(1);
    expect(composer.canSend).toBe(true);
    expect(append).not.toHaveBeenCalled();
  });

  it("keeps quote locked while the upload is in flight", async () => {
    let rejectSend!: (e: Error) => void;
    const adapter = makeAdapter({
      send: () =>
        new Promise((_resolve, reject) => {
          rejectSend = reject;
        }),
    });
    const { composer, append } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(textFile());

    const sendPromise = composer.send();
    composer.setQuote({ text: "new quote", messageId: "m-2" });
    rejectSend(new Error("upload failed"));

    await expect(sendPromise).rejects.toThrow("upload failed");

    expect(composer.quote).toBeUndefined();
    expect(composer.text).toBe("hello");
    expect(composer.attachments).toHaveLength(1);
    expect(append).not.toHaveBeenCalled();
  });

  it("keeps text and attachment chips visible while the upload is in flight", async () => {
    let resolveSend!: () => void;
    const adapter = makeAdapter({
      send: (a) =>
        new Promise<CompleteAttachment>((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        }),
    });
    const { composer, append } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(textFile());
    const originalAttachments = composer.attachments;

    const sendPromise = composer.send();

    expect(composer.isSending).toBe(true);
    expect(composer.text).toBe("hello");
    expect(composer.attachments).toEqual(originalAttachments);
    expect(composer.attachments).toHaveLength(1);
    expect(composer.canSend).toBe(false);
    expect(append).not.toHaveBeenCalled();

    resolveSend();
    await sendPromise;

    expect(composer.isEmpty).toBe(true);
    expect(composer.isSending).toBe(false);
    expect(composer.attachments).toHaveLength(0);
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("moves submitted attachments into the thread while upload is in flight when the runtime supports optimistic sends", async () => {
    let resolveSend!: () => void;
    const adapter = makeAdapter({
      send: (a) =>
        new Promise<CompleteAttachment>((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        }),
    });
    const { composer, append, __internal_appendOptimisticAttachmentSend } =
      makeComposer(adapter, { optimisticAttachments: true });

    composer.setText("hello");
    await composer.addAttachment(textFile());
    const originalAttachments = composer.attachments;

    const sendPromise = composer.send({ startRun: false });

    expect(composer.isSending).toBe(true);
    expect(composer.text).toBe("");
    expect(composer.attachments).toHaveLength(0);
    expect(composer.canSend).toBe(false);
    expect(__internal_appendOptimisticAttachmentSend).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]![0].content).toEqual([
      { type: "text", text: "hello" },
    ]);
    expect(append.mock.calls[0]![0].attachments).toEqual(originalAttachments);

    resolveSend();
    await sendPromise;

    expect(composer.isEmpty).toBe(true);
    expect(composer.isSending).toBe(false);
    expect(append).toHaveBeenCalledTimes(2);
    expect(append.mock.calls[1]![0].attachments[0].status).toEqual({
      type: "complete",
    });
  });

  it("does not remove or resend submitted attachments while upload is in flight", async () => {
    let resolveSend!: () => void;
    const send = vi.fn(
      (a: PendingAttachment) =>
        new Promise<CompleteAttachment>((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        }),
    );
    const adapter = makeAdapter({ send });
    const { composer, append } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(textFile());
    const attachmentId = composer.attachments[0]!.id;

    const firstSend = composer.send();
    await composer.removeAttachment(attachmentId);
    await composer.send();

    expect(composer.attachments).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(append).not.toHaveBeenCalled();

    resolveSend();
    await firstSend;

    expect(composer.attachments).toHaveLength(0);
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("does not add attachments while upload is in flight", async () => {
    let resolveSend!: () => void;
    const adapter = makeAdapter({
      send: (a) =>
        new Promise<CompleteAttachment>((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        }),
    });
    const { composer, append } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(textFile());

    const sendPromise = composer.send();
    await composer.addAttachment(textFile());

    expect(composer.attachments).toHaveLength(1);
    expect(composer.attachments[0]!.id).toBe("att-1");

    resolveSend();
    await sendPromise;

    expect(composer.attachments).toHaveLength(0);
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("sends and clears the composer on a successful upload", async () => {
    const { composer, append } = makeComposer(makeAdapter());

    composer.setText("hello");
    await composer.addAttachment(textFile());

    await composer.send();

    expect(composer.isEmpty).toBe(true);
    expect(composer.attachments).toHaveLength(0);
    expect(append).toHaveBeenCalledTimes(1);
    const message = append.mock.calls[0]![0];
    expect(message.content).toEqual([{ type: "text", text: "hello" }]);
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments[0].status).toEqual({ type: "complete" });
  });

  it("sends a text-only message with no attachment adapter", async () => {
    const { composer, append } = makeComposer();

    composer.setText("hello");

    await composer.send();

    expect(composer.isEmpty).toBe(true);
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]![0].content).toEqual([
      { type: "text", text: "hello" },
    ]);
  });
});
