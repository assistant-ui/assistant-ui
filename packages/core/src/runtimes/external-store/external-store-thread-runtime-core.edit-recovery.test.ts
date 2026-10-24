import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { MessageNotSentError } from "../../types/error";
import {
  disposeThreadRuntime,
  supersedeThreadRuntime,
} from "../../runtime/utils/thread-runtime-lifecycle";
import type { ThreadMessage } from "../../types/message";

const runtimes: ExternalStoreThreadRuntimeCore[] = [];
afterEach(() => {
  for (const runtime of runtimes.splice(0)) disposeThreadRuntime(runtime);
  vi.restoreAllMocks();
});

const mount = () => {
  const request = Promise.withResolvers<void>();
  const onEdit = vi
    .fn<NonNullable<ExternalStoreAdapter["onEdit"]>>()
    .mockImplementationOnce(() => request.promise)
    .mockResolvedValue(undefined);
  const message: ThreadMessage = {
    id: "user",
    role: "user",
    createdAt: new Date(),
    content: [{ type: "text", text: "original" }],
    attachments: [],
    metadata: { custom: {} },
  };
  const adapter = { messages: [message], onNew: async () => {}, onEdit };
  const thread = new ExternalStoreThreadRuntimeCore(
    { getModelContext: () => ({}) },
    adapter,
  );
  runtimes.push(thread);
  const append = vi.spyOn(thread, "append");
  thread.beginEdit("user");
  const edit = thread.getEditComposer("user")!;
  edit.setText("revised draft");
  return {
    thread,
    adapter,
    edit,
    onEdit,
    reject: async (error: Error = new MessageNotSentError()) => {
      request.reject(error);
      await expect(append.mock.results[0]!.value).rejects.toBe(error);
    },
  };
};

describe("rejected edits", () => {
  it("reopens an unsent edit with its attachments, quote and run configuration for retry", async () => {
    const { thread, edit, onEdit, reject } = mount();
    await edit.addAttachment({
      id: "file-1",
      name: "notes.txt",
      type: "document",
      content: [{ type: "text", text: "notes" }],
    });
    edit.setQuote({ messageId: "answer", text: "quoted answer" });
    edit.setRunConfig({ custom: { model: "selected-model" } });
    await edit.send();
    expect(thread.getEditComposer("user")).toBeUndefined();

    await reject();

    const restored = thread.getEditComposer("user")!;
    expect(restored?.text).toBe("revised draft");
    expect(restored.attachments).toMatchObject([
      { id: "file-1", name: "notes.txt", status: { type: "complete" } },
    ]);
    expect(restored.quote).toEqual({
      messageId: "answer",
      text: "quoted answer",
    });
    expect(restored.runConfig).toEqual({ custom: { model: "selected-model" } });
    expect(thread.messages[0]?.content).toEqual([
      { type: "text", text: "original" },
    ]);

    await restored.send();
    expect(onEdit).toHaveBeenCalledTimes(2);
    expect(onEdit.mock.calls[1]?.[0]).toMatchObject({
      sourceId: "user",
      parentId: null,
      content: [{ type: "text", text: "revised draft" }],
      attachments: [{ id: "file-1", name: "notes.txt" }],
      metadata: {
        custom: { quote: { messageId: "answer", text: "quoted answer" } },
      },
      runConfig: { custom: { model: "selected-model" } },
    });
    expect(thread.getEditComposer("user")).toBeUndefined();
  });

  it.each([false, true])(
    "leaves a newer edit alone after it was cancelled: %s",
    async (cancel) => {
      const { thread, edit, reject } = mount();
      await edit.send();
      thread.beginEdit("user");
      const newer = thread.getEditComposer("user")!;
      newer.setText("newer draft");
      if (cancel) newer.cancel();

      await reject();

      expect(thread.getEditComposer("user")).toBe(cancel ? undefined : newer);
      if (!cancel) expect(newer.text).toBe("newer draft");
    },
  );

  it.each([
    ["disposed", disposeThreadRuntime],
    ["superseded", supersedeThreadRuntime],
  ] as const)("does not reopen an edit on a %s runtime", async (_, end) => {
    const { thread, edit, reject } = mount();
    await edit.send();
    end(thread);
    const notify = vi.fn();
    thread.subscribe(notify);

    await reject();

    expect(thread.getEditComposer("user")).toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not reopen an edit after the source message was replaced", async () => {
    const { thread, adapter, edit, reject } = mount();
    await edit.send();
    thread.__internal_setAdapter({
      ...adapter,
      messages: [
        {
          ...adapter.messages[0]!,
          content: [{ type: "text", text: "saved elsewhere" }],
        },
      ],
    });

    await reject();

    expect(thread.getEditComposer("user")).toBeUndefined();
    expect(thread.messages[0]?.content).toEqual([
      { type: "text", text: "saved elsewhere" },
    ]);
  });

  it("does not restore edits for errors that may follow a delivered message", async () => {
    const { thread, edit, reject } = mount();
    await edit.send();
    await reject(new Error("generation failed"));
    expect(thread.getEditComposer("user")).toBeUndefined();
  });

  it("does not restore an edit after its source moves to a different parent", async () => {
    const { thread, adapter, edit, reject } = mount();
    await edit.send();
    const source = adapter.messages[0]!;
    thread.__internal_setAdapter({
      ...adapter,
      messages: [{ ...source, id: "parent" }, source],
    });

    await reject();

    expect(thread.getMessageById("user")?.parentId).toBe("parent");
    expect(thread.getEditComposer("user")).toBeUndefined();
  });
});
