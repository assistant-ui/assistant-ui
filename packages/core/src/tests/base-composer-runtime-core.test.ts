import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseComposerRuntimeCore } from "../runtime/base/base-composer-runtime-core";
import type { AttachmentAdapter } from "../adapters/attachment";
import type { DictationAdapter } from "../adapters/speech";
import type { CreateAttachment, PendingAttachment } from "../types/attachment";
import type { AppendMessage } from "../types/message";
import type { SendOptions } from "../runtime/interfaces/composer-runtime-core";

class TestComposerCore extends BaseComposerRuntimeCore {
  private _attachmentAdapter: AttachmentAdapter | undefined;
  public sentMessages: Array<Omit<AppendMessage, "parentId" | "sourceId">> = [];
  public sentOptions: Array<SendOptions | undefined> = [];

  protected getAttachmentAdapter() {
    return this._attachmentAdapter;
  }
  protected getDictationAdapter(): DictationAdapter | undefined {
    return undefined;
  }

  setAttachmentAdapter(adapter: AttachmentAdapter | undefined) {
    this._attachmentAdapter = adapter;
  }

  get canCancel() {
    return false;
  }

  get canSend() {
    return !this.isEmpty;
  }

  protected handleSend(
    message: Omit<AppendMessage, "parentId" | "sourceId">,
    options?: SendOptions,
  ) {
    this.sentMessages.push(message);
    this.sentOptions.push(options);
  }

  protected handleCancel() {}
}

const makePendingAttachment = (
  id: string,
  name = "file.txt",
): PendingAttachment => ({
  id,
  type: "file",
  name,
  contentType: "text/plain",
  file: new File(["content"], name),
  status: { type: "requires-action", reason: "composer-send" },
});

describe("BaseComposerRuntimeCore", () => {
  let composer: TestComposerCore;

  beforeEach(() => {
    composer = new TestComposerCore();
  });

  it("does not notify when a set value is unchanged", () => {
    composer.setText("same");
    const listener = vi.fn();
    composer.subscribe(listener);

    composer.setText("same");
    expect(listener).not.toHaveBeenCalled();
  });

  it("isEmpty returns true for whitespace-only text", () => {
    composer.setText("   ");
    expect(composer.isEmpty).toBe(true);
  });

  it("reset clears text, attachments, role, runConfig, and quote", async () => {
    composer.setText("hello");
    composer.setRole("assistant");
    composer.setRunConfig({ custom: { k: "v" } });
    composer.setQuote({ text: "q", messageId: "m1" });

    await composer.reset();

    expect(composer.text).toBe("");
    expect(composer.role).toBe("user");
    expect(composer.runConfig).toEqual({});
    expect(composer.quote).toBeUndefined();
    expect(composer.attachments).toEqual([]);
  });

  it("reset does not notify when already in default state", async () => {
    const listener = vi.fn();
    composer.subscribe(listener);

    await composer.reset();
    expect(listener).not.toHaveBeenCalled();
  });

  it("send includes quote in metadata and clears it", async () => {
    const quote = { text: "quoted", messageId: "m1" };
    composer.setText("reply");
    composer.setQuote(quote);

    await composer.send();

    const msg = composer.sentMessages[0]!;
    expect(msg.metadata).toEqual({ custom: { quote } });
    expect(composer.quote).toBeUndefined();
  });

  it("forwards send options to handleSend", async () => {
    composer.setText("a");
    await composer.send();
    composer.setText("b");
    await composer.send({ startRun: true });
    composer.setText("c");
    await composer.send({ startRun: false });

    expect(composer.sentOptions).toEqual([
      undefined,
      { startRun: true },
      { startRun: false },
    ]);
  });

  it("removeAttachment removes via adapter", async () => {
    const pending = makePendingAttachment("att-1");
    const adapter: AttachmentAdapter = {
      accept: "*",
      add: vi.fn().mockResolvedValue(pending),
      remove: vi.fn().mockResolvedValue(undefined),
      send: vi.fn(),
    };
    composer.setAttachmentAdapter(adapter);

    await composer.addAttachment(new File([""], "f.txt"));
    expect(composer.attachments).toHaveLength(1);

    await composer.removeAttachment("att-1");
    expect(composer.attachments).toHaveLength(0);
    expect(adapter.remove).toHaveBeenCalledWith(pending);
  });

  it("removeAttachment throws for unknown id", async () => {
    const adapter: AttachmentAdapter = {
      accept: "*",
      add: vi.fn(),
      remove: vi.fn(),
      send: vi.fn(),
    };
    composer.setAttachmentAdapter(adapter);

    await expect(composer.removeAttachment("nonexistent")).rejects.toThrow(
      "Attachment not found",
    );
  });

  it("unstable_on unsubscribe stops notifications", async () => {
    const callback = vi.fn();
    const unsub = composer.unstable_on("send", callback);
    unsub();

    composer.setText("test");
    await composer.send();

    expect(callback).not.toHaveBeenCalled();
  });

  it("attachmentAccept returns adapter accept or default", () => {
    expect(composer.attachmentAccept).toBe("*");

    const adapter: AttachmentAdapter = {
      accept: "image/*",
      add: vi.fn(),
      remove: vi.fn(),
      send: vi.fn(),
    };
    composer.setAttachmentAdapter(adapter);
    expect(composer.attachmentAccept).toBe("image/*");
  });

  describe("CreateAttachment (external source)", () => {
    const makeCreateAttachment = (
      overrides?: Partial<CreateAttachment>,
    ): CreateAttachment => ({
      name: "external-doc.pdf",
      content: [{ type: "text", text: "extracted content" }],
      ...overrides,
    });

    it("addAttachment with CreateAttachment adds without adapter", async () => {
      const att = makeCreateAttachment();
      await composer.addAttachment(att);

      expect(composer.attachments).toHaveLength(1);
      expect(composer.attachments[0]!.name).toBe("external-doc.pdf");
      expect(composer.attachments[0]!.status).toEqual({ type: "complete" });
      expect(composer.attachments[0]!.type).toBe("document");
    });

    it("addAttachment with CreateAttachment uses provided id and type", async () => {
      const att = makeCreateAttachment({
        id: "custom-id",
        type: "image",
        contentType: "image/png",
      });
      await composer.addAttachment(att);

      expect(composer.attachments[0]!.id).toBe("custom-id");
      expect(composer.attachments[0]!.type).toBe("image");
      expect(composer.attachments[0]!.contentType).toBe("image/png");
    });

    it("addAttachment with CreateAttachment generates id when not provided", async () => {
      const att = makeCreateAttachment();
      await composer.addAttachment(att);

      expect(composer.attachments[0]!.id).toBeTruthy();
      expect(typeof composer.attachments[0]!.id).toBe("string");
    });

    it("addAttachment with CreateAttachment fires attachmentAdd event", async () => {
      const callback = vi.fn();
      composer.unstable_on("attachmentAdd", callback);

      await composer.addAttachment(makeCreateAttachment());
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("removeAttachment on complete attachment does not require adapter", async () => {
      await composer.addAttachment(makeCreateAttachment({ id: "ext-1" }));
      expect(composer.attachments).toHaveLength(1);

      await composer.removeAttachment("ext-1");
      expect(composer.attachments).toHaveLength(0);
    });

    it("isEmpty returns false when external attachment present", async () => {
      expect(composer.isEmpty).toBe(true);

      await composer.addAttachment(makeCreateAttachment());
      expect(composer.isEmpty).toBe(false);
    });

    it("send with mixed pending + complete attachments", async () => {
      const pending = makePendingAttachment("att-pending");
      const completedFromAdapter = {
        id: "att-pending",
        type: "file" as const,
        name: "file.txt",
        contentType: "text/plain",
        content: [{ type: "text" as const, text: "file content" }],
        status: { type: "complete" as const },
      };
      const adapter: AttachmentAdapter = {
        accept: "*",
        add: vi.fn().mockResolvedValue(pending),
        remove: vi.fn(),
        send: vi.fn().mockResolvedValue(completedFromAdapter),
      };
      composer.setAttachmentAdapter(adapter);

      await composer.addAttachment(new File(["data"], "file.txt"));
      await composer.addAttachment(makeCreateAttachment({ id: "ext-1" }));

      expect(composer.attachments).toHaveLength(2);

      composer.setText("hello");
      await composer.send();

      expect(composer.sentMessages).toHaveLength(1);
      const msg = composer.sentMessages[0]!;
      expect(msg.attachments).toHaveLength(2);
      expect(adapter.send).toHaveBeenCalledTimes(1);
    });

    describe("adapter.accept enforcement", () => {
      const makeImageAdapter = (): AttachmentAdapter => ({
        accept: "image/*",
        add: vi.fn(),
        remove: vi.fn(),
        send: vi.fn(),
      });

      it("rejects external attachment with contentType not matching adapter.accept", async () => {
        composer.setAttachmentAdapter(makeImageAdapter());
        const onError = vi.fn();
        const onAdd = vi.fn();
        composer.unstable_on("attachmentAddError", onError);
        composer.unstable_on("attachmentAdd", onAdd);

        await expect(
          composer.addAttachment(
            makeCreateAttachment({
              name: "doc.pdf",
              contentType: "application/pdf",
            }),
          ),
        ).rejects.toThrow(/File type application\/pdf is not accepted/);

        expect(composer.attachments).toHaveLength(0);
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            reason: "not-accepted",
            message: expect.stringContaining(
              "File type application/pdf is not accepted",
            ),
            error: expect.any(Error),
          }),
        );
        expect(onAdd).not.toHaveBeenCalled();
      });

      it("accepts external attachment with contentType matching adapter.accept", async () => {
        composer.setAttachmentAdapter(makeImageAdapter());
        const onError = vi.fn();

        composer.unstable_on("attachmentAddError", onError);
        await composer.addAttachment(
          makeCreateAttachment({
            name: "photo.png",
            contentType: "image/png",
          }),
        );

        expect(composer.attachments).toHaveLength(1);
        expect(onError).not.toHaveBeenCalled();
      });

      it("accepts external attachment when only filename extension matches adapter.accept", async () => {
        composer.setAttachmentAdapter({
          accept: ".pdf",
          add: vi.fn(),
          remove: vi.fn(),
          send: vi.fn(),
        });

        await composer.addAttachment(
          makeCreateAttachment({ name: "report.pdf" }),
        );

        expect(composer.attachments).toHaveLength(1);
      });

      it("rejects external attachment when contentType missing and extension does not match", async () => {
        composer.setAttachmentAdapter(makeImageAdapter());
        const onError = vi.fn();
        composer.unstable_on("attachmentAddError", onError);

        await expect(
          composer.addAttachment(makeCreateAttachment({ name: "notes.txt" })),
        ).rejects.toThrow(/is not accepted/);

        expect(onError).toHaveBeenCalledTimes(1);
      });

      it("adds external attachment without check when no adapter is configured", async () => {
        await composer.addAttachment(
          makeCreateAttachment({
            name: "anything.xyz",
            contentType: "application/x-anything",
          }),
        );

        expect(composer.attachments).toHaveLength(1);
      });

      it("isolates a throwing attachmentAdd subscriber without firing attachmentAddError", async () => {
        composer.setAttachmentAdapter(makeImageAdapter());
        const listenerError = new Error("add subscriber boom");
        const consoleError = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});
        const onError = vi.fn();
        composer.unstable_on("attachmentAdd", () => {
          throw listenerError;
        });
        composer.unstable_on("attachmentAddError", onError);

        await expect(
          composer.addAttachment(
            makeCreateAttachment({
              name: "photo.png",
              contentType: "image/png",
            }),
          ),
        ).resolves.toBeUndefined();

        expect(composer.attachments).toHaveLength(1);
        expect(onError).not.toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalledWith(
          '[assistant-ui] Composer runtime "attachmentAdd" listener threw an error',
          listenerError,
        );
        consoleError.mockRestore();
      });

      it("does not fire attachmentAddError when a state subscriber throws on add", async () => {
        composer.setAttachmentAdapter(makeImageAdapter());
        const onError = vi.fn();
        composer.subscribe(() => {
          throw new Error("state subscriber boom");
        });
        composer.unstable_on("attachmentAddError", onError);

        await expect(
          composer.addAttachment(
            makeCreateAttachment({
              name: "photo.png",
              contentType: "image/png",
            }),
          ),
        ).rejects.toThrow("state subscriber boom");

        expect(composer.attachments).toHaveLength(1);
        expect(onError).not.toHaveBeenCalled();
      });
    });
  });
});
