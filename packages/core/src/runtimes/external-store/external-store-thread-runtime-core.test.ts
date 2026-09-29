import { describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import type { Unstable_RecordToolInteractionOptions } from "../../runtime/interfaces/thread-runtime-core";
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

describe("ExternalStoreThreadRuntimeCore resume compatibility", () => {
  it.each([undefined, false])(
    "does not notify subscribers for a successful resume without opt-in: %s",
    async (canResume) => {
      const onResume = vi.fn(async () => {});
      const runtime = createRuntime({ canResume, onResume });
      const subscriber = vi.fn();
      runtime.subscribe(subscriber);

      const pending = runtime.resumeRun({
        parentId: null,
        sourceId: null,
        runConfig: {},
      });
      expect(onResume).toHaveBeenCalledOnce();
      await pending;

      expect(subscriber).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, false])(
    "does not notify subscribers for a failed resume without opt-in: %s",
    async (canResume) => {
      const onResume = vi.fn(() => {
        throw new Error("resume failed");
      });
      const runtime = createRuntime({ canResume, onResume });
      const subscriber = vi.fn();
      runtime.subscribe(subscriber);

      const pending = runtime.resumeRun({
        parentId: null,
        sourceId: null,
        runConfig: {},
      });
      expect(onResume).toHaveBeenCalledOnce();
      await expect(pending).rejects.toThrow("resume failed");

      expect(subscriber).not.toHaveBeenCalled();
    },
  );
});
