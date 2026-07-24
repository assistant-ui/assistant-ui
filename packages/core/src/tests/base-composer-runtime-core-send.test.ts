import { describe, expect, it, vi } from "vitest";
import { DefaultThreadComposerRuntimeCore } from "../runtime/base/default-thread-composer-runtime-core";
import type { AttachmentAdapter } from "../adapters/attachment";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";
import type { PendingAttachment } from "../types/attachment";

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

const makeComposer = (adapter?: AttachmentAdapter, append = vi.fn()) => {
  const runtime = {
    append,
    cancelRun: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    capabilities: { cancel: false },
    messages: [],
    getModelContext: () => ({ unstable_composerMetadata: undefined }),
    adapters: adapter ? { attachments: adapter } : undefined,
  } as unknown as Omit<ThreadRuntimeCore, "composer"> & {
    adapters?: { attachments?: AttachmentAdapter };
  };
  const composer = new DefaultThreadComposerRuntimeCore(runtime);
  return { composer, append };
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
    expect(append).not.toHaveBeenCalled();
  });

  it("does not clobber text the user typed while the upload was in flight", async () => {
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

    expect(composer.text).toBe("new draft");
    expect(composer.attachments).toHaveLength(1);
    expect(append).not.toHaveBeenCalled();
  });

  it("does not clobber a quote the user set while the upload was in flight", async () => {
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

    expect(composer.quote).toEqual({ text: "new quote", messageId: "m-2" });
    expect(composer.text).toBe("");
    expect(composer.attachments).toHaveLength(1);
    expect(append).not.toHaveBeenCalled();
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

  it("keeps the attachments visible until the upload resolves", async () => {
    let resolveSend!: () => void;
    const adapter = makeAdapter({
      send: (a) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        }),
    });
    const { composer, append } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(textFile());

    const sendPromise = composer.send();
    await Promise.resolve();

    expect(composer.text).toBe("");
    expect(composer.attachments).toHaveLength(1);
    expect(append).not.toHaveBeenCalled();

    resolveSend();
    await sendPromise;

    expect(composer.attachments).toHaveLength(0);
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("keeps an attachment added while the upload was in flight", async () => {
    let resolveSend!: () => void;
    const adapter = makeAdapter({
      add: async ({ file }: { file: File }): Promise<PendingAttachment> => ({
        id: `att-${file.name}`,
        type: "image",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      send: (a) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        }),
    });
    const { composer } = makeComposer(adapter);

    await composer.addAttachment(textFile());

    const sendPromise = composer.send();
    await composer.addAttachment(new File(["x"], "later.txt"));
    resolveSend();
    await sendPromise;

    expect(composer.attachments.map((a) => a.name)).toEqual(["later.txt"]);
  });

  it("ignores a second send while the first upload is still running", async () => {
    let sendCalls = 0;
    let resolveSend!: () => void;
    const adapter = makeAdapter({
      send: (a) => {
        sendCalls += 1;
        return new Promise((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        });
      },
    });
    const { composer, append } = makeComposer(adapter);

    await composer.addAttachment(textFile());

    const sendPromise = composer.send();
    await composer.send();
    resolveSend();
    await sendPromise;

    expect(sendCalls).toBe(1);
    expect(append).toHaveBeenCalledTimes(1);
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

  it("observes asynchronous send tasks without waiting for them", async () => {
    const sendTask = new Promise<void>(() => {});
    const catchSpy = vi.spyOn(sendTask, "catch");
    const { composer } = makeComposer();
    vi.spyOn(composer, "handleSend").mockReturnValue(sendTask);

    composer.setText("hello");
    await expect(composer.send()).resolves.toBeUndefined();

    expect(catchSpy).toHaveBeenCalledTimes(1);
  });

  it("tracks the append task returned by the thread runtime", async () => {
    let resolveAppend!: () => void;
    const appendTask = new Promise<void>((resolve) => {
      resolveAppend = resolve;
    });
    const { composer } = makeComposer(
      undefined,
      vi.fn(() => appendTask),
    );

    const sendTask = composer.handleSend({
      createdAt: new Date(),
      role: "user",
      content: [{ type: "text", text: "hello" }],
      attachments: [],
      runConfig: {},
      metadata: { custom: {} },
    });
    let settled = false;
    void sendTask.then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(settled).toBe(false);

    resolveAppend();
    await sendTask;
  });

  it("does not leak a rejected append task as an unhandled rejection", async () => {
    // A vi.fn mock attaches settled-result handlers to returned promises,
    // marking the rejection as handled; a plain function keeps it unobserved.
    let appendCalls = 0;
    const runtime = {
      append: () => {
        appendCalls += 1;
        return Promise.reject(new Error("append failed"));
      },
      cancelRun: () => {},
      subscribe: () => () => {},
      capabilities: { cancel: false },
      messages: [],
      getModelContext: () => ({ unstable_composerMetadata: undefined }),
    } as unknown as Omit<ThreadRuntimeCore, "composer">;
    const composer = new DefaultThreadComposerRuntimeCore(runtime);

    const rejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      rejections.push(reason);
    };
    const priorListeners = process.listeners("unhandledRejection");
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", onUnhandledRejection);
    try {
      composer.setText("hello");
      await composer.send();
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      process.removeListener("unhandledRejection", onUnhandledRejection);
      for (const listener of priorListeners) {
        process.on("unhandledRejection", listener);
      }
    }

    expect(appendCalls).toBe(1);
    expect(rejections).toEqual([]);
  });
});
