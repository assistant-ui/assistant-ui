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
  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "shares one opt-in attempt across configs when callback changes=%s and availability clears=%s",
    async (changeCallback, clearAvailability) => {
      let finish!: () => void;
      const onResume = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      );
      const replacement = vi.fn(async () => {});
      const runtime = createRuntime({ canResume: true, onResume });
      const firstConfig = { parentId: null, sourceId: null, runConfig: {} };
      const nextConfig = {
        ...firstConfig,
        runConfig: { custom: { mode: "next" } },
      };
      const first = runtime.resumeRun(firstConfig);
      const currentCallback = changeCallback ? replacement : onResume;
      runtime.__internal_setAdapter({
        messages: [],
        onNew: async () => {},
        onResume: currentCallback,
        canResume: !clearAvailability,
      });
      const next = runtime.resumeRun(nextConfig);

      expect(onResume).toHaveBeenCalledExactlyOnceWith(firstConfig);
      expect(replacement).not.toHaveBeenCalled();
      expect(runtime.canResume).toBe(false);
      finish();
      await Promise.all([first, next]);
      expect(runtime.canResume).toBe(!clearAvailability);

      runtime.__internal_setAdapter({
        messages: [],
        onNew: async () => {},
        onResume: currentCallback,
        canResume: true,
      });
      onResume.mockResolvedValue(undefined);
      await runtime.resumeRun(nextConfig);
      expect(currentCallback).toHaveBeenLastCalledWith(nextConfig);
      expect(currentCallback).toHaveBeenCalledTimes(changeCallback ? 1 : 2);
      expect(runtime.canResume).toBe(true);
    },
  );

  it("shares an opt-in failure and accepts a new config on retry", async () => {
    let fail!: (error: Error) => void;
    const onResume = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            fail = reject;
          }),
      )
      .mockResolvedValue(undefined);
    const runtime = createRuntime({ canResume: true, onResume });
    const config = { parentId: null, sourceId: null, runConfig: {} };
    const nextConfig = { ...config, runConfig: { custom: { mode: "retry" } } };
    const pending = runtime.resumeRun(config);
    const duplicate = runtime.resumeRun(nextConfig);
    const outcomes = Promise.allSettled([pending, duplicate]);
    const error = new Error("Reconnect failed");
    fail(error);

    expect(await outcomes).toEqual([
      { status: "rejected", reason: error },
      { status: "rejected", reason: error },
    ]);
    expect(onResume).toHaveBeenCalledExactlyOnceWith(config);
    expect(runtime.canResume).toBe(true);
    await runtime.resumeRun(nextConfig);
    expect(onResume).toHaveBeenNthCalledWith(2, nextConfig);
    expect(runtime.canResume).toBe(true);
  });

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
