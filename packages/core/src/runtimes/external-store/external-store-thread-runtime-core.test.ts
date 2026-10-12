import { describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import type { Unstable_RecordToolInteractionOptions } from "../../runtime/interfaces/thread-runtime-core";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const modelContextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const interaction: Unstable_RecordToolInteractionOptions = {
  messageId: "message-1",
  toolCallId: "call-1",
  interaction: {
    type: "action",
    payload: { action: "toggle" },
    occurredAt: 0,
  },
};

const createRuntime = (overrides: Partial<ExternalStoreAdapter> = {}) =>
  new ExternalStoreThreadRuntimeCore(modelContextProvider, {
    messages: [],
    onNew: async () => {},
    ...overrides,
  } as ExternalStoreAdapter);

describe("ExternalStoreThreadRuntimeCore interaction recording", () => {
  it("delegates interaction records to the adapter", async () => {
    const onRecordToolInteraction = vi.fn(async () => {});
    const runtime = createRuntime({
      unstable_onRecordToolInteraction: onRecordToolInteraction,
    });

    await runtime.unstable_recordToolInteraction(interaction);

    expect(onRecordToolInteraction).toHaveBeenCalledExactlyOnceWith(
      interaction,
    );
  });

  it("rejects when the adapter does not record interactions", async () => {
    const runtime = createRuntime();

    await expect(
      runtime.unstable_recordToolInteraction(interaction),
    ).rejects.toThrow("Runtime does not support recording tool interactions.");
  });
});

describe("ExternalStoreThreadRuntimeCore earlier messages", () => {
  it("reports earlier messages only when the adapter can load them", () => {
    expect(createRuntime({ hasEarlier: true }).hasEarlier).toBe(false);
    expect(createRuntime({ onLoadEarlier: async () => {} }).hasEarlier).toBe(
      false,
    );
    expect(
      createRuntime({ hasEarlier: true, onLoadEarlier: async () => {} })
        .hasEarlier,
    ).toBe(true);
  });

  it("shares one in-flight load and reports it until it settles", async () => {
    let finish!: () => void;
    const onLoadEarlier = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    const runtime = createRuntime({ hasEarlier: true, onLoadEarlier });
    const notified = vi.fn();
    runtime.subscribe(notified);

    const first = runtime.loadEarlier();
    const second = runtime.loadEarlier();
    expect(second).toBe(first);
    expect(runtime.isLoadingEarlier).toBe(true);
    expect(notified).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(onLoadEarlier).toHaveBeenCalledTimes(1);

    finish();
    await first;
    expect(runtime.isLoadingEarlier).toBe(false);
    expect(notified).toHaveBeenCalledTimes(2);
  });

  it("logs a rejected load and clears the loading state", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const runtime = createRuntime({
      hasEarlier: true,
      onLoadEarlier: async () => {
        throw new Error("offline");
      },
    });

    await runtime.loadEarlier();
    expect(runtime.isLoadingEarlier).toBe(false);
    expect(error).toHaveBeenCalledWith(
      "[ExternalStoreThreadRuntimeCore] onLoadEarlier callback rejected",
      new Error("offline"),
    );
    error.mockRestore();
  });

  it("resolves without calling the adapter when nothing earlier exists", async () => {
    const onLoadEarlier = vi.fn(async () => {});
    const runtime = createRuntime({ hasEarlier: false, onLoadEarlier });

    await runtime.loadEarlier();
    expect(onLoadEarlier).not.toHaveBeenCalled();
    expect(runtime.isLoadingEarlier).toBe(false);
  });
});

describe("ExternalStoreThreadRuntimeCore feedback with converted messages", () => {
  type RawMessage = {
    id: string;
    role: "user" | "assistant";
    text: string;
  };

  const convertMessage = (message: RawMessage): ThreadMessageLike => ({
    id: message.id,
    role: message.role,
    content: [{ type: "text", text: message.text }],
  });

  it("retains feedback across an external-store branch round trip", () => {
    const user = { id: "u", role: "user", text: "hi" } as const;
    const first = { id: "a1", role: "assistant", text: "first" } as const;
    const sibling = { id: "a2", role: "assistant", text: "second" } as const;
    let messages: readonly RawMessage[] = [user, first];
    const adapter = () =>
      ({
        messages,
        convertMessage,
        setMessages: (next: readonly RawMessage[]) => {
          messages = next;
        },
        onNew: async () => {},
      }) as ExternalStoreAdapter;
    const runtime = createRuntime(adapter());

    messages = [user, sibling];
    runtime.__internal_setAdapter(adapter());
    runtime.switchToBranch("a1");
    runtime.__internal_setAdapter(adapter());
    runtime.submitFeedback({ messageId: "a1", type: "positive" });

    runtime.switchToBranch("a2");
    runtime.__internal_setAdapter(adapter());
    runtime.switchToBranch("a1");
    runtime.__internal_setAdapter(adapter());

    expect(
      runtime.messages.find((message) => message.id === "a1")?.metadata
        .submittedFeedback,
    ).toEqual({ type: "positive" });
  });

  it("does not restore feedback when a deleted host message is re-added", async () => {
    const user = { id: "u", role: "user", text: "hi" } as const;
    const assistant = { id: "a1", role: "assistant", text: "first" } as const;
    let messages: readonly RawMessage[] = [user, assistant];
    let runtime!: ExternalStoreThreadRuntimeCore;
    const adapter = () =>
      ({
        messages,
        convertMessage,
        setMessages: (next: readonly RawMessage[]) => {
          messages = next;
        },
        onDelete: async (id: string) => {
          messages = messages.filter((message) => message.id !== id);
          runtime.__internal_setAdapter(adapter());
        },
        onNew: async () => {},
      }) as ExternalStoreAdapter;
    runtime = createRuntime(adapter());

    runtime.submitFeedback({ messageId: "a1", type: "positive" });
    await runtime.deleteMessage("a1");

    messages = [user, assistant];
    runtime.__internal_setAdapter(adapter());

    expect(
      runtime.messages.find((message) => message.id === "a1")?.metadata
        .submittedFeedback,
    ).toBeUndefined();
  });
});
