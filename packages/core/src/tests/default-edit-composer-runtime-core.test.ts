import { describe, expect, it, vi } from "vitest";
import { DefaultEditComposerRuntimeCore } from "../runtime/base/default-edit-composer-runtime-core";
import type { AppendMessage, ThreadMessage } from "../types/message";
import type { CompleteAttachment } from "../types/attachment";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";

const makeRuntime = () => {
  const append = vi.fn();
  const runtime = {
    append,
    composer: { runConfig: {} },
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
    it("does not call append when nothing changed", async () => {
      const { runtime, append } = makeRuntime();
      const composer = new DefaultEditComposerRuntimeCore(runtime, () => {}, {
        parentId: "p1",
        message: makeUserMessage({
          content: [{ type: "text", text: "same" }],
        }),
      });
      await composer.send();
      expect(append).not.toHaveBeenCalled();
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
