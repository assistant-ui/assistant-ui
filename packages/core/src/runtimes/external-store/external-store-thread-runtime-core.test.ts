import { describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import type { Unstable_RecordToolInteractionOptions } from "../../runtime/interfaces/thread-runtime-core";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../../runtime/utils/message-repository";
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

describe("ExternalStoreThreadRuntimeCore resume lifecycle", () => {
  const config = { parentId: null, sourceId: null, runConfig: {} };

  it.each([undefined, false, true])(
    "preserves the adapter receiver with canResume=%s",
    async (canResume) => {
      const onResume = vi.fn(function (this: ExternalStoreAdapter) {
        expect(this).toBe(adapter);
        return Promise.resolve();
      });
      const adapter: ExternalStoreAdapter = {
        messages: [],
        onNew: async () => {},
        canResume,
        onResume,
      };
      const runtime = new ExternalStoreThreadRuntimeCore(
        modelContextProvider,
        adapter,
      );
      await runtime.resumeRun(config);
      expect(onResume).toHaveBeenCalledExactlyOnceWith(config);
    },
  );

  it.each([undefined, false, true])(
    "preserves synchronous adapter errors with canResume=%s",
    async (canResume) => {
      const error = new Error("adapter resume failed");
      const adapter: ExternalStoreAdapter = {
        messages: [],
        onNew: async () => {},
        canResume,
        onResume() {
          expect(this).toBe(adapter);
          throw error;
        },
      };
      const runtime = new ExternalStoreThreadRuntimeCore(
        modelContextProvider,
        adapter,
      );
      await expect(runtime.resumeRun(config)).rejects.toBe(error);
      expect(runtime.canResume).toBe(canResume === true);
    },
  );

  it.each([
    "session",
    "reset",
    "import",
    "external state",
    "repository",
    "branch",
  ] as const)(
    "allows a new resume after %s changes without the old completion clearing it",
    async (boundary) => {
      const finish: Array<() => void> = [];
      const onResume = vi.fn(
        () => new Promise<void>((resolve) => finish.push(resolve)),
      );
      const adapter: ExternalStoreAdapter = {
        messageRepository: ExportedMessageRepository.fromBranchableArray(
          [
            {
              parentId: null,
              message: {
                id: "first",
                role: "assistant",
                content: "First branch",
              },
            },
            {
              parentId: null,
              message: {
                id: "other",
                role: "assistant",
                content: "Other branch",
              },
            },
          ],
          { headId: "first" },
        ),
        onNew: async () => {},
        onResume,
        canResume: true,
        setMessages: vi.fn(),
        onLoadExternalState: vi.fn(),
      };
      const runtime = new ExternalStoreThreadRuntimeCore(
        modelContextProvider,
        adapter,
      );
      const first = runtime.resumeRun(config);
      expect(runtime.canResume).toBe(false);

      switch (boundary) {
        case "session":
          runtime.unstable_notifySessionReset();
          break;
        case "reset":
          runtime.reset();
          break;
        case "import":
          runtime.import(ExportedMessageRepository.fromArray([]));
          break;
        case "external state":
          runtime.importExternalState({});
          break;
        case "repository":
          runtime.__internal_setAdapter({
            ...adapter,
            unstable_messageRepositoryInstance: new MessageRepository(),
          });
          break;
        case "branch":
          runtime.switchToBranch("other");
          break;
      }
      expect(runtime.canResume).toBe(true);
      const second = runtime.resumeRun(config);
      expect(onResume).toHaveBeenCalledTimes(2);
      finish[0]!();
      await first;
      expect(runtime.canResume).toBe(false);
      const duplicate = runtime.resumeRun(config);
      expect(onResume).toHaveBeenCalledTimes(2);
      finish[1]!();
      await Promise.all([second, duplicate]);
      expect(runtime.canResume).toBe(true);
    },
  );

  it("keeps the pending resume when switching to the current branch", async () => {
    let finish!: () => void;
    const onResume = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const runtime = createRuntime({
      messageRepository: ExportedMessageRepository.fromArray([
        { id: "first", role: "assistant", content: "First branch" },
      ]),
      setMessages: vi.fn(),
      canResume: true,
      onResume,
    });
    const first = runtime.resumeRun(config);
    runtime.switchToBranch("first");
    const duplicate = runtime.resumeRun(config);
    expect(onResume).toHaveBeenCalledOnce();
    finish();
    await Promise.all([first, duplicate]);
  });
});
