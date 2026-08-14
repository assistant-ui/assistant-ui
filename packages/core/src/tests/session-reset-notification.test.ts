import { describe, expect, it, vi } from "vitest";
import { ExternalStoreRuntimeCore } from "../runtimes/external-store/external-store-runtime-core";
import { LocalRuntimeCore } from "../runtimes/local/local-runtime-core";
import type { ChatModelAdapter } from "../runtime/utils/chat-model-adapter";
import type { ThreadMessage } from "../types/message";

const trailingUserMessage = {
  id: "u1",
  role: "user",
  createdAt: new Date(),
  content: [{ type: "text", text: "draft in flight" }],
  attachments: [],
  metadata: { custom: {} },
} as ThreadMessage;

const externalThread = () => {
  const setToolStatuses = vi.fn();
  const setMessages = vi.fn();
  const onCancel = vi.fn();
  const notifyCancelled = vi.fn();
  const core = new ExternalStoreRuntimeCore({
    messages: [trailingUserMessage],
    onNew: vi.fn(async () => {}),
    onCancel,
    setMessages,
    unstable_enableToolInvocations: true,
    setToolStatuses,
    queue: {
      __internal_notifyCancelled: notifyCancelled,
    } as never,
  });
  return {
    thread: core.threads.getMainThreadRuntimeCore(),
    setToolStatuses,
    setMessages,
    onCancel,
    notifyCancelled,
  };
};

describe("unstable_notifySessionReset", () => {
  it("clears session-scoped tool state and parks queued work", () => {
    const { thread, setToolStatuses, notifyCancelled } = externalThread();

    thread.unstable_notifySessionReset();

    expect(setToolStatuses).toHaveBeenLastCalledWith({});
    expect(notifyCancelled).toHaveBeenCalledTimes(1);
  });

  it("carries no run-cancel semantics", () => {
    const { thread, setMessages, onCancel } = externalThread();

    thread.unstable_notifySessionReset();

    expect(onCancel).not.toHaveBeenCalled();
    expect(setMessages).not.toHaveBeenCalled();
    expect(thread.messages.at(-1)?.id).toBe("u1");
  });

  it("throws on runtimes without a backing session", () => {
    const local = new LocalRuntimeCore(
      {
        adapters: { chatModel: { async *run() {} } satisfies ChatModelAdapter },
      },
      undefined,
    );

    expect(() =>
      local.threads.getMainThreadRuntimeCore().unstable_notifySessionReset(),
    ).toThrow("Runtime does not support resetting sessions.");
  });
});
