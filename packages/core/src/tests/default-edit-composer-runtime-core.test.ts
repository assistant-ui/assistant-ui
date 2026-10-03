import { afterEach, describe, expect, it, vi } from "vitest";
import { DefaultEditComposerRuntimeCore } from "../runtime/base/default-edit-composer-runtime-core";
import type { AppendMessage, ThreadMessage } from "../types/message";
import type {
  CompleteAttachment,
  PendingAttachment,
} from "../types/attachment";
import type { AttachmentAdapter } from "../adapters/attachment";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";

const makeRuntime = (
  options?: {
    messages?: ThreadMessage[];
    composerMetadata?: Record<string, unknown>;
  },
  append = vi.fn(),
) => {
  const runtime = {
    append,
    composer: { runConfig: {} },
    voice: undefined,
    subscribe: () => () => {},
    messages: options?.messages ?? [],
    getModelContext: () => ({
      ...(options?.composerMetadata
        ? { unstable_composerMetadata: options.composerMetadata }
        : {}),
    }),
  } as unknown as ThreadRuntimeCore & { adapters?: undefined };
  return { runtime, append };
};

const makeUserMessage = (overrides?: Partial<ThreadMessage>): ThreadMessage =>
  ({
    id: "msg-1",
    role: "user",
    createdAt: new Date(),
    content: [{ type: "text", text: "hello" }],
    attachments: [],
    metadata: { custom: {} },
    ...overrides,
  }) as ThreadMessage;

const makeCompleteAttachment = (
  id: string,
  name = "file.pdf",
): CompleteAttachment => ({
  id,
  type: "document",
  name,
  contentType: "application/pdf",
  content: [
    { type: "file", data: "blob", mimeType: "application/pdf", filename: name },
  ],
  status: { type: "complete" },
});

describe("DefaultEditComposerRuntimeCore", () => {
  it("disables send while a voice session is connected and re-notifies on the flip", () => {
    const listeners = new Set<() => void>();
    const { runtime } = makeRuntime();
    const live = runtime as unknown as {
      voice: unknown;
      subscribe: (callback: () => void) => () => void;
    };
    live.voice = undefined;
    live.subscribe = (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    };
    const endEdit = vi.fn();
    const composer = new DefaultEditComposerRuntimeCore(runtime, endEdit, {
      parentId: null,
      message: makeUserMessage(),
    });
    const notify = vi.fn();
    composer.subscribe(notify);
    expect(composer.canSend).toBe(true);

    live.voice = {
      status: { type: "running" },
      isMuted: false,
      mode: "listening",
      canSendText: true,
    };
    for (const listener of listeners) listener();
    expect(composer.canSend).toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);

    for (const listener of listeners) listener();
    expect(notify).toHaveBeenCalledTimes(1);

    live.voice = undefined;
    for (const listener of listeners) listener();
    expect(composer.canSend).toBe(true);
    expect(notify).toHaveBeenCalledTimes(2);

    composer.cancel();
    expect(endEdit).toHaveBeenCalledOnce();
    expect(listeners.size).toBe(0);
  });

  describe("construction", () => {
    it("seeds composer text from the edited message", () => {
      const { runtime } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: null,
        message: makeUserMessage({
          content: [{ type: "text", text: "original" }],
        }),
      });
      expect(composer.text).toBe("original");
    });

    it("seeds attachments from message.attachments", () => {
      const { runtime } = makeRuntime();
      const attachment = makeCompleteAttachment("att-1");
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: null,
        message: makeUserMessage({ attachments: [attachment] }),
      });
      expect(composer.attachments).toEqual([attachment]);
    });

    it("lifts non-text content parts into attachments", () => {
      const { runtime } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: null,
        message: makeUserMessage({
          content: [
            { type: "text", text: "here is a file" },
            {
              type: "file",
              data: "blob",
              mimeType: "application/pdf",
              filename: "report.pdf",
            },
          ],
        }),
      });
      expect(composer.attachments).toHaveLength(1);
      expect(composer.attachments[0]).toMatchObject({
        type: "document",
        name: "report.pdf",
        contentType: "application/pdf",
        status: { type: "complete" },
      });
    });

    it("merges message.attachments with lifted content parts", () => {
      const { runtime } = makeRuntime();
      const attachment = makeCompleteAttachment("att-1", "existing.pdf");
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: null,
        message: makeUserMessage({
          attachments: [attachment],
          content: [
            { type: "text", text: "x" },
            {
              type: "file",
              data: "b",
              mimeType: "application/pdf",
              filename: "inline.pdf",
            },
          ],
        }),
      });
      expect(composer.attachments).toHaveLength(2);
      expect(composer.attachments[0]).toBe(attachment);
      expect(composer.attachments[1]).toMatchObject({ name: "inline.pdf" });
    });

    it("exposes parentId and sourceId", () => {
      const { runtime } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: "parent-7",
        message: makeUserMessage(),
      });
      expect(composer.parentId).toBe("parent-7");
      expect(composer.sourceId).toBe("msg-1");
    });
  });

  describe("send behavior", () => {
    it("calls append even when nothing changed, branching with the same message", async () => {
      const { runtime, append } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: "p1",
        message: makeUserMessage({
          content: [{ type: "text", text: "same" }],
        }),
      });
      await composer.send();
      expect(append).toHaveBeenCalledTimes(1);
      const appended = append.mock.calls[0]![0] as AppendMessage;
      expect(appended.content).toEqual([{ type: "text", text: "same" }]);
      expect(appended.parentId).toBe("p1");
      expect(appended.sourceId).toBe("msg-1");
    });

    it("calls append when text changes", async () => {
      const { runtime, append } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: "p1",
        message: makeUserMessage({
          content: [{ type: "text", text: "old" }],
        }),
      });
      composer.setText("new");
      await composer.send();
      expect(append).toHaveBeenCalledTimes(1);
      const appended = append.mock.calls[0]![0] as AppendMessage;
      expect(appended.content).toEqual([{ type: "text", text: "new" }]);
      expect(appended.parentId).toBe("p1");
      expect(appended.sourceId).toBe("msg-1");
    });

    it("drops a removed attachment from the sent message", async () => {
      const { runtime, append } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: null,
        message: makeUserMessage({
          content: [
            { type: "text", text: "original" },
            {
              type: "file",
              data: "blob",
              mimeType: "application/pdf",
              filename: "doc.pdf",
            },
          ],
        }),
      });
      expect(composer.attachments).toHaveLength(1);
      await composer.removeAttachment(composer.attachments[0]!.id);
      await composer.send();
      expect(append).toHaveBeenCalledTimes(1);
      const appended = append.mock.calls[0]![0] as AppendMessage;
      expect(appended.attachments).toHaveLength(0);
      expect(appended.content).toEqual([{ type: "text", text: "original" }]);
    });

    it("preserves the attachment without duplicating it when only text changes", async () => {
      const { runtime, append } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: null,
        message: makeUserMessage({
          content: [
            { type: "text", text: "old" },
            {
              type: "file",
              data: "blob",
              mimeType: "application/pdf",
              filename: "doc.pdf",
            },
          ],
        }),
      });
      composer.setText("new text");
      await composer.send();
      const appended = append.mock.calls[0]![0] as AppendMessage;
      expect(appended.content).toEqual([{ type: "text", text: "new text" }]);
      expect(appended.attachments).toHaveLength(1);
      expect(appended.attachments![0]).toMatchObject({ name: "doc.pdf" });
    });

    it("forwards startRun even when text and attachments are unchanged", async () => {
      const { runtime, append } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: null,
        message: makeUserMessage({
          content: [{ type: "text", text: "same" }],
        }),
      });
      await composer.send({ startRun: true });
      expect(append).toHaveBeenCalledTimes(1);
      const appended = append.mock.calls[0]![0] as AppendMessage;
      expect(appended.startRun).toBe(true);
    });
  });

  describe("non-user messages", () => {
    it("does not lift non-text parts for assistant messages", () => {
      const { runtime } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: null,
        message: {
          id: "msg-a",
          role: "assistant",
          createdAt: new Date(),
          content: [
            { type: "text", text: "answer" },
            {
              type: "file",
              data: "blob",
              mimeType: "application/pdf",
              filename: "doc.pdf",
            },
          ],
          status: { type: "complete", reason: "stop" },
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        } as ThreadMessage,
      });
      expect(composer.attachments).toHaveLength(0);
    });

    it("preserves non-text content parts of assistant messages on send", async () => {
      const { runtime, append } = makeRuntime();
      const fileParts = [
        {
          type: "file" as const,
          data: "blob",
          mimeType: "application/pdf",
          filename: "doc.pdf",
        },
        { type: "reasoning" as const, text: "chain of thought" },
      ];
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: null,
        message: {
          id: "msg-a",
          role: "assistant",
          createdAt: new Date(),
          content: [{ type: "text", text: "old answer" }, ...fileParts],
          status: { type: "complete", reason: "stop" },
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        } as ThreadMessage,
      });
      composer.setText("new answer");
      await composer.send();
      expect(append).toHaveBeenCalledTimes(1);
      const appended = append.mock.calls[0]![0] as AppendMessage;
      expect(appended.content).toEqual([
        { type: "text", text: "new answer" },
        ...fileParts,
      ]);
      expect(appended.attachments ?? []).toHaveLength(0);
    });
  });

  describe("lifecycle", () => {
    it("invokes endEditCallback after send", async () => {
      const endEdit = vi.fn();
      const { runtime } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, endEdit, {
        parentId: null,
        message: makeUserMessage(),
      });
      composer.setText("changed");
      await composer.send();
      expect(endEdit).toHaveBeenCalledTimes(1);
    });

    it("tracks the append task while exiting edit mode immediately", async () => {
      let resolveAppend!: () => void;
      const appendTask = new Promise<void>((resolve) => {
        resolveAppend = resolve;
      });
      const { runtime } = makeRuntime(
        undefined,
        vi.fn(() => appendTask),
      );
      const endEdit = vi.fn();
      const composer = new DefaultEditComposerRuntimeCore(runtime, endEdit, {
        parentId: null,
        message: makeUserMessage(),
      });

      const sendTask = composer.handleSend({
        createdAt: new Date(),
        role: "user",
        content: [{ type: "text", text: "changed" }],
        attachments: [],
        runConfig: {},
        metadata: { custom: {} },
      });
      let settled = false;
      void sendTask.then(() => {
        settled = true;
      });
      await Promise.resolve();

      expect(endEdit).toHaveBeenCalledTimes(1);
      expect(settled).toBe(false);

      resolveAppend();
      await sendTask;
    });

    it("invokes endEditCallback on cancel", () => {
      const endEdit = vi.fn();
      const { runtime } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, endEdit, {
        parentId: null,
        message: makeUserMessage(),
      });
      composer.cancel();
      expect(endEdit).toHaveBeenCalledTimes(1);
    });
  });
});

describe("DefaultEditComposerRuntimeCore sending attachments", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const attachmentAdapter = (
    overrides: Partial<AttachmentAdapter>,
  ): AttachmentAdapter => ({
    accept: "*",
    add: async ({ file }): Promise<PendingAttachment> => ({
      id: "f",
      type: "file",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    }),
    remove: async () => {},
    send: () => new Promise(() => {}),
    ...overrides,
  });

  const makeEditComposer = (attachments: AttachmentAdapter) => {
    const runtime = {
      append: vi.fn(),
      composer: { runConfig: {} },
      voice: undefined,
      subscribe: () => () => {},
      messages: [],
      getModelContext: () => ({}),
      adapters: { attachments },
    } as unknown as ThreadRuntimeCore & {
      adapters: { attachments: AttachmentAdapter };
    };
    return new DefaultEditComposerRuntimeCore(runtime, () => {}, {
      parentId: null,
      message: makeUserMessage(),
    });
  };

  const file = () => new File(["content"], "f.txt", { type: "text/plain" });

  it("removes a pending attachment once when the edit is reset while sending", async () => {
    const remove = vi.fn(async () => {});
    const composer = makeEditComposer(attachmentAdapter({ remove }));

    await composer.addAttachment(file());
    void composer.send();
    await composer.reset();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("keeps the upload an edit was sent with when the edit ends", async () => {
    const remove = vi.fn(async () => {});
    const composer = makeEditComposer(
      attachmentAdapter({
        remove,
        send: async (attachment) => ({
          ...attachment,
          status: { type: "complete" },
          content: [],
        }),
      }),
    );

    await composer.addAttachment(file());
    await composer.send();
    await Promise.resolve();

    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps an attachment whose removal failed when the send fails after it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const upload = Promise.withResolvers<void>();
    const send = vi
      .fn<AttachmentAdapter["send"]>()
      .mockImplementationOnce(async () => {
        await upload.promise;
        throw new Error("upload failed");
      })
      .mockImplementation(() => new Promise(() => {}));
    const composer = makeEditComposer(
      attachmentAdapter({
        remove: async () => {
          throw new Error("remove failed");
        },
        send,
      }),
    );

    await composer.addAttachment(file());
    const sending = composer.send();
    await expect(composer.removeAttachment("f")).rejects.toThrow(
      "remove failed",
    );
    upload.resolve();
    await sending;

    expect(composer.attachments.find(({ id }) => id === "f")?.status).toEqual({
      type: "incomplete",
      reason: "error",
      message: "remove failed",
    });
    void composer.send();
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  });

  it("keeps the reason an upload failed on the edit's attachment", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const composer = makeEditComposer(
      attachmentAdapter({
        send: async () => {
          throw new Error("upload failed");
        },
      }),
    );

    await composer.addAttachment(file());
    await composer.send();

    expect(composer.submission).toBeUndefined();
    expect(composer.attachments.find(({ id }) => id === "f")?.status).toEqual({
      type: "incomplete",
      reason: "error",
      message: "upload failed",
    });
  });
});
