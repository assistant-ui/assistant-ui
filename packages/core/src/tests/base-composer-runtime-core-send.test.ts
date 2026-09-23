import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import { CloudFileAttachmentAdapter } from "../react/runtimes/cloud/CloudFileAttachmentAdapter";
import { DefaultThreadComposerRuntimeCore } from "../runtime/base/default-thread-composer-runtime-core";
import type { AttachmentAdapter } from "../adapters/attachment";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";
import type { PendingAttachment } from "../types/attachment";
import { MessageNotSentError } from "../types/error";
import { BaseComposerRuntimeCore } from "../runtime/base/base-composer-runtime-core";
import { LocalRuntimeCore } from "../runtimes/local/local-runtime-core";

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

const deferred = () => {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

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

  it("snapshots role and run config before uploading attachments", async () => {
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
    composer.setRole("assistant");
    composer.setRunConfig({ custom: { modelName: "model-a" } });
    await composer.addAttachment(textFile());

    const sendPromise = composer.send();
    composer.setRole("system");
    composer.setRunConfig({ custom: { modelName: "model-b" } });
    resolveSend();
    await sendPromise;

    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "assistant",
        runConfig: { custom: { modelName: "model-a" } },
      }),
    );
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

  it.each(["before", "after"])(
    "reuses completed attachments when a sibling fails %s they finish",
    async (failureOrder) => {
      const successfulUpload = deferred();
      const failedUpload = deferred();
      const error = new Error("temporary upload failure");
      const send = vi.fn(async (attachment: PendingAttachment) => {
        if (attachment.name === "a.txt") {
          await successfulUpload.promise;
        } else {
          await failedUpload.promise;
        }
        return {
          ...attachment,
          status: { type: "complete" as const },
          content: [{ type: "image" as const, image: "https://example.com/a" }],
        };
      });
      const adapter = makeAdapter({
        add: async ({ file }) => ({
          id: file.name,
          type: "image",
          name: file.name,
          contentType: file.type,
          file,
          status: { type: "requires-action", reason: "composer-send" },
        }),
        send,
      });
      const { composer, append } = makeComposer(adapter);
      await composer.addAttachment(new File(["a"], "a.txt"));
      await composer.addAttachment(new File(["b"], "b.txt"));
      const original = composer.attachments;
      composer.setText("hello");

      const sending = composer.send();
      const rejected = expect(sending).rejects.toBe(error);
      if (failureOrder === "after") {
        successfulUpload.resolve();
        await successfulUpload.promise;
      }
      failedUpload.reject(error);
      await rejected;
      if (failureOrder === "before") {
        expect(composer.canSend).toBe(false);
        successfulUpload.resolve();
      }
      await vi.waitFor(() => expect(composer.canSend).toBe(true));

      expect(composer.attachments[0]).toBe(original[0]);
      expect(composer.attachments[1]).toBe(original[1]);
      send.mockImplementation(async (attachment) => {
        if (attachment.name === "a.txt") throw new Error("Already consumed");
        return { ...attachment, status: { type: "complete" }, content: [] };
      });
      await composer.send();

      expect(send.mock.calls.map(([attachment]) => attachment.name)).toEqual([
        "a.txt",
        "b.txt",
        "b.txt",
      ]);
      expect(append).toHaveBeenCalledOnce();
      expect(append.mock.calls[0]![0]).toMatchObject({
        content: [{ type: "text", text: "hello" }],
        attachments: [
          {
            id: "a.txt",
            content: [{ type: "image", image: "https://example.com/a" }],
          },
          { id: "b.txt", status: { type: "complete" } },
        ],
      });
      expect(composer.isEmpty).toBe(true);
    },
  );

  it.each(["remove", "clear", "reset"])(
    "cleans up retained uploads when a failed draft is discarded with %s",
    async (action) => {
      const remove = vi.fn(async () => {});
      const adapter = makeAdapter({
        add: async ({ file }) => ({
          id: file.name,
          type: "file",
          name: file.name,
          file,
          status: { type: "requires-action", reason: "composer-send" },
        }),
        remove,
        send: async (attachment) => {
          if (attachment.id === "b") throw new Error("upload failed");
          return { ...attachment, status: { type: "complete" }, content: [] };
        },
      });
      const { composer, append } = makeComposer(adapter);
      await composer.addAttachment(new File(["a"], "a"));
      await composer.addAttachment(new File(["b"], "b"));
      const original = composer.attachments[0];
      await expect(composer.send()).rejects.toThrow("upload failed");
      await vi.waitFor(() => expect(composer.canSend).toBe(true));

      if (action === "remove") await composer.removeAttachment("a");
      else if (action === "clear") await composer.clearAttachments();
      else await composer.reset();

      expect(remove).toHaveBeenCalledWith(original);
      expect(append).not.toHaveBeenCalled();
    },
  );

  it.each(["before", "after"])(
    "reuses an upload when removal fails %s it settles",
    async (order) => {
      const upload = deferred();
      const send = vi.fn(async (attachment: PendingAttachment) => {
        if (attachment.name === "b") throw new Error("upload failed");
        await upload.promise;
        return {
          ...attachment,
          status: { type: "complete" as const },
          content: [],
        };
      });
      const { composer, append } = makeComposer(
        makeAdapter({
          add: async ({ file }) => ({
            id: file.name,
            type: "file",
            name: file.name,
            file,
            status: { type: "requires-action", reason: "composer-send" },
          }),
          remove: async () => {
            throw new Error("remove failed");
          },
          send,
        }),
      );
      await composer.addAttachment(new File(["a"], "a"));
      await composer.addAttachment(new File(["b"], "b"));
      await expect(composer.send()).rejects.toThrow("upload failed");
      if (order === "after") {
        upload.resolve();
        await vi.waitFor(() => expect(composer.canSend).toBe(true));
      }
      await expect(composer.removeAttachment("a")).rejects.toThrow(
        "remove failed",
      );
      upload.resolve();
      await vi.waitFor(() => expect(composer.canSend).toBe(true));
      send.mockImplementation(async (attachment) => {
        if (attachment.name === "a") throw new Error("Already consumed");
        return { ...attachment, status: { type: "complete" }, content: [] };
      });
      await composer.send();
      expect(send.mock.calls.map(([attachment]) => attachment.name)).toEqual([
        "a",
        "b",
        "b",
      ]);
      expect(append).toHaveBeenCalledOnce();
    },
  );

  it.each(["remove", "clear", "reset"])(
    "does not restore discarded uploads after %s during a failed send",
    async (action) => {
      const upload = deferred();
      const removal = deferred();
      const adapter = makeAdapter({
        add: async ({ file }) => ({
          id: file.name,
          type: "image",
          name: file.name,
          contentType: file.type,
          file,
          status: { type: "requires-action", reason: "composer-send" },
        }),
        remove: () => removal.promise,
        send: async (attachment) => {
          if (attachment.name === "b.txt") throw new Error("upload failed");
          await upload.promise;
          return { ...attachment, status: { type: "complete" }, content: [] };
        },
      });
      const { composer, append } = makeComposer(adapter);
      await composer.addAttachment(new File(["a"], "a.txt"));
      await composer.addAttachment(new File(["b"], "b.txt"));
      await expect(composer.send()).rejects.toThrow("upload failed");
      const cleanup =
        action === "remove"
          ? composer.removeAttachment("a.txt")
          : action === "clear"
            ? composer.clearAttachments()
            : composer.reset();
      const newId = action === "remove" ? "later" : "a.txt";
      await composer.addAttachment({ id: newId, name: "later", content: [] });
      const remaining = composer.attachments;
      upload.resolve();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      await vi.waitFor(() => expect(composer.canSend).toBe(true));
      expect(composer.attachments).toEqual(remaining);
      removal.resolve();
      await cleanup;
      expect(composer.attachments.map((attachment) => attachment.id)).toEqual(
        action === "remove" ? ["b.txt", newId] : [newId],
      );
      expect(append).not.toHaveBeenCalled();
    },
  );

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

  it("excludes cleared attachments when the upload finishes before adapter removal", async () => {
    const upload = Promise.withResolvers<void>();
    const removal = Promise.withResolvers<void>();
    const adapter = makeAdapter({
      send: async (attachment) => {
        await upload.promise;
        return { ...attachment, status: { type: "complete" }, content: [] };
      },
      remove: () => removal.promise,
    });
    const core = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: { run: async () => ({ content: [] }) },
          attachments: adapter,
        },
      },
      undefined,
    );
    const thread = core.threads.getMainThreadRuntimeCore();
    const composer = thread.composer;
    composer.setText("hello");
    await composer.addAttachment(textFile());
    await composer.addAttachment({
      id: "ready",
      name: "ready.txt",
      content: [],
    });

    const sendPromise = composer.send({ startRun: false });
    const clearPromise = composer.clearAttachments();
    expect(composer.attachments).toEqual([]);
    await composer.addAttachment({
      id: "later",
      name: "later.txt",
      content: [],
    });
    upload.resolve();
    await sendPromise;

    expect(thread.messages).toMatchObject([
      { content: [{ type: "text", text: "hello" }], attachments: [] },
    ]);
    expect(composer.attachments.map((attachment) => attachment.id)).toEqual([
      "later",
    ]);
    removal.resolve();
    await clearPromise;
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

  it("keeps an attachment re-added under a removed id during an in-flight send", async () => {
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
    await composer.removeAttachment("att-1");
    await composer.addAttachment({ id: "att-1", name: "again", content: [] });
    resolveSend();
    await sendPromise;

    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]![0].attachments).toHaveLength(0);
    expect(composer.attachments.map((a) => a.name)).toEqual(["again"]);
  });

  it("does not send an attachment whose removal was pending when the send started", async () => {
    const removal = deferred();
    const send = vi.fn(async (a: PendingAttachment) => ({
      ...a,
      status: { type: "complete" as const },
      content: [],
    }));
    const adapter = makeAdapter({ remove: () => removal.promise, send });
    const { composer, append } = makeComposer(adapter);

    composer.setText("hello");
    await composer.addAttachment(textFile());

    const removePromise = composer.removeAttachment("att-1");
    await composer.send();

    expect(send).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]![0].attachments).toHaveLength(0);

    removal.resolve();
    await removePromise;
    expect(composer.attachments).toEqual([]);
  });

  it("does not dispatch an empty message when the only attachment is being removed", async () => {
    const removal = deferred();
    const send = vi.fn(async (a: PendingAttachment) => ({
      ...a,
      status: { type: "complete" as const },
      content: [],
    }));
    const adapter = makeAdapter({ remove: () => removal.promise, send });
    const { composer, append } = makeComposer(adapter);

    await composer.addAttachment(textFile());

    const removePromise = composer.removeAttachment("att-1");
    await composer.send();

    expect(send).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();

    removal.resolve();
    await removePromise;
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

describe("BaseComposerRuntimeCore.send restore-on-undispatched", () => {
  const rejectableAppend = () => {
    let reject!: (error: unknown) => void;
    const append = vi.fn(
      () =>
        new Promise<void>((_resolve, rejectAppend) => {
          reject = rejectAppend;
        }),
    );
    return { append, reject: (error: unknown) => reject(error) };
  };

  it("restores text, quote, and attachments when the message was never sent", async () => {
    const { append, reject } = rejectableAppend();
    const { composer } = makeComposer(makeAdapter(), append);

    composer.setText("hello");
    await composer.addAttachment(textFile());
    composer.setQuote({ text: "quoted", messageId: "m-1" });

    await composer.send();
    expect(composer.text).toBe("");
    expect(composer.attachments).toHaveLength(0);

    reject(new MessageNotSentError());

    await vi.waitFor(() => expect(composer.text).toBe("hello"));
    expect(composer.quote).toEqual({ text: "quoted", messageId: "m-1" });
    expect(composer.attachments).toHaveLength(1);
    expect(composer.attachments[0]!.status).toEqual({ type: "complete" });
    expect(append).toHaveBeenCalledTimes(1);
  });

  it("leaves the composer empty for any other rejection", async () => {
    const { append, reject } = rejectableAppend();
    const { composer } = makeComposer(makeAdapter(), append);

    composer.setText("hello");
    await composer.send();
    reject(new Error("boom"));

    await vi.waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    expect(composer.text).toBe("");
  });

  it("does not clobber a draft written after the send", async () => {
    const { append, reject } = rejectableAppend();
    const { composer } = makeComposer(makeAdapter(), append);

    composer.setText("hello");
    await composer.send();
    composer.setText("new draft");
    reject(new MessageNotSentError());

    await vi.waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    expect(composer.text).toBe("new draft");
  });

  it("does not restore a draft a reset discarded", async () => {
    const { append, reject } = rejectableAppend();
    const { composer } = makeComposer(makeAdapter(), append);

    composer.setText("hello");
    await composer.send();
    await composer.reset();
    reject(new MessageNotSentError());

    await vi.waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    expect(composer.text).toBe("");
  });
});

describe("BaseComposerRuntimeCore.send restore-on-undispatched edge cases", () => {
  class SyncThrowComposerCore extends BaseComposerRuntimeCore {
    public readonly error = new MessageNotSentError();
    public get canCancel() {
      return false;
    }
    public get canSend() {
      return true;
    }
    protected getAttachmentAdapter() {
      return undefined;
    }
    protected getDictationAdapter() {
      return undefined;
    }
    protected handleSend(): void {
      throw this.error;
    }
    protected handleCancel(): void {}
  }

  it("restores the draft when handleSend throws synchronously", async () => {
    const composer = new SyncThrowComposerCore();
    composer.setText("hello");

    await expect(composer.send()).rejects.toThrow(composer.error);

    expect(composer.text).toBe("hello");
  });

  it("restores only the most recent of several queued drafts", async () => {
    const rejects: ((error: unknown) => void)[] = [];
    const append = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejects.push(reject);
        }),
    );
    const { composer } = makeComposer(makeAdapter(), append);

    composer.setText("one");
    await composer.send();
    composer.setText("two");
    await composer.send();

    rejects[0]!(new MessageNotSentError());
    rejects[1]!(new MessageNotSentError());

    await vi.waitFor(() => expect(composer.text).toBe("two"));
  });
});

describe("BaseComposerRuntimeCore.send with an upload still running in add()", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const completeSend = () =>
    vi.fn(async (attachment: PendingAttachment) => ({
      ...attachment,
      status: { type: "complete" as const },
      content: [],
    }));

  const uploadingAdapter = (
    upload: Promise<void>,
    overrides: Partial<AttachmentAdapter> = {},
  ) =>
    makeAdapter({
      async *add({ file }) {
        const attachment = {
          id: "att-1",
          type: "file",
          name: file.name,
          contentType: file.type,
          file,
        };
        yield {
          ...attachment,
          status: { type: "running", reason: "uploading", progress: 0 },
        } satisfies PendingAttachment;
        await upload;
        yield {
          ...attachment,
          status: { type: "requires-action", reason: "composer-send" },
        } satisfies PendingAttachment;
      },
      ...overrides,
    });

  it("waits for the upload before handing the attachment to the adapter", async () => {
    const upload = deferred();
    const send = completeSend();
    const { composer, append } = makeComposer(
      uploadingAdapter(upload.promise, { send }),
    );

    composer.setText("hello");
    const adding = composer.addAttachment(textFile());
    await vi.waitFor(() =>
      expect(composer.attachments[0]?.status.type).toBe("running"),
    );

    const sendPromise = composer.send();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(send).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();

    upload.resolve();
    await adding;
    await sendPromise;

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0].status).toEqual({
      type: "requires-action",
      reason: "composer-send",
    });
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "hello" }],
      attachments: [{ id: "att-1", status: { type: "complete" } }],
    });
    expect(composer.attachments).toEqual([]);
  });

  it("sends through the cloud adapter while its upload is still running", async () => {
    const put = Promise.withResolvers<{ ok: boolean }>();
    const fetchMock = vi.fn(() => put.promise);
    vi.stubGlobal("fetch", fetchMock);
    const cloud = {
      files: {
        generatePresignedUploadUrl: vi.fn().mockResolvedValue({
          signedUrl: "https://storage.example/upload",
          publicUrl: "https://cdn.example/image.png",
        }),
      },
    } as unknown as AssistantCloud;
    const core = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: { run: async () => ({ content: [] }) },
          attachments: new CloudFileAttachmentAdapter(cloud),
        },
      },
      undefined,
    );
    const thread = core.threads.getMainThreadRuntimeCore();

    thread.composer.setText("look at this");
    const adding = thread.composer.addAttachment(
      new File([new Uint8Array([1, 2, 3])], "image.png", { type: "image/png" }),
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const sendPromise = thread.composer.send({ startRun: false });
    put.resolve({ ok: true });
    await adding;
    await sendPromise;

    expect(thread.messages).toMatchObject([
      {
        content: [{ type: "text", text: "look at this" }],
        attachments: [
          {
            status: { type: "complete" },
            content: [
              { type: "image", image: "https://cdn.example/image.png" },
            ],
          },
        ],
      },
    ]);
  });

  it("drops the send when a reset lands while the upload is still running", async () => {
    const upload = deferred();
    const send = completeSend();
    const { composer, append } = makeComposer(
      uploadingAdapter(upload.promise, { send }),
    );

    composer.setText("hello");
    const adding = composer.addAttachment(textFile());
    await vi.waitFor(() =>
      expect(composer.attachments[0]?.status.type).toBe("running"),
    );

    const sendPromise = composer.send();
    await composer.reset();
    await sendPromise;
    upload.resolve();
    await adding;

    expect(send).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
    expect(composer.attachments).toEqual([]);
    expect(composer.text).toBe("");
  });

  it("leaves out an attachment removed while it was still uploading", async () => {
    const upload = deferred();
    const send = completeSend();
    const { composer, append } = makeComposer(
      uploadingAdapter(upload.promise, { send }),
    );

    composer.setText("hello");
    const adding = composer.addAttachment(textFile());
    await vi.waitFor(() =>
      expect(composer.attachments[0]?.status.type).toBe("running"),
    );

    const sendPromise = composer.send();
    await composer.removeAttachment("att-1");
    await sendPromise;
    upload.resolve();
    await adding;

    expect(send).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "hello" }],
      attachments: [],
    });
    expect(composer.attachments).toEqual([]);
  });

  it("keeps an attachment re-added under a removed id out of the send", async () => {
    const upload = deferred();
    const send = completeSend();
    const { composer, append } = makeComposer(
      uploadingAdapter(upload.promise, { send }),
    );

    composer.setText("hello");
    const adding = composer.addAttachment(textFile());
    await vi.waitFor(() =>
      expect(composer.attachments[0]?.status.type).toBe("running"),
    );

    const sendPromise = composer.send();
    await composer.removeAttachment("att-1");
    await composer.addAttachment({ id: "att-1", name: "again", content: [] });
    await sendPromise;
    upload.resolve();
    await adding;

    expect(send).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "hello" }],
      attachments: [],
    });
    expect(composer.attachments.map((a) => a.name)).toEqual(["again"]);
  });

  it("waits for the upload that took over an attachment id", async () => {
    const uploads = [deferred(), deferred()];
    let addCount = 0;
    const send = completeSend();
    const adapter = makeAdapter({
      async *add({ file }) {
        const upload = uploads[addCount++]!;
        const attachment = {
          id: file.name,
          type: "file",
          name: file.name,
          contentType: file.type,
          file,
        };
        yield {
          ...attachment,
          status: { type: "running", reason: "uploading", progress: 0 },
        } satisfies PendingAttachment;
        await upload.promise;
        yield {
          ...attachment,
          status: { type: "requires-action", reason: "composer-send" },
        } satisfies PendingAttachment;
      },
      send,
    });
    const { composer, append } = makeComposer(adapter);

    const first = composer.addAttachment(textFile());
    await vi.waitFor(() =>
      expect(composer.attachments[0]?.status.type).toBe("running"),
    );
    await composer.removeAttachment("f.txt");
    const second = composer.addAttachment(textFile());
    await vi.waitFor(() =>
      expect(composer.attachments[0]?.status.type).toBe("running"),
    );

    const sendPromise = composer.send();
    uploads[0]!.resolve();
    await first;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(send).not.toHaveBeenCalled();

    uploads[1]!.resolve();
    await second;
    await sendPromise;

    expect(send).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]![0].attachments).toHaveLength(1);
  });

  it("sends once the upload that took over an attachment id is ready", async () => {
    const stalled = deferred();
    let addCount = 0;
    const send = completeSend();
    const adapter = makeAdapter({
      async *add({ file }) {
        const attachment = {
          id: file.name,
          type: "file",
          name: file.name,
          contentType: file.type,
          file,
        };
        if (addCount++ === 0) {
          yield {
            ...attachment,
            status: { type: "running", reason: "uploading", progress: 0 },
          } satisfies PendingAttachment;
          await stalled.promise;
          return;
        }
        yield {
          ...attachment,
          status: { type: "requires-action", reason: "composer-send" },
        } satisfies PendingAttachment;
      },
      send,
    });
    const { composer, append } = makeComposer(adapter);

    void composer.addAttachment(textFile());
    await vi.waitFor(() =>
      expect(composer.attachments[0]?.status.type).toBe("running"),
    );
    await composer.addAttachment(textFile());
    expect(composer.attachments[0]?.status.type).toBe("requires-action");

    await composer.send();

    expect(send).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledTimes(1);
    stalled.resolve();
  });

  it("ignores add updates for an attachment after it was sent", async () => {
    const resume = deferred();
    const drainedAfterSend = vi.fn();
    const adapter = makeAdapter({
      async *add({ file }) {
        const attachment = {
          id: "att-1",
          type: "file",
          name: file.name,
          contentType: file.type,
          file,
        };
        yield {
          ...attachment,
          status: { type: "requires-action", reason: "composer-send" },
        } satisfies PendingAttachment;
        await resume.promise;
        yield {
          ...attachment,
          status: { type: "running", reason: "uploading", progress: 1 },
        } satisfies PendingAttachment;
        drainedAfterSend();
      },
    });
    const { composer, append } = makeComposer(adapter);

    composer.setText("hello");
    const adding = composer.addAttachment(textFile());
    await vi.waitFor(() => expect(composer.attachments).toHaveLength(1));

    await composer.send();
    resume.resolve();
    await adding;

    expect(append).toHaveBeenCalledTimes(1);
    expect(composer.attachments).toEqual([]);
    expect(drainedAfterSend).not.toHaveBeenCalled();
  });
});
