import { describe, expect, it, vi } from "vitest";
import { ExternalStoreRuntimeCore } from "../runtimes/external-store/external-store-runtime-core";
import { LocalRuntimeCore } from "../runtimes/local/local-runtime-core";
import type { ChatModelAdapter } from "../runtime/utils/chat-model-adapter";
import type { ThreadMessage } from "../types/message";

async function waitFor(
  predicate: () => unknown,
  timeoutMs = 500,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await predicate();
      return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 5));
  }
  await predicate();
}

const trailingUserMessage = {
  id: "u1",
  role: "user",
  createdAt: new Date(),
  content: [{ type: "text", text: "draft in flight" }],
  attachments: [],
  metadata: { custom: {} },
} as ThreadMessage;

const toolCallMessage = {
  id: "a1",
  role: "assistant",
  createdAt: new Date(),
  status: { type: "requires-action", reason: "tool-calls" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
  content: [
    {
      type: "tool-call",
      toolCallId: "tool-1",
      toolName: "send_email",
      args: { to: "dev@example.com" },
      argsText: '{"to":"dev@example.com"}',
    },
  ],
} as unknown as ThreadMessage;

const externalThread = () => {
  const setToolStatuses = vi.fn();
  const setMessages = vi.fn();
  const onCancel = vi.fn();
  const notifyCancelled = vi.fn();
  const store = {
    messages: [trailingUserMessage] as ThreadMessage[],
    onNew: vi.fn(async () => {}),
    onCancel,
    setMessages,
    unstable_enableToolInvocations: true,
    setToolStatuses,
    queue: {
      __internal_notifyCancelled: notifyCancelled,
    } as never,
  };
  const core = new ExternalStoreRuntimeCore(store);
  core.registerModelContextProvider({
    getModelContext: () => ({
      tools: {
        send_email: {
          parameters: { type: "object", properties: {} },
          execute: vi.fn(() => new Promise(() => {})),
        },
      },
    }),
  });
  return {
    core,
    store,
    thread: core.threads.getMainThreadRuntimeCore(),
    setToolStatuses,
    setMessages,
    onCancel,
    notifyCancelled,
  };
};

const driveExecutingTool = async (
  harness: ReturnType<typeof externalThread>,
) => {
  harness.core.setAdapter({
    ...harness.store,
    messages: [trailingUserMessage, toolCallMessage],
  });
  await waitFor(() => {
    const statuses = harness.setToolStatuses.mock.lastCall?.[0] as
      | Record<string, { type: string }>
      | undefined;
    expect(statuses?.["tool-1"]?.type).toBe("executing");
  });
};

describe("unstable_notifySessionReset", () => {
  it("clears session-scoped tool state once and parks queued work", async () => {
    const harness = externalThread();
    await driveExecutingTool(harness);

    harness.setToolStatuses.mockClear();
    harness.thread.unstable_notifySessionReset();

    expect(harness.setToolStatuses).toHaveBeenCalledTimes(1);
    expect(harness.setToolStatuses).toHaveBeenLastCalledWith({});
    expect(harness.notifyCancelled).toHaveBeenCalledTimes(1);
  });

  it("carries no run-cancel semantics", async () => {
    const harness = externalThread();
    await driveExecutingTool(harness);

    harness.thread.unstable_notifySessionReset();

    expect(harness.onCancel).not.toHaveBeenCalled();
    expect(harness.setMessages).not.toHaveBeenCalled();
    expect(harness.thread.messages.at(-1)?.id).toBe("a1");
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
