import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseComposerRuntimeCore } from "../legacy-runtime/runtime-cores/composer/BaseComposerRuntimeCore";
import type { AttachmentAdapter } from "../legacy-runtime/runtime-cores/adapters/attachment";
import type { DictationAdapter } from "../legacy-runtime/runtime-cores/adapters/speech/SpeechAdapterTypes";
import type { AppendMessage, PendingAttachment } from "@assistant-ui/core";

class TestComposerCore extends BaseComposerRuntimeCore {
  private _attachmentAdapter: AttachmentAdapter | undefined;
  private _dictationAdapter: DictationAdapter | undefined;
  public sentMessages: Array<Omit<AppendMessage, "parentId" | "sourceId">> = [];
  public cancelCalled = false;

  protected getAttachmentAdapter() {
    return this._attachmentAdapter;
  }
  protected getDictationAdapter() {
    return this._dictationAdapter;
  }

  setAttachmentAdapter(adapter: AttachmentAdapter | undefined) {
    this._attachmentAdapter = adapter;
  }

  setDictationAdapter(adapter: DictationAdapter | undefined) {
    this._dictationAdapter = adapter;
  }

  get canCancel() {
    return false;
  }

  protected handleSend(message: Omit<AppendMessage, "parentId" | "sourceId">) {
    this.sentMessages.push(message);
  }

  protected handleCancel() {
    this.cancelCalled = true;
  }
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

  it("sets and gets text", () => {
    composer.setText("hello");
    expect(composer.text).toBe("hello");
  });

  it("setText does not notify when value unchanged", () => {
    composer.setText("same");
    const listener = vi.fn();
    composer.subscribe(listener);

    composer.setText("same");
    expect(listener).not.toHaveBeenCalled();
  });

  it("isEmpty returns true when no text and no attachments", () => {
    expect(composer.isEmpty).toBe(true);
  });

  it("isEmpty returns false when text is present", () => {
    composer.setText("hi");
    expect(composer.isEmpty).toBe(false);
  });

  it("isEmpty returns true for whitespace-only text", () => {
    composer.setText("   ");
    expect(composer.isEmpty).toBe(true);
  });

  it("sets and gets role", () => {
    composer.setRole("assistant");
    expect(composer.role).toBe("assistant");
  });

  it("setRole does not notify when value unchanged", () => {
    composer.setRole("user");
    const listener = vi.fn();
    composer.subscribe(listener);

    composer.setRole("user");
    expect(listener).not.toHaveBeenCalled();
  });

  it("sets and gets runConfig", () => {
    const config = { custom: { model: "gpt-4" } };
    composer.setRunConfig(config);
    expect(composer.runConfig).toBe(config);
  });

  it("sets and gets quote", () => {
    const quote = { text: "some quote", messageId: "msg-1" };
    composer.setQuote(quote);
    expect(composer.quote).toBe(quote);
  });

  it("setQuote does not notify when value unchanged", () => {
    const quote = { text: "q", messageId: "m1" };
    composer.setQuote(quote);
    const listener = vi.fn();
    composer.subscribe(listener);

    composer.setQuote(quote);
    expect(listener).not.toHaveBeenCalled();
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

  it("reset does nothing when already in default state", async () => {
    const listener = vi.fn();
    composer.subscribe(listener);

    await composer.reset();
    expect(listener).not.toHaveBeenCalled();
  });

  it("send constructs message with text content and fires send event", async () => {
    composer.setText("hello world");

    await composer.send();

    expect(composer.sentMessages).toHaveLength(1);
    const msg = composer.sentMessages[0]!;
    expect(msg.role).toBe("user");
    expect(msg.content).toEqual([{ type: "text", text: "hello world" }]);
    expect(msg.attachments).toEqual([]);
  });

  it("send clears text and attachments after sending", async () => {
    composer.setText("hello");

    await composer.send();

    expect(composer.text).toBe("");
    expect(composer.attachments).toEqual([]);
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

  it("send with empty text produces empty content array", async () => {
    await composer.send();

    expect(composer.sentMessages).toHaveLength(1);
    expect(composer.sentMessages[0]!.content).toEqual([]);
  });

  it("addAttachment throws when no adapter", async () => {
    const file = new File(["data"], "test.txt");
    await expect(composer.addAttachment(file)).rejects.toThrow(
      "Attachments are not supported",
    );
  });

  it("addAttachment adds via adapter", async () => {
    const pending = makePendingAttachment("att-1", "test.txt");
    const adapter: AttachmentAdapter = {
      accept: "text/*",
      add: vi.fn().mockResolvedValue(pending),
      remove: vi.fn().mockResolvedValue(undefined),
      send: vi.fn(),
    };
    composer.setAttachmentAdapter(adapter);

    await composer.addAttachment(new File(["data"], "test.txt"));

    expect(composer.attachments).toHaveLength(1);
    expect(composer.attachments[0]!.id).toBe("att-1");
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

  it("unstable_on registers event listener for send", async () => {
    const callback = vi.fn();
    composer.unstable_on("send", callback);

    composer.setText("test");
    await composer.send();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("unstable_on unsubscribe stops notifications", async () => {
    const callback = vi.fn();
    const unsub = composer.unstable_on("send", callback);
    unsub();

    composer.setText("test");
    await composer.send();

    expect(callback).not.toHaveBeenCalled();
  });

  it("unstable_on fires attachmentAdd event", async () => {
    const callback = vi.fn();
    composer.unstable_on("attachmentAdd", callback);

    const pending = makePendingAttachment("att-1");
    const adapter: AttachmentAdapter = {
      accept: "*",
      add: vi.fn().mockResolvedValue(pending),
      remove: vi.fn(),
      send: vi.fn(),
    };
    composer.setAttachmentAdapter(adapter);

    await composer.addAttachment(new File([""], "f.txt"));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("isEditing is always true", () => {
    expect(composer.isEditing).toBe(true);
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

  it("cancel delegates to handleCancel", () => {
    composer.cancel();
    expect(composer.cancelCalled).toBe(true);
  });

  it("subscribe notifies on text change", () => {
    const listener = vi.fn();
    composer.subscribe(listener);

    composer.setText("new");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("subscribe returns working unsubscribe function", () => {
    const listener = vi.fn();
    const unsub = composer.subscribe(listener);
    unsub();

    composer.setText("change");
    expect(listener).not.toHaveBeenCalled();
  });
});
