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
  it("persists assistant messages waiting for tool approval", async () => {
    const append = vi.fn().mockResolvedValue(undefined);
    const formattedAdapter = {
      load: vi.fn().mockResolvedValue({ messages: [] }),
      append,
    };
    const historyAdapter = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue(formattedAdapter),
    } as unknown as ThreadHistoryAdapter;

    const message: ThreadMessage = {
      id: "approval-message",
      role: "assistant",
      content: [{ type: "text", text: "Approve the tool call" }],
      status: { type: "requires-action", reason: "tool-calls" },
      createdAt: new Date(),
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };
    bindExternalStoreMessage(message, { id: "inner-approval-message" });

    let isRunning = false;
    let notify: (() => void) | undefined;
    const thread = {
      subscribe: vi.fn((listener: () => void) => {
        notify = listener;
        return () => {};
      }),
      getState: () => ({ isRunning, messages: [message] }),
      import: vi.fn(),
      export: vi.fn(),
    } as unknown as AssistantRuntime["thread"];
    const testRuntimeRef = {
      current: { thread } as AssistantRuntime,
    };
    const storageAdapter: MessageFormatAdapter<
      { id: string },
      Record<string, unknown>
    > = {
      format: "test",
      encode: ({ message }) => message,
      decode: (stored) => ({
        parentId: stored.parent_id,
        message: stored.content as { id: string },
      }),
      getId: (storedMessage) => storedMessage.id,
    };

    renderHook(() =>
      useExternalHistory(
        testRuntimeRef,
        historyAdapter,
        () => [message],
        storageAdapter,
        () => {},
      ),
    );

    act(() => {
      isRunning = true;
      notify?.();
      isRunning = false;
      notify?.();
    });

    await waitFor(() =>
      expect(append).toHaveBeenCalledWith({
        parentId: null,
        message: { id: "inner-approval-message" },
      }),
    );
  });
});
