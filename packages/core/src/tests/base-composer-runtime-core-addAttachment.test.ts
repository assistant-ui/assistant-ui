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
