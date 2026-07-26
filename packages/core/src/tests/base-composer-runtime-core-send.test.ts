import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("reports canSend as false while a send is in flight", async () => {
    let resolveSend!: () => void;
    const adapter = makeAdapter({
      send: (a) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        }),
    });
    const { composer } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(textFile());
    expect(composer.canSend).toBe(true);

    const sendPromise = composer.send();
    await Promise.resolve();

    expect(composer.canSend).toBe(false);

    resolveSend();
    await sendPromise;
  });

  it("keeps sending blocked until every upload in a failed batch settles", async () => {
    let resolveA!: () => void;
    let sendCallsForA = 0;
    const adapter = makeAdapter({
      add: async ({ file }: { file: File }): Promise<PendingAttachment> => ({
        id: `att-${file.name}`,
        type: "image",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      send: (a) => {
        if (a.id === "att-a.txt") {
          sendCallsForA += 1;
          return new Promise((resolve) => {
            resolveA = () =>
              resolve({ ...a, status: { type: "complete" }, content: [] });
          });
        }
        return Promise.reject(new Error("b failed"));
      },
    });
    const { composer } = makeComposer(adapter);

    await composer.addAttachment(new File(["a"], "a.txt"));
    await composer.addAttachment(new File(["b"], "b.txt"));

    const sendPromise = composer.send();
    const caught = sendPromise.catch(() => {});

    // b's rejection has already surfaced from Promise.all, but a's upload is
    // still running — sending must stay blocked so a retry can't fire a second
    // adapter.send for the attachment that's still in flight.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(composer.canSend).toBe(false);

    resolveA();
    await caught;
    await vi.waitFor(() => expect(composer.canSend).toBe(true));
    expect(sendCallsForA).toBe(1);
  });

  it("restores the draft before a failed batch's stragglers settle", async () => {
    let resolveA!: () => void;
    const adapter = makeAdapter({
      add: async ({ file }: { file: File }): Promise<PendingAttachment> => ({
        id: `att-${file.name}`,
        type: "image",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      send: (a) => {
        if (a.id === "att-a.txt") {
          return new Promise((resolve) => {
            resolveA = () =>
              resolve({ ...a, status: { type: "complete" }, content: [] });
          });
        }
        return Promise.reject(new Error("b failed"));
      },
    });
    const { composer } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(new File(["a"], "a.txt"));
    await composer.addAttachment(new File(["b"], "b.txt"));

    const sendPromise = composer.send();
    await expect(sendPromise).rejects.toThrow("b failed");

    expect(composer.text).toBe("hello");
    expect(composer.canSend).toBe(false);

    resolveA();
    await vi.waitFor(() => expect(composer.canSend).toBe(true));
  });

  it("excludes a removed attachment even when the upload settles before the adapter remove", async () => {
    let resolveSend!: () => void;
    let resolveRemove!: () => void;
    const adapter = makeAdapter({
      send: (a) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        }),
      remove: () =>
        new Promise((resolve) => {
          resolveRemove = () => resolve();
        }),
    });
    const { composer, append } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(textFile());

    const sendPromise = composer.send();
    const removePromise = composer.removeAttachment("att-1");
    resolveSend();
    await sendPromise;

    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]![0].attachments).toHaveLength(0);

    resolveRemove();
    await removePromise;
  });

  it("releases the in-flight lock on reset so a stalled send cannot brick the composer", async () => {
    const adapter = makeAdapter({
      send: () => new Promise(() => {}),
    });
    const { composer, append } = makeComposer(adapter);

    await composer.addAttachment(textFile());
    void composer.send();
    await Promise.resolve();
    expect(composer.canSend).toBe(false);

    await composer.reset();
    composer.setText("again");
    expect(composer.canSend).toBe(true);

    await composer.send();
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("discards a stalled send that settles after reset instead of appending it", async () => {
    let resolveSend!: () => void;
    const adapter = makeAdapter({
      send: (a) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        }),
    });
    const { composer, append } = makeComposer(adapter);

    composer.setText("stale draft");
    await composer.addAttachment(textFile());
    void composer.send();
    await Promise.resolve();

    await composer.reset();
    composer.setText("fresh draft");
    await composer.send();
    expect(append).toHaveBeenCalledTimes(1);

    resolveSend();
    await Promise.resolve();
    await Promise.resolve();

    expect(append).toHaveBeenCalledTimes(1);
    expect(composer.canSend).toBe(false);
    composer.setText("still unlocked");
    expect(composer.canSend).toBe(true);
  });

  it("excludes an attachment removed while its upload was still in flight", async () => {
    let resolveSend!: () => void;
    const adapter = makeAdapter({
      send: (a) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({ ...a, status: { type: "complete" }, content: [] });
        }),
    });
    const { composer, append } = makeComposer(adapter);

    await composer.addAttachment(textFile());

    const sendPromise = composer.send();
    await composer.removeAttachment("att-1");
    resolveSend();
    await sendPromise;

    expect(append).toHaveBeenCalledTimes(1);
    const message = append.mock.calls[0]![0];
    expect(message.attachments).toHaveLength(0);
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

describe("BaseComposerRuntimeCore send event listener isolation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isolates a throwing send listener so send() still resolves and later listeners run", async () => {
    const listenerError = new Error("telemetry failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const laterListener = vi.fn();
    const { composer, append } = makeComposer();

    composer.unstable_on("send", () => {
      throw listenerError;
    });
    composer.unstable_on("send", laterListener);

    composer.setText("hello");
    await expect(composer.send()).resolves.toBeUndefined();

    expect(append).toHaveBeenCalledTimes(1);
    expect(laterListener).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      '[assistant-ui] Composer runtime "send" listener threw an error',
      listenerError,
    );
  });

  it("isolates an async-rejecting send listener so send() still resolves and later listeners run", async () => {
    const listenerError = new Error("async telemetry failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const laterListener = vi.fn();
    const { composer, append } = makeComposer();

    composer.unstable_on("send", async () => {
      throw listenerError;
    });
    composer.unstable_on("send", laterListener);

    composer.setText("hello");
    await expect(composer.send()).resolves.toBeUndefined();

    expect(append).toHaveBeenCalledTimes(1);
    expect(laterListener).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        '[assistant-ui] Composer runtime "send" listener threw an error',
        listenerError,
      );
    });
  });
});
