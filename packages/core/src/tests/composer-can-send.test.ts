import { describe, expect, it, vi } from "vitest";
import { DefaultThreadComposerRuntimeCore } from "../runtime/base/default-thread-composer-runtime-core";
import { DefaultEditComposerRuntimeCore } from "../runtime/base/default-edit-composer-runtime-core";
import type {
  ThreadRuntimeCore,
  VoiceSessionState,
} from "../runtime/interfaces/thread-runtime-core";
import type { AttachmentAdapter } from "../adapters/attachment";
import type { PendingAttachment } from "../types/attachment";
import type { ThreadMessage } from "../types/message";

type ThreadRuntimeStub = Omit<ThreadRuntimeCore, "composer"> & {
  notify: () => void;
};

const makeRuntimeStub = (
  overrides: Partial<ThreadRuntimeCore> = {},
): ThreadRuntimeStub => {
  const subscribers = new Set<() => void>();
  const stub = {
    append: vi.fn(),
    cancelRun: vi.fn(),
    getModelContext: () => ({}),
    subscribe: (cb: () => void) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    capabilities: { cancel: false },
    messages: [],
    isDisabled: false,
    isSendDisabled: false,
    isLoading: false,
    composer: { runConfig: {} },
    notify: () => {
      for (const cb of subscribers) cb();
    },
    ...overrides,
  } as unknown as ThreadRuntimeStub;
  return stub;
};

const makeUserMessage = (text = "old"): ThreadMessage =>
  ({
    id: "msg-1",
    role: "user",
    createdAt: new Date(),
    content: [{ type: "text", text }],
    attachments: [],
    metadata: { custom: {} },
  }) as ThreadMessage;

describe("DefaultThreadComposerRuntimeCore.canSend", () => {
  it("is false when the composer is empty", () => {
    const composer = new DefaultThreadComposerRuntimeCore(makeRuntimeStub());
    expect(composer.canSend).toBe(false);
  });

  it("is true when in editing mode with non-empty text", () => {
    const composer = new DefaultThreadComposerRuntimeCore(makeRuntimeStub());
    composer.setText("hi");
    expect(composer.canSend).toBe(true);
  });

  it("is false when the runtime reports isSendDisabled", () => {
    const composer = new DefaultThreadComposerRuntimeCore(
      makeRuntimeStub({ isSendDisabled: true }),
    );
    composer.setText("hi");
    expect(composer.canSend).toBe(false);
  });

  it("notifies subscribers when isSendDisabled flips", () => {
    const stub = makeRuntimeStub();
    const composer = new DefaultThreadComposerRuntimeCore(stub);
    composer.setText("hi");
    const onChange = vi.fn();
    composer.subscribe(onChange);

    (stub as { isSendDisabled: boolean }).isSendDisabled = true;
    stub.notify();
    expect(onChange).toHaveBeenCalled();
    expect(composer.canSend).toBe(false);
  });

  it("is false while a voice session is connected and true after disconnect", () => {
    const stub = makeRuntimeStub({
      voice: {
        status: { type: "running" },
        isMuted: false,
        mode: "listening",
        canSendText: false,
      },
    });
    const composer = new DefaultThreadComposerRuntimeCore(stub);
    composer.setText("hi");
    const onChange = vi.fn();
    composer.subscribe(onChange);

    expect(composer.canSend).toBe(false);

    (stub as { voice: undefined }).voice = undefined;
    stub.notify();

    expect(onChange).toHaveBeenCalled();
    expect(composer.canSend).toBe(true);
  });

  it("is true once the connected session takes typed text and notifies on the flip", () => {
    const stub = makeRuntimeStub({
      voice: {
        status: { type: "starting" },
        isMuted: false,
        mode: "listening",
        canSendText: false,
      },
    });
    const composer = new DefaultThreadComposerRuntimeCore(stub);
    composer.setText("hi");
    const onChange = vi.fn();
    composer.subscribe(onChange);

    expect(composer.canSend).toBe(false);

    (stub as { voice: VoiceSessionState }).voice = {
      status: { type: "running" },
      isMuted: false,
      mode: "listening",
      canSendText: true,
    };
    stub.notify();

    expect(onChange).toHaveBeenCalledOnce();
    expect(composer.canSend).toBe(true);
  });

  it("is false while the draft role is not user during a session", () => {
    const composer = new DefaultThreadComposerRuntimeCore(
      makeRuntimeStub({
        voice: {
          status: { type: "running" },
          isMuted: false,
          mode: "listening",
          canSendText: true,
        },
      }),
    );
    composer.setText("hi");
    composer.setRole("assistant");

    expect(composer.canSend).toBe(false);

    composer.setRole("user");

    expect(composer.canSend).toBe(true);
  });

  it("is false while a typed send into a session carries an attachment", async () => {
    const attachments: AttachmentAdapter = {
      accept: "*",
      add: async ({ file }): Promise<PendingAttachment> => ({
        id: "att-1",
        type: "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send: async (attachment) => ({
        ...attachment,
        status: { type: "complete" },
        content: [],
      }),
    };
    const stub = makeRuntimeStub({
      voice: {
        status: { type: "running" },
        isMuted: false,
        mode: "listening",
        canSendText: true,
      },
    });
    const composer = new DefaultThreadComposerRuntimeCore({
      ...stub,
      adapters: { attachments },
    });
    composer.setText("hi");
    await composer.addAttachment(
      new File(["content"], "f.txt", { type: "text/plain" }),
    );

    expect(composer.canSend).toBe(false);

    await composer.removeAttachment("att-1");

    expect(composer.canSend).toBe(true);
  });
});

describe("BaseComposerRuntimeCore.send", () => {
  it("is a no-op when canSend is false because of isSendDisabled", async () => {
    const stub = makeRuntimeStub({ isSendDisabled: true });
    const composer = new DefaultThreadComposerRuntimeCore(stub);
    composer.setText("hi");

    await composer.send();

    expect(stub.append).not.toHaveBeenCalled();
  });

  it("dispatches when canSend is true", async () => {
    const stub = makeRuntimeStub();
    const composer = new DefaultThreadComposerRuntimeCore(stub);
    composer.setText("hi");

    await composer.send();

    expect(stub.append).toHaveBeenCalledTimes(1);
  });
});

describe("DefaultEditComposerRuntimeCore.canSend", () => {
  it("ignores runtime.isSendDisabled (thread-scoped flag does not block edits)", () => {
    const stub = makeRuntimeStub({ isSendDisabled: true });
    const composer = new DefaultEditComposerRuntimeCore(
      stub as unknown as ThreadRuntimeCore,
      () => {},
      {
        parentId: null,
        message: makeUserMessage("seed"),
      },
    );

    expect(composer.canSend).toBe(true);
  });
});
