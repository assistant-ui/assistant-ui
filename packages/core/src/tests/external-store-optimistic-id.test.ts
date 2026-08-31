import { describe, it, expect, vi } from "vitest";
import { ExternalStoreThreadRuntimeCore } from "../runtimes/external-store/external-store-thread-runtime-core";
import type { ExternalStoreAdapter } from "../runtimes/external-store/external-store-adapter";
import type { ModelContextProvider } from "../model-context/types";
import type { ThreadMessage } from "../types/message";

const createContextProvider = (): ModelContextProvider => ({
  getModelContext: () => ({}),
});

const createUserMessage = (id: string, text = "Hello"): ThreadMessage =>
  ({
    id,
    role: "user" as const,
    createdAt: new Date(),
    content: [{ type: "text" as const, text }],
    attachments: [],
    metadata: {
      custom: {},
    },
  }) as ThreadMessage;

const createAssistantMessage = (id: string, text = "Hi there"): ThreadMessage =>
  ({
    id,
    role: "assistant" as const,
    createdAt: new Date(),
    content: [{ type: "text" as const, text }],
    status: { type: "complete" as const, reason: "stop" as const },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as ThreadMessage;

const createAdapter = (
  messages: readonly ThreadMessage[],
  isRunning: boolean,
): ExternalStoreAdapter<ThreadMessage> => ({
  messages,
  isRunning,
  onNew: vi.fn(async () => {}),
});

describe("ExternalStoreThreadRuntimeCore optimistic placeholder id", () => {
  it("keeps one placeholder id per pending response and issues a fresh one per episode", () => {
    const u1 = createUserMessage("u1");
    const core = new ExternalStoreThreadRuntimeCore(
      createContextProvider(),
      createAdapter([u1], true),
    );
    const first = core.messages.at(-1)!;
    expect(first.role).toBe("assistant");
    expect(first.content).toHaveLength(0);

    core.__internal_setAdapter(createAdapter([u1], true));
    core.__internal_setAdapter(createAdapter([u1], true));
    expect(core.messages.at(-1)!.id).toBe(first.id);

    const u2 = createUserMessage("u2", "follow-up");
    core.__internal_setAdapter(createAdapter([u1, u2], true));
    const second = core.messages.at(-1)!;
    expect(second.role).toBe("assistant");
    expect(second.id).not.toBe(first.id);

    const a1 = createAssistantMessage("a1");
    core.__internal_setAdapter(createAdapter([u1, u2, a1], false));
    expect(core.messages.at(-1)!.id).toBe("a1");

    const u3 = createUserMessage("u3", "again");
    core.__internal_setAdapter(createAdapter([u1, u2, a1, u3], true));
    const third = core.messages.at(-1)!;
    expect(third.role).toBe("assistant");
    expect(third.id).not.toBe(second.id);
  });
});
