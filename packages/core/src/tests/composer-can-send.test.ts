import { describe, expect, it, vi } from "vitest";
import { DefaultThreadComposerRuntimeCore } from "../runtime/base/default-thread-composer-runtime-core";
import { DefaultEditComposerRuntimeCore } from "../runtime/base/default-edit-composer-runtime-core";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";
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
    const composer = new DefaultEditComposerRuntimeCore(stub, () => {}, {
      parentId: null,
      message: makeUserMessage("seed"),
    });

    expect(composer.canSend).toBe(true);
  });
});
