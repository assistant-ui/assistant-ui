import { describe, expect, it, vi } from "vitest";
import { LocalRuntimeCore } from "./local-runtime-core";
import type { AttachmentAdapter } from "../../adapters/attachment";

describe("LocalThreadRuntimeCore edit cancellation", () => {
  it("does not submit a cancelled edit after an attachment upload settles", async () => {
    let finishUpload!: () => void;
    const upload = new Promise<void>((resolve) => {
      finishUpload = resolve;
    });
    const remove = vi.fn<AttachmentAdapter["remove"]>(async () => {});
    const attachments: AttachmentAdapter = {
      accept: "*",
      add: async ({ file }) => ({
        id: "file-1",
        type: "document",
        name: file.name,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      send: async (attachment) => {
        await upload;
        return {
          ...attachment,
          status: { type: "complete" },
          content: [{ type: "text", text: "uploaded" }],
        };
      },
      remove,
    };
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: { run: async () => ({ content: [] }) },
          attachments,
        },
      },
      [
        {
          id: "u1",
          role: "user",
          content: [{ type: "text", text: "original" }],
        },
      ],
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    const append = vi.spyOn(thread, "append").mockResolvedValue(undefined);
    thread.beginEdit("u1");
    const oldEdit = thread.getEditComposer("u1")!;
    await oldEdit.addAttachment(
      new File(["hello"], "file.txt", { type: "text/plain" }),
    );
    oldEdit.setText("cancelled change");
    const send = oldEdit.send();
    oldEdit.cancel();
    thread.beginEdit("u1");
    const replacement = thread.getEditComposer("u1")!;

    finishUpload();
    await send;

    expect(append).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledOnce();
    expect(remove.mock.calls[0]?.[0]).toMatchObject({
      id: "file-1",
      status: { type: "requires-action", reason: "composer-send" },
    });
    expect(thread.getEditComposer("u1")).toBe(replacement);
  });
});
