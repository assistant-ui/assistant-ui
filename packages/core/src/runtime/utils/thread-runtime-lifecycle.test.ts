import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { ThreadMessage } from "../../types/message";
import { ExternalStoreThreadRuntimeCore } from "../../runtimes/external-store/external-store-thread-runtime-core";
import {
  captureThreadRuntimeGeneration,
  disposeThreadRuntime,
  invalidateThreadRuntime,
  supersedeThreadRuntime,
} from "./thread-runtime-lifecycle";

const createRuntime = (disconnectVoice: () => void = vi.fn()) =>
  ({
    voice: { status: { type: "running" } },
    disconnectVoice,
  }) as unknown as ThreadRuntimeCore;

describe("thread runtime lifecycle", () => {
  it.each([
    ["invalidation", invalidateThreadRuntime],
    ["supersession", supersedeThreadRuntime],
  ])("delivers a pending attachment send through %s", async (_, transition) => {
    let resolveSend!: () => void;
    const send = vi.fn<AttachmentAdapter["send"]>(
      (attachment) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({
              ...attachment,
              status: { type: "complete" },
              content: [],
            });
        }),
    );
    const attachments: AttachmentAdapter = {
      accept: "*",
      add: async ({ file }) => ({
        id: "attachment-1",
        type: "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send,
    };
    const onNew = vi.fn(async () => {});
    const runtime = new ExternalStoreThreadRuntimeCore(
      { getModelContext: () => ({}) },
      { messages: [], onNew, adapters: { attachments } },
    );
    runtime.composer.setText("hello");
    await runtime.composer.addAttachment(
      new File(["hello"], "notes.txt", { type: "text/plain" }),
    );

    const pending = runtime.composer.send();
    const signal = send.mock.lastCall?.[1]?.signal;
    transition(runtime);
    expect(signal?.aborted).toBe(false);

    resolveSend();
    await pending;
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("aborts an edit composer's pending attachment send on disposal", async () => {
    let resolveSend!: () => void;
    const send = vi.fn<AttachmentAdapter["send"]>(
      (attachment) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({
              ...attachment,
              status: { type: "complete" },
              content: [],
            });
        }),
    );
    const attachments: AttachmentAdapter = {
      accept: "*",
      add: async ({ file }) => ({
        id: "attachment-1",
        type: "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send,
    };
    const onEdit = vi.fn(async () => {});
    const runtime = new ExternalStoreThreadRuntimeCore(
      { getModelContext: () => ({}) },
      {
        messages: [
          {
            id: "u1",
            role: "user",
            createdAt: new Date(),
            content: [{ type: "text", text: "hello" }],
            attachments: [],
            metadata: { custom: {} },
          } as ThreadMessage,
        ],
        onNew: vi.fn(async () => {}),
        onEdit,
        adapters: { attachments },
      },
    );
    runtime.beginEdit("u1");
    const composer = runtime.getEditComposer("u1")!;
    await composer.addAttachment(
      new File(["hello"], "notes.txt", { type: "text/plain" }),
    );

    const pending = composer.send();
    const signal = send.mock.lastCall?.[1]?.signal;
    expect(signal?.aborted).toBe(false);
    disposeThreadRuntime(runtime);
    expect(signal?.aborted).toBe(true);

    resolveSend();
    await pending;
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("starts a fresh generation after invalidation", () => {
    const runtime = createRuntime();
    const generation = captureThreadRuntimeGeneration(runtime);

    invalidateThreadRuntime(runtime);

    expect(generation.aborted).toBe(true);
    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(false);
  });

  it("ends the call of a superseded runtime without disposing it", () => {
    const disconnectVoice = vi.fn();
    const runtime = createRuntime(disconnectVoice);
    const generation = captureThreadRuntimeGeneration(runtime);

    supersedeThreadRuntime(runtime);

    expect(disconnectVoice).toHaveBeenCalledOnce();
    expect(generation.aborted).toBe(true);
    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(false);
  });

  it("keeps a disposed runtime aborted through a later invalidation", () => {
    const disconnectVoice = vi.fn();
    const runtime = createRuntime(disconnectVoice);

    disposeThreadRuntime(runtime);
    invalidateThreadRuntime(runtime);

    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(true);
    expect(disconnectVoice).toHaveBeenCalledOnce();
  });

  it("reports a voice disconnect that throws instead of rethrowing it", () => {
    const error = new Error("disconnect failed");
    const runtime = createRuntime(() => {
      throw error;
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());

    expect(() => disposeThreadRuntime(runtime)).not.toThrow();
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      "[assistant-ui] Voice cleanup threw while discarding a thread runtime",
      error,
    );
    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(true);
  });
});
