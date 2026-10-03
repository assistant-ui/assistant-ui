import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { BaseComposerRuntimeCore } from "../runtime/base/base-composer-runtime-core";
import type { AttachmentAdapter } from "../adapters/attachment";
import type { DictationAdapter } from "../adapters/speech";
import { WebSpeechDictationAdapter } from "../adapters/speech";
import type {
  Attachment,
  CreateAttachment,
  PendingAttachment,
} from "../types/attachment";
import type { AppendMessage } from "../types/message";
import type { SendOptions } from "../runtime/interfaces/composer-runtime-core";

class TestComposerCore extends BaseComposerRuntimeCore {
  private _attachmentAdapter: AttachmentAdapter | undefined;
  public sentMessages: Array<Omit<AppendMessage, "parentId" | "sourceId">> = [];
  public sentOptions: Array<SendOptions | undefined> = [];

  protected getAttachmentAdapter() {
    return this._attachmentAdapter;
  }
  private _dictationAdapter: DictationAdapter | undefined;

  protected getDictationAdapter(): DictationAdapter | undefined {
    return this._dictationAdapter;
  }

  setDictationAdapter(adapter: DictationAdapter | undefined) {
    this._dictationAdapter = adapter;
  }

  setAttachmentAdapter(adapter: AttachmentAdapter | undefined) {
    this._attachmentAdapter = adapter;
  }

  setTestAttachments(attachments: readonly Attachment[]) {
    this.setAttachments(attachments);
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

  it.each(["", "Existing text"])(
    "replaces the complete browser dictation preview after %j",
    async (baseText) => {
      vi.useFakeTimers();
      onTestFinished(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
      });
      const listeners = new Map<string, EventListener>();
      class Recognition {
        addEventListener(type: string, listener: EventListener) {
          listeners.set(type, listener);
        }
        start() {}
        stop() {
          listeners.get("end")!(new Event("end"));
        }
        abort() {
          this.stop();
        }
      }
      vi.stubGlobal("window", { SpeechRecognition: Recognition });
      composer.setDictationAdapter(new WebSpeechDictationAdapter());
      composer.setText(baseText);
      composer.startDictation();
      onTestFinished(() => composer.stopDictation());
      const emit = (results: [string, boolean][], resultIndex = 0) => {
        listeners.get("result")!({
          resultIndex,
          results: results.map(([transcript, isFinal]) => ({
            0: { transcript },
            isFinal,
          })),
        } as unknown as Event);
      };
      const prefix = baseText ? `${baseText} ` : "";

      emit([
        ["hello ", false],
        ["world", false],
      ]);
      expect(composer.text).toBe(`${prefix}hello world`);
      emit([["hello ", false]], 1);
      expect(composer.text).toBe(`${prefix}hello `);
      emit([]);
      expect(composer.text).toBe(baseText);
      emit([
        ["hello ", true],
        ["world", false],
      ]);
      expect(composer.text).toBe(`${prefix}hello world`);
      emit(
        [
          ["hello ", true],
          ["world", true],
        ],
        1,
      );
      expect(composer.text).toBe(`${prefix}hello world`);
      expect(composer.dictation?.transcript).toBeUndefined();
      composer.stopDictation();
      await Promise.resolve();
    },
  );

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

  describe.each(["clearAttachments", "reset"] as const)(
    "%s cleanup",
    (method) => {
      it.each(["first throw", "later throw", "rejection", "multiple failures"])(
        "attempts all pending removals after %s and still rejects",
        async (failure) => {
          const error = new Error("removal failed");
          const remove = vi.fn((attachment: PendingAttachment) => {
            const fails =
              attachment.id === (failure === "later throw" ? "two" : "one");
            if (fails) {
              if (failure === "rejection") return Promise.reject(error);
              throw error;
            }
            if (failure === "multiple failures" && attachment.id === "two") {
              return Promise.reject(new Error("another failure"));
            }
            return Promise.resolve();
          });
          composer.setAttachmentAdapter({
            accept: "*",
            add: vi.fn(),
            send: vi.fn(),
            remove,
          });
          composer.setTestAttachments([
            makePendingAttachment("one"),
            {
              id: "complete",
              type: "file",
              name: "saved.txt",
              contentType: "text/plain",
              content: [],
              status: { type: "complete" },
            },
            makePendingAttachment("two"),
            makePendingAttachment("three"),
          ]);

          await expect(composer[method]()).rejects.toBe(error);

          expect(
            remove.mock.calls.map(([attachment]) => attachment.id),
          ).toEqual(["one", "two", "three"]);
          expect(composer.attachments).toEqual([]);
        },
      );
    },
  );

  it("reset keeps discarded text out of later dictation results", async () => {
    let emitSpeech!: (result: DictationAdapter.Result) => void;
    composer.setDictationAdapter({
      listen: () => ({
        status: { type: "running" },
        stop: async () => {},
        cancel: () => {},
        onSpeechStart: () => () => {},
        onSpeechEnd: () => () => {},
        onSpeech: (callback) => {
          emitSpeech = callback;
          return () => {};
        },
      }),
    });

    composer.setText("old");
    composer.startDictation();
    try {
      await composer.reset();
      expect(composer.text).toBe("");
      emitSpeech({ transcript: "new", isFinal: true });
      expect(composer.text).toBe("new");

      emitSpeech({ transcript: "pending", isFinal: false });
      expect(composer.text).toBe("new pending");
      await composer.reset();
      expect(composer.text).toBe("");
      expect(composer.dictation?.transcript).toBeUndefined();

      emitSpeech({ transcript: "next", isFinal: false });
      expect(composer.text).toBe("next");
      emitSpeech({ transcript: "next final", isFinal: true });
      expect(composer.text).toBe("next final");
    } finally {
      composer.stopDictation();
      await Promise.resolve();
    }
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

  it.each([
    ["removeAttachment", "pending", 1],
    ["reset", "pending", 1],
    ["reset", "failed", 2],
    ["reset", "pending-then-failed", 1],
    ["clearAttachments", "pending", 1],
    ["clearAttachments", "failed", 2],
    ["clearAttachments", "pending-then-failed", 1],
  ] as const)(
    "removes a draft attachment on %s unless its removal is in flight (%s)",
    async (action, state, removals) => {
      const removal = Promise.withResolvers<void>();
      const remove = vi
        .fn<AttachmentAdapter["remove"]>()
        .mockReturnValueOnce(removal.promise)
        .mockResolvedValue(undefined);
      composer.setAttachmentAdapter({
        accept: "*",
        add: vi.fn(),
        send: vi.fn(),
        remove,
      });
      composer.setTestAttachments([makePendingAttachment("att-1")]);

      const removing = composer.removeAttachment("att-1").then(
        () => undefined,
        (error: unknown) => error,
      );
      if (state === "failed") {
        removal.reject(new Error("remove failed"));
        await removing;
      }
      await (action === "removeAttachment"
        ? composer.removeAttachment("att-1")
        : composer[action]());
      if (state === "pending") removal.resolve();
      if (state === "pending-then-failed")
        removal.reject(new Error("remove failed"));

      expect(await removing).toEqual(
        state === "pending" ? undefined : new Error("remove failed"),
      );
      expect(remove).toHaveBeenCalledTimes(removals);
      expect(composer.attachments).toEqual([]);
    },
  );

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

  it("handles rejected dictation shutdowns", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const stopError = new Error("shutdown failed");
    const session: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn().mockRejectedValue(stopError),
      cancel: vi.fn(),
      onSpeechStart: vi.fn(() => () => {}),
      onSpeechEnd: vi.fn(() => () => {}),
      onSpeech: vi.fn(() => () => {}),
    };
    const unhandledRejection = vi.fn();
    composer.setDictationAdapter({ listen: () => session });
    process.on("unhandledRejection", unhandledRejection);

    try {
      composer.startDictation();
      expect(composer.dictation).toBeDefined();

      composer.stopDictation();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(session.stop).toHaveBeenCalledOnce();
      expect(composer.dictation).toBeUndefined();
      expect(unhandledRejection).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Dictation session stop rejected",
        stopError,
      );
    } finally {
      process.off("unhandledRejection", unhandledRejection);
    }
  });

  it("handles synchronously throwing dictation shutdowns", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const stopError = new Error("shutdown failed");
    const session: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn(() => {
        throw stopError;
      }),
      cancel: vi.fn(),
      onSpeechStart: vi.fn(() => () => {}),
      onSpeechEnd: vi.fn(() => () => {}),
      onSpeech: vi.fn(() => () => {}),
    };
    composer.setDictationAdapter({ listen: () => session });
    composer.startDictation();

    expect(() => composer.stopDictation()).not.toThrow();

    expect(composer.dictation).toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Dictation session stop threw",
      stopError,
    );
  });

  it("finishes dictation cleanup when an unsubscribe throws", async () => {
    const cleanupError = new Error("cleanup failed");
    const laterCleanup = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const session: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      onSpeech: vi.fn(() => () => {
        throw cleanupError;
      }),
      onSpeechStart: vi.fn(() => laterCleanup),
      onSpeechEnd: vi.fn(() => () => {}),
    };
    composer.setDictationAdapter({ listen: () => session });

    composer.startDictation();
    composer.stopDictation();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(laterCleanup).toHaveBeenCalledOnce();
    expect(composer.dictation).toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Dictation cleanup threw",
      cleanupError,
    );
  });

  it("rolls back a dictation session when listener setup throws", () => {
    const setupError = new Error("listener setup failed");
    const speechCleanup = vi.fn();
    const session: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      onSpeech: vi.fn(() => speechCleanup),
      onSpeechStart: vi.fn(() => {
        throw setupError;
      }),
      onSpeechEnd: vi.fn(() => () => {}),
    };
    composer.setDictationAdapter({ listen: () => session });

    expect(() => composer.startDictation()).toThrow(setupError);

    expect(session.cancel).toHaveBeenCalledOnce();
    expect(speechCleanup).toHaveBeenCalledOnce();
    expect(session.onSpeechEnd).not.toHaveBeenCalled();
    expect(composer.dictation).toBeUndefined();
  });

  it("keeps dictation active when the initial subscriber throws", () => {
    const listenerError = new Error("subscriber failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    onTestFinished(() => consoleError.mockRestore());
    const session: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      onSpeech: vi.fn(() => () => {}),
      onSpeechStart: vi.fn(() => () => {}),
      onSpeechEnd: vi.fn(() => () => {}),
    };
    composer.setDictationAdapter({ listen: () => session });
    const unsubscribe = composer.subscribe(() => {
      throw listenerError;
    });

    expect(() => composer.startDictation()).not.toThrow();

    expect(composer.dictation).toEqual({
      status: { type: "running" },
      inputDisabled: false,
    });
    expect(session.onSpeech).toHaveBeenCalledOnce();
    expect(session.cancel).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Dictation start notification threw",
      listenerError,
    );
    unsubscribe();
    composer.stopDictation();
  });

  it("does not wire a session replaced during its initial notification", () => {
    const firstSession: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      onSpeech: vi.fn(() => () => {}),
      onSpeechStart: vi.fn(() => () => {}),
      onSpeechEnd: vi.fn(() => () => {}),
    };
    const secondSession: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      onSpeech: vi.fn(() => () => {}),
      onSpeechStart: vi.fn(() => () => {}),
      onSpeechEnd: vi.fn(() => () => {}),
    };
    const listen = vi
      .fn()
      .mockReturnValueOnce(firstSession)
      .mockReturnValueOnce(secondSession);
    composer.setDictationAdapter({ listen });
    let shouldReplace = true;
    const unsubscribe = composer.subscribe(() => {
      if (!shouldReplace) return;
      shouldReplace = false;
      composer.startDictation();
    });

    composer.startDictation();

    expect(firstSession.onSpeech).not.toHaveBeenCalled();
    expect(firstSession.stop).toHaveBeenCalledOnce();
    expect(firstSession.cancel).not.toHaveBeenCalled();
    expect(secondSession.onSpeech).toHaveBeenCalledOnce();
    expect(composer.dictation).toBeDefined();
    unsubscribe();
    composer.stopDictation();
  });

  it("releases setup handles when registration replaces the session", () => {
    const firstCleanup = vi.fn();
    const firstSession: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      onSpeech: vi.fn(() => {
        composer.startDictation();
        return firstCleanup;
      }),
      onSpeechStart: vi.fn(() => () => {}),
      onSpeechEnd: vi.fn(() => () => {}),
    };
    const secondSession: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      onSpeech: vi.fn(() => () => {}),
      onSpeechStart: vi.fn(() => () => {}),
      onSpeechEnd: vi.fn(() => () => {}),
    };
    const listen = vi
      .fn()
      .mockReturnValueOnce(firstSession)
      .mockReturnValueOnce(secondSession);
    composer.setDictationAdapter({ listen });

    composer.startDictation();

    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(firstSession.onSpeechStart).not.toHaveBeenCalled();
    expect(firstSession.cancel).not.toHaveBeenCalled();
    expect(secondSession.onSpeech).toHaveBeenCalledOnce();
    expect(composer.dictation).toBeDefined();
    composer.stopDictation();
  });

  it("sends after a dictation unsubscribe throws", async () => {
    const cleanupError = new Error("cleanup failed");
    const cancelError = new Error("cancel failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    composer.setDictationAdapter({
      listen: () => ({
        status: { type: "running" },
        stop: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn(() => {
          throw cancelError;
        }),
        onSpeech: () => () => {
          throw cleanupError;
        },
        onSpeechStart: () => () => {},
        onSpeechEnd: () => () => {},
      }),
    });
    composer.setText("send me");
    composer.startDictation();

    await composer.send();

    expect(composer.sentMessages).toHaveLength(1);
    expect(composer.sentMessages[0]?.content).toEqual([
      { type: "text", text: "send me" },
    ]);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Dictation session cancel threw",
      cancelError,
    );
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Dictation cleanup threw",
      cleanupError,
    );
  });

  it("starts replacement dictation when the old session stop throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const stopError = new Error("shutdown failed");
    const firstSession: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn(() => {
        throw stopError;
      }),
      cancel: vi.fn(),
      onSpeech: () => () => {},
      onSpeechStart: () => () => {},
      onSpeechEnd: () => () => {},
    };
    const secondSession: DictationAdapter.Session = {
      ...firstSession,
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const listen = vi
      .fn()
      .mockReturnValueOnce(firstSession)
      .mockReturnValueOnce(secondSession);
    composer.setDictationAdapter({ listen });
    composer.startDictation();

    expect(() => composer.startDictation()).not.toThrow();

    expect(listen).toHaveBeenCalledTimes(2);
    expect(composer.dictation).toBeDefined();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Dictation session stop threw",
      stopError,
    );
    composer.stopDictation();
  });

  it("publishes cleared state when replacement session creation throws", () => {
    const listenError = new Error("listen failed");
    const firstSession: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      onSpeech: () => () => {},
      onSpeechStart: () => () => {},
      onSpeechEnd: () => () => {},
    };
    const listen = vi
      .fn()
      .mockReturnValueOnce(firstSession)
      .mockImplementationOnce(() => {
        throw listenError;
      });
    composer.setDictationAdapter({ listen });
    const states: Array<string | undefined> = [];
    composer.subscribe(() => states.push(composer.dictation?.status.type));
    composer.startDictation();
    states.length = 0;

    expect(() => composer.startDictation()).toThrow(listenError);

    expect(composer.dictation).toBeUndefined();
    expect(states).toEqual([undefined]);
  });

  it("replaces dictation without publishing an intermediate cleared state", async () => {
    const session = (): DictationAdapter.Session => ({
      status: { type: "running" },
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      onSpeech: () => () => {},
      onSpeechStart: () => () => {},
      onSpeechEnd: () => () => {},
    });
    composer.setDictationAdapter({ listen: session });
    const states: Array<string | undefined> = [];
    composer.subscribe(() => states.push(composer.dictation?.status.type));
    composer.startDictation();
    states.length = 0;

    composer.startDictation();

    expect(states).toEqual(["running"]);
    composer.stopDictation();
    await Promise.resolve();
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

describe("BaseComposerRuntimeCore.restoreDraft", () => {
  it("refuses while the composer holds something of its own", () => {
    const composer = new TestComposerCore();
    composer.setText("mine");

    expect(composer.restoreDraft({ text: "returned" })).toBe(false);
    expect(composer.text).toBe("mine");
  });

  it("rebases a live dictation session onto the restored text", () => {
    let emitSpeech!: (result: { transcript: string }) => void;
    const composer = new TestComposerCore();
    composer.setDictationAdapter({
      listen: () => ({
        status: { type: "running" },
        stop: async () => {},
        cancel: () => {},
        onSpeechStart: () => () => {},
        onSpeechEnd: () => () => {},
        onSpeech: (callback) => {
          emitSpeech = callback;
          return () => {};
        },
      }),
    });

    composer.startDictation();
    expect(composer.restoreDraft({ text: "returned" })).toBe(true);
    emitSpeech({ transcript: "and this" });

    expect(composer.text).toBe("returned and this");
  });
});

describe("BaseComposerRuntimeCore.retractDraft", () => {
  const makeCompleteAttachment = (id: string) => ({
    id,
    type: "file" as const,
    name: "spec.pdf",
    contentType: "application/pdf",
    status: { type: "complete" as const },
    content: [],
  });

  it("clears the composer while it still holds the exact draft", () => {
    const composer = new TestComposerCore();
    const draft = {
      text: "returned",
      quote: { text: "quoted", messageId: "m-1" },
      attachments: [makeCompleteAttachment("a1")],
    };

    expect(composer.restoreDraft(draft)).toBe(true);
    composer.retractDraft(draft);

    expect(composer.text).toBe("");
    expect(composer.quote).toBeUndefined();
    expect(composer.attachments).toEqual([]);
  });

  it("leaves an edited text alone", () => {
    const composer = new TestComposerCore();
    const draft = { text: "returned" };

    expect(composer.restoreDraft(draft)).toBe(true);
    composer.setText("edited");
    composer.retractDraft(draft);

    expect(composer.text).toBe("edited");
  });

  it("leaves a changed quote alone", () => {
    const composer = new TestComposerCore();
    const draft = {
      text: "returned",
      quote: { text: "quoted", messageId: "m-1" },
    };

    expect(composer.restoreDraft(draft)).toBe(true);
    composer.setQuote({ text: "other", messageId: "m-2" });
    composer.retractDraft(draft);

    expect(composer.text).toBe("returned");
    expect(composer.quote).toEqual({ text: "other", messageId: "m-2" });
  });

  it("leaves changed attachments alone", () => {
    const composer = new TestComposerCore();
    const draft = {
      text: "returned",
      attachments: [makeCompleteAttachment("a1")],
    };

    expect(composer.restoreDraft(draft)).toBe(true);
    composer.retractDraft({
      ...draft,
      attachments: [makeCompleteAttachment("a1")],
    });

    expect(composer.text).toBe("returned");
    expect(composer.attachments).toHaveLength(1);
  });
});

describe("BaseComposerRuntimeCore send with a subscriber that restarts dictation", () => {
  const makeSession = () => {
    const end = new Set<(result: DictationAdapter.Result) => void>();
    let listeners = 0;
    const session: DictationAdapter.Session = {
      status: { type: "running" },
      stop: vi.fn(async () => {}),
      cancel: vi.fn(() => {
        session.status = { type: "ended", reason: "cancelled" };
        for (const cb of [...end]) cb({ transcript: "" });
      }),
      onSpeechStart: () => {
        listeners++;
        return () => listeners--;
      },
      onSpeechEnd: (cb) => {
        end.add(cb);
        listeners++;
        return () => {
          end.delete(cb);
          listeners--;
        };
      },
      onSpeech: () => {
        listeners++;
        return () => listeners--;
      },
    };
    return { session, listeners: () => listeners };
  };

  it("keeps the session a subscriber starts while send cancels the previous one", async () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const sessions: ReturnType<typeof makeSession>[] = [];
    const composer = new TestComposerCore();
    composer.setDictationAdapter({
      listen: () => {
        const s = makeSession();
        sessions.push(s);
        return s.session;
      },
    });
    composer.subscribe(() => {
      if (composer.dictation === undefined && sessions.length === 1) {
        composer.startDictation();
      }
    });
    composer.setText("hello");
    composer.startDictation();
    await composer.send();

    expect(sessions).toHaveLength(2);
    expect(composer.dictation).toBeDefined();
    expect(sessions[1]!.listeners()).toBe(3);
    expect(sessions[1]!.session.cancel).not.toHaveBeenCalled();
  });
});
