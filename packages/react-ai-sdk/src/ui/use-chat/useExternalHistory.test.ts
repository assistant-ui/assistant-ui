// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  AssistantRuntime,
  MessageFormatAdapter,
  MessageFormatRepository,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { bindExternalStoreMessage } from "@assistant-ui/core";

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({
    threadListItem: Object.assign(() => null, { source: undefined }),
  }),
}));

import { MessageRepository } from "@assistant-ui/core/internal";
import {
  toExportedMessageRepository,
  useExternalHistory,
} from "./useExternalHistory";

const noopThread = {
  subscribe: () => () => {},
  getState: () => ({ isRunning: false, messages: [] }),
  import: () => {},
  export: () => ({ headId: null, messages: [] }),
} as unknown as AssistantRuntime["thread"];

const runtimeRef = {
  current: { thread: noopThread } as AssistantRuntime,
};

const storageFormat: MessageFormatAdapter<unknown, Record<string, unknown>> = {
  format: "test",
  encode: (item) => ({ data: item.message }),
  decode: (stored) => ({
    parentId: stored.parent_id,
    message: stored.content,
  }),
  getId: () => "id",
};

const toThreadMessages = (_messages: unknown[]): ThreadMessage[] => [];
const onSetMessages = () => {};

describe("useExternalHistory withFormat contract", () => {
  it("throws when the adapter omits withFormat", () => {
    const adapterWithoutWithFormat: ThreadHistoryAdapter = {
      load: vi.fn().mockResolvedValue({ headId: null, messages: [] }),
      append: vi.fn().mockResolvedValue(undefined),
    };

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      renderHook(() =>
        useExternalHistory(
          runtimeRef,
          adapterWithoutWithFormat,
          toThreadMessages,
          storageFormat,
          onSetMessages,
        ),
      ),
    ).toThrow(/withFormat/);

    errorSpy.mockRestore();
  });

  it("does not throw when no adapter is supplied", () => {
    expect(() =>
      renderHook(() =>
        useExternalHistory(
          runtimeRef,
          undefined,
          toThreadMessages,
          storageFormat,
          onSetMessages,
        ),
      ),
    ).not.toThrow();
  });

  it("accepts an adapter that implements withFormat", () => {
    const withFormatResult = {
      load: vi.fn().mockResolvedValue({ headId: null, messages: [] }),
      append: vi.fn().mockResolvedValue(undefined),
    };
    const adapter: ThreadHistoryAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue(withFormatResult),
    };

    expect(() =>
      renderHook(() =>
        useExternalHistory(
          runtimeRef,
          adapter,
          toThreadMessages,
          storageFormat,
          onSetMessages,
        ),
      ),
    ).not.toThrow();

    expect(adapter.withFormat).toHaveBeenCalledWith(storageFormat);
  });
});

describe("toExportedMessageRepository", () => {
  const convert = (items: { id: string; ok: boolean }[]): ThreadMessage[] =>
    items[0]!.ok ? [{ id: items[0]!.id } as ThreadMessage] : [];

  it("drops a malformed row together with its now-orphaned descendants", () => {
    const repo: MessageFormatRepository<{ id: string; ok: boolean }> = {
      headId: "c",
      messages: [
        { parentId: null, message: { id: "a", ok: true } },
        { parentId: "a", message: { id: "b", ok: false } },
        { parentId: "b", message: { id: "c", ok: true } },
      ],
    };

    const result = toExportedMessageRepository(convert, repo);

    expect(result.messages.map((m) => m.message.id)).toEqual(["a"]);
    expect(result.headId).toBeNull();
    expect(() => new MessageRepository().import(result)).not.toThrow();
  });

  it("drops a headId that points at a filtered row", () => {
    const repo: MessageFormatRepository<{ id: string; ok: boolean }> = {
      headId: "b",
      messages: [
        { parentId: null, message: { id: "a", ok: true } },
        { parentId: "a", message: { id: "b", ok: false } },
      ],
    };

    const result = toExportedMessageRepository(convert, repo);

    expect(result.messages.map((m) => m.message.id)).toEqual(["a"]);
    expect(result.headId).toBeNull();
    expect(() => new MessageRepository().import(result)).not.toThrow();
  });

  it("drops a malformed root and its entire subtree", () => {
    const repo: MessageFormatRepository<{ id: string; ok: boolean }> = {
      headId: "b",
      messages: [
        { parentId: null, message: { id: "a", ok: false } },
        { parentId: "a", message: { id: "b", ok: true } },
      ],
    };

    const result = toExportedMessageRepository(convert, repo);

    expect(result.messages).toHaveLength(0);
    expect(result.headId).toBeNull();
    expect(() => new MessageRepository().import(result)).not.toThrow();
  });
});

describe("useExternalHistory persistence", () => {
  it("only updates persisted messages that change during the active run", async () => {
    type StoredMessage = { id: string; text: string };

    const append = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);
    const reportTelemetry = vi.fn();
    const formattedAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
      update,
      reportTelemetry,
    };
    const historyAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue(formattedAdapter),
    } as unknown as ThreadHistoryAdapter;

    const makeMessage = (
      id: string,
      innerId: string,
      text: string,
    ): ThreadMessage => {
      const message: ThreadMessage = {
        id,
        role: "assistant",
        content: [{ type: "text", text }],
        status: { type: "complete", reason: "stop" },
        createdAt: new Date(),
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      };
      bindExternalStoreMessage(message, { id: innerId, text });
      return message;
    };

    let messages = [
      makeMessage("old", "inner-old", "old"),
      makeMessage("active", "inner-active", "initial"),
      makeMessage("tail", "inner-tail", "tail"),
    ];
    let isRunning = false;
    let notify: (() => void) | undefined;
    const thread = {
      subscribe: vi.fn((listener: () => void) => {
        notify = listener;
        return () => {};
      }),
      getState: () => ({ isRunning, messages }),
      import: vi.fn(),
      export: vi.fn(),
    } as unknown as AssistantRuntime["thread"];
    const testRuntimeRef = {
      current: { thread } as AssistantRuntime,
    };
    const testStorageFormat: MessageFormatAdapter<
      StoredMessage,
      Record<string, unknown>
    > = {
      format: "test",
      encode: ({ message }) => message,
      decode: (stored) => ({
        parentId: stored.parent_id,
        message: stored.content as StoredMessage,
      }),
      getId: (message) => message.id,
    };

    renderHook(() =>
      useExternalHistory(
        testRuntimeRef,
        historyAdapter,
        () => messages,
        testStorageFormat,
        () => {},
      ),
    );

    const setRunning = (value: boolean) => {
      act(() => {
        isRunning = value;
        notify?.();
      });
    };

    setRunning(true);
    setRunning(false);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(3));

    append.mockClear();
    update.mockClear();
    reportTelemetry.mockClear();
    setRunning(true);
    act(() => {
      messages = [
        messages[0]!,
        makeMessage("active", "inner-active", "completed"),
        messages[2]!,
      ];
      notify?.();
    });
    setRunning(false);
    setRunning(true);
    setRunning(false);

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(append).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      {
        parentId: "inner-old",
        message: { id: "inner-active", text: "completed" },
      },
      "inner-active",
    );
    expect(reportTelemetry).toHaveBeenCalledTimes(1);
    expect(reportTelemetry).toHaveBeenCalledWith(
      [
        {
          parentId: "inner-old",
          message: { id: "inner-active", text: "completed" },
        },
      ],
      expect.objectContaining({ durationMs: expect.any(Number) }),
    );
  });
});
