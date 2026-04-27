import { describe, expect, it, vi } from "vitest";
import { DefaultThreadComposerRuntimeCore } from "../runtime/base/default-thread-composer-runtime-core";
import type { AttachmentAdapter } from "../adapters/attachment";
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
    expect(onAdd).not.toHaveBeenCalled();
    expect(composer.attachments).toHaveLength(1);
    const att = composer.attachments[0]!;
    expect(att.status.type).toBe("incomplete");
    if (att.status.type === "incomplete") {
      expect(att.status.reason).toBe("error");
    }
  });
});
