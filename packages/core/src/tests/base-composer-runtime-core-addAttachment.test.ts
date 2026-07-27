import { describe, expect, it, vi } from "vitest";
import { DefaultThreadComposerRuntimeCore } from "../runtime/base/default-thread-composer-runtime-core";
import {
  SimpleTextAttachmentAdapter,
  type AttachmentAdapter,
} from "../adapters/attachment";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";
import type { PendingAttachment } from "../types/attachment";

const makeAdapter = (
  overrides: Partial<AttachmentAdapter> = {},
): AttachmentAdapter => ({
  accept: "image/*",
  add: async ({ file }: { file: File }): Promise<PendingAttachment> => ({
    id: "att-1",
    type: "image",
    name: file.name,
    contentType: file.type,
    file,
    status: { type: "running", reason: "uploading", progress: 0 },
  }),
  remove: async () => {},
  send: async (a) => ({ ...a, status: { type: "complete" }, content: [] }),
  ...overrides,
});

const makeComposer = (adapter?: AttachmentAdapter) => {
  const runtime = {
    append: vi.fn(),
    cancelRun: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    capabilities: { cancel: false },
    messages: [],
    adapters: adapter ? { attachments: adapter } : undefined,
  } as unknown as Omit<ThreadRuntimeCore, "composer"> & {
    adapters?: { attachments?: AttachmentAdapter };
  };
  return new DefaultThreadComposerRuntimeCore(runtime);
};

const makeUploadingAttachment = (
  file: File,
  id: string,
): PendingAttachment => ({
  id,
  type: "image",
  name: file.name,
  contentType: file.type,
  file,
  status: {
    type: "running",
    reason: "uploading",
    progress: 0,
  },
});

describe("BaseComposerRuntimeCore.addAttachment error events", () => {
  it("emits attachmentAddError when no adapter is configured", async () => {
    const composer = makeComposer();
    const onError = vi.fn();
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAddError", onError);
    composer.unstable_on("attachmentAdd", onAdd);

    await expect(
      composer.addAttachment(new File(["x"], "f.txt", { type: "text/plain" })),
    ).rejects.toThrow("Attachments are not supported");

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "no-adapter",
        message: "Attachments are not supported",
        error: expect.any(Error),
      }),
    );
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("emits attachmentAddError when file type is rejected by adapter.accept", async () => {
    const composer = makeComposer(makeAdapter());
    const onError = vi.fn();
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAddError", onError);
    composer.unstable_on("attachmentAdd", onAdd);

    await expect(
      composer.addAttachment(new File(["x"], "f.txt", { type: "text/plain" })),
    ).rejects.toThrow(/File type text\/plain is not accepted/);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "not-accepted",
        message: expect.stringContaining(
          "File type text/plain is not accepted",
        ),
        error: expect.any(Error),
      }),
    );
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("emits attachmentAddError when adapter.add throws", async () => {
    const composer = makeComposer(
      makeAdapter({
        add: async () => {
          throw new Error("upload failed");
        },
      }),
    );
    const onError = vi.fn();
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAddError", onError);
    composer.unstable_on("attachmentAdd", onAdd);

    await expect(
      composer.addAttachment(new File(["x"], "f.png", { type: "image/png" })),
    ).rejects.toThrow("upload failed");

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "adapter-error",
        message: "upload failed",
        error: expect.any(Error),
      }),
    );
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("emits attachmentAdd on successful add", async () => {
    const composer = makeComposer(makeAdapter());
    const onError = vi.fn();
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAddError", onError);
    composer.unstable_on("attachmentAdd", onAdd);

    await composer.addAttachment(
      new File(["x"], "f.png", { type: "image/png" }),
    );

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not restore an attachment removed while add is still running", async () => {
    let finishUpload!: () => void;
    const uploadPending = new Promise<void>((resolve) => {
      finishUpload = resolve;
    });
    let finishRemoval!: () => void;
    const removalPending = new Promise<void>((resolve) => {
      finishRemoval = resolve;
    });
    const remove = vi.fn(() => removalPending);
    const continueUpload = vi.fn();
    const cleanUpUpload = vi.fn();
    const composer = makeComposer(
      makeAdapter({
        remove,
        async *add({ file }: { file: File }) {
          const attachment = makeUploadingAttachment(file, "att-1");
          try {
            yield attachment;
            await uploadPending;
            yield {
              ...attachment,
              status: { type: "requires-action", reason: "composer-send" },
            };
            continueUpload();
            yield attachment;
          } finally {
            cleanUpUpload();
          }
        },
      }),
    );
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAdd", onAdd);

    const addTask = composer.addAttachment(
      new File(["x"], "f.png", { type: "image/png" }),
    );
    await vi.waitFor(() => {
      expect(composer.attachments).toHaveLength(1);
    });

    const removeTask = composer.removeAttachment("att-1");
    finishUpload();
    await addTask;

    expect(remove).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
    expect(continueUpload).not.toHaveBeenCalled();
    expect(cleanUpUpload).toHaveBeenCalledTimes(1);

    finishRemoval();
    await removeTask;
    expect(composer.attachments).toHaveLength(0);
  });

  it("settles a pending attachment when adapter removal fails", async () => {
    let finishUpload!: () => void;
    const uploadPending = new Promise<void>((resolve) => {
      finishUpload = resolve;
    });
    const cleanUpUpload = vi.fn();
    const composer = makeComposer(
      makeAdapter({
        remove: vi.fn().mockRejectedValue(new Error("remove failed")),
        async *add({ file }: { file: File }) {
          const attachment = makeUploadingAttachment(file, "att-1");
          try {
            yield attachment;
            await uploadPending;
            yield {
              ...attachment,
              status: { type: "requires-action", reason: "composer-send" },
            };
          } finally {
            cleanUpUpload();
          }
        },
      }),
    );
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAdd", onAdd);

    const addTask = composer.addAttachment(
      new File(["x"], "f.png", { type: "image/png" }),
    );
    await vi.waitFor(() => {
      expect(composer.attachments).toHaveLength(1);
    });

    await expect(composer.removeAttachment("att-1")).rejects.toThrow(
      "remove failed",
    );
    expect(composer.attachments[0]?.status).toEqual({
      type: "incomplete",
      reason: "error",
      message: "remove failed",
    });

    finishUpload();
    await addTask;

    expect(composer.attachments[0]?.status.type).toBe("incomplete");
    expect(cleanUpUpload).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("keeps a concurrent add registered before its first yield", async () => {
    let startSlowUpload!: () => void;
    const slowUploadStarted = new Promise<void>((resolve) => {
      startSlowUpload = resolve;
    });
    let finishSlowUpload!: () => void;
    const slowUploadPending = new Promise<void>((resolve) => {
      finishSlowUpload = resolve;
    });
    const composer = makeComposer(
      makeAdapter({
        async *add({ file }: { file: File }) {
          const attachment = makeUploadingAttachment(file, `att-${file.name}`);
          if (file.name === "slow.png") await slowUploadStarted;
          yield attachment;
          if (file.name === "slow.png") await slowUploadPending;
          yield {
            ...attachment,
            status: { type: "requires-action", reason: "composer-send" },
          };
        },
      }),
    );
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAdd", onAdd);

    const slowAddTask = composer.addAttachment(
      new File(["slow"], "slow.png", { type: "image/png" }),
    );
    await composer.addAttachment(
      new File(["fast"], "fast.png", { type: "image/png" }),
    );

    startSlowUpload();
    await vi.waitFor(() => {
      expect(
        composer.attachments.some(
          (attachment) => attachment.id === "att-slow.png",
        ),
      ).toBe(true);
    });
    await composer.removeAttachment("att-slow.png");
    finishSlowUpload();
    await slowAddTask;

    expect(
      composer.attachments.some(
        (attachment) => attachment.id === "att-slow.png",
      ),
    ).toBe(false);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("cancels an add cleared before its first yield", async () => {
    let startUpload!: () => void;
    const uploadPending = new Promise<void>((resolve) => {
      startUpload = resolve;
    });
    const composer = makeComposer(
      makeAdapter({
        async *add({ file }: { file: File }) {
          await uploadPending;
          yield makeUploadingAttachment(file, "att-1");
        },
      }),
    );
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAdd", onAdd);

    const addTask = composer.addAttachment(
      new File(["x"], "f.png", { type: "image/png" }),
    );
    await composer.clearAttachments();
    startUpload();
    await addTask;

    expect(composer.attachments).toHaveLength(0);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("cancels a promise add cleared before it resolves", async () => {
    let finishUpload!: () => void;
    const uploadPending = new Promise<void>((resolve) => {
      finishUpload = resolve;
    });
    const composer = makeComposer(
      makeAdapter({
        add: async ({ file }: { file: File }) => {
          await uploadPending;
          return makeUploadingAttachment(file, "att-1");
        },
      }),
    );
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAdd", onAdd);

    const addTask = composer.addAttachment(
      new File(["x"], "f.png", { type: "image/png" }),
    );
    await composer.clearAttachments();
    finishUpload();
    await addTask;

    expect(composer.attachments).toHaveLength(0);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("cancels an add reset before its first yield", async () => {
    let startUpload!: () => void;
    const uploadPending = new Promise<void>((resolve) => {
      startUpload = resolve;
    });
    const composer = makeComposer(
      makeAdapter({
        async *add({ file }: { file: File }) {
          await uploadPending;
          yield makeUploadingAttachment(file, "att-1");
        },
      }),
    );
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAdd", onAdd);

    const addTask = composer.addAttachment(
      new File(["x"], "f.png", { type: "image/png" }),
    );
    await composer.reset();
    startUpload();
    await addTask;

    expect(composer.attachments).toHaveLength(0);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("cancels every concurrent add sharing an attachment id", async () => {
    let finishUploads!: () => void;
    const uploadsPending = new Promise<void>((resolve) => {
      finishUploads = resolve;
    });
    const firstYieldsConsumed = vi.fn();
    const composer = makeComposer(
      makeAdapter({
        async *add({ file }: { file: File }) {
          const attachment = makeUploadingAttachment(file, "shared");
          yield attachment;
          firstYieldsConsumed();
          await uploadsPending;
          yield {
            ...attachment,
            status: { type: "requires-action", reason: "composer-send" },
          };
        },
      }),
    );
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAdd", onAdd);

    const addTasks = [
      composer.addAttachment(new File(["a"], "a.png", { type: "image/png" })),
      composer.addAttachment(new File(["b"], "b.png", { type: "image/png" })),
    ];
    await vi.waitFor(() => {
      expect(firstYieldsConsumed).toHaveBeenCalledTimes(2);
    });

    await composer.removeAttachment("shared");
    finishUploads();
    await Promise.all(addTasks);

    expect(composer.attachments).toHaveLength(0);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("adds prepared attachments when File is unavailable", async () => {
    const composer = makeComposer();
    const fileConstructor = globalThis.File;
    vi.stubGlobal("File", undefined);

    try {
      await composer.addAttachment({
        name: "notes.txt",
        contentType: "text/plain",
        content: [{ type: "text", text: "hello" }],
      });
    } finally {
      vi.stubGlobal("File", fileConstructor);
    }

    expect(composer.attachments[0]).toMatchObject({
      type: "document",
      name: "notes.txt",
      contentType: "text/plain",
      content: [{ type: "text", text: "hello" }],
      status: { type: "complete" },
    });
  });

  it("uses the adapter for foreign files that expose content", async () => {
    const add = vi.fn(makeAdapter().add);
    const composer = makeComposer(makeAdapter({ add }));
    const foreignFile = {
      name: "photo.png",
      type: "image/png",
      lastModified: 0,
      content: [{ type: "text", text: "implementation detail" }],
    } as File;

    await composer.addAttachment(foreignFile);

    expect(add).toHaveBeenCalledWith({ file: foreignFile });
    expect(composer.attachments[0]).toMatchObject({
      type: "image",
      name: "photo.png",
      contentType: "image/png",
    });
  });

  it("accepts JSON files with the application/json media type", async () => {
    const composer = makeComposer(new SimpleTextAttachmentAdapter());

    await expect(
      composer.addAttachment(
        new File(["{}"], "data.json", { type: "application/json" }),
      ),
    ).resolves.toBeUndefined();

    expect(composer.attachments[0]).toMatchObject({
      type: "document",
      name: "data.json",
      contentType: "application/json",
    });
  });

  it("keeps different files with the same name as separate attachments", async () => {
    const composer = makeComposer(new SimpleTextAttachmentAdapter());

    await composer.addAttachment(
      new File(["first"], "notes.txt", { type: "text/plain" }),
    );
    await composer.addAttachment(
      new File(["second"], "notes.txt", { type: "text/plain" }),
    );

    expect(composer.attachments).toHaveLength(2);
    expect(composer.attachments[0]!.id).not.toBe(composer.attachments[1]!.id);
    expect(composer.attachments.map((attachment) => attachment.name)).toEqual([
      "notes.txt",
      "notes.txt",
    ]);
  });

  it("does not let subscriber errors mask the original throw", async () => {
    const composer = makeComposer(makeAdapter());
    composer.unstable_on("attachmentAddError", () => {
      throw new Error("subscriber boom");
    });

    await expect(
      composer.addAttachment(new File(["x"], "f.txt", { type: "text/plain" })),
    ).rejects.toThrow(/File type text\/plain is not accepted/);
  });

  it("emits attachmentAddError when async generator adapter throws mid-iteration", async () => {
    const composer = makeComposer(
      makeAdapter({
        async *add({ file }: { file: File }) {
          yield {
            id: "att-1",
            type: "image" as const,
            name: file.name,
            contentType: file.type,
            file,
            status: {
              type: "running" as const,
              reason: "uploading" as const,
              progress: 0,
            },
          };
          throw new Error("network error");
        },
      }),
    );
    const onError = vi.fn();
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAddError", onError);
    composer.unstable_on("attachmentAdd", onAdd);

    await expect(
      composer.addAttachment(new File(["x"], "f.png", { type: "image/png" })),
    ).rejects.toThrow("network error");

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "adapter-error",
        message: "network error",
        attachmentId: "att-1",
        error: expect.any(Error),
      }),
    );
    expect(onAdd).not.toHaveBeenCalled();
    expect(composer.attachments).toHaveLength(1);
    const att = composer.attachments[0]!;
    expect(att.status).toEqual({
      type: "incomplete",
      reason: "error",
      message: "network error",
    });
  });

  it("forwards the status message when adapter yields an errored attachment with one", async () => {
    const composer = makeComposer(
      makeAdapter({
        add: async ({ file }) => ({
          id: "att-3",
          type: "image",
          name: file.name,
          contentType: file.type,
          file,
          status: {
            type: "incomplete",
            reason: "error",
            message: "Failed to upload file: 403 Forbidden",
          },
        }),
      }),
    );
    const onError = vi.fn();
    composer.unstable_on("attachmentAddError", onError);

    await composer.addAttachment(
      new File(["x"], "f.png", { type: "image/png" }),
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "adapter-error",
        message: "Failed to upload file: 403 Forbidden",
        attachmentId: "att-3",
      }),
    );
    expect(onError.mock.calls[0]![0]).not.toHaveProperty("error");
  });

  it("emits attachmentAddError with attachment id when adapter yields an errored attachment", async () => {
    const composer = makeComposer(
      makeAdapter({
        add: async ({ file }) => ({
          id: "att-2",
          type: "image",
          name: file.name,
          contentType: file.type,
          file,
          status: { type: "incomplete", reason: "error" },
        }),
      }),
    );
    const onError = vi.fn();
    const onAdd = vi.fn();
    composer.unstable_on("attachmentAddError", onError);
    composer.unstable_on("attachmentAdd", onAdd);

    await composer.addAttachment(
      new File(["x"], "f.png", { type: "image/png" }),
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "adapter-error",
        message: "Attachment upload did not complete successfully.",
        attachmentId: "att-2",
      }),
    );
    expect(onAdd).not.toHaveBeenCalled();
  });
});
