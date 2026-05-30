// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  AssistantRuntime,
  MessageFormatAdapter,
  MessageFormatRepository,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({
    threadListItem: Object.assign(() => null, { source: undefined }),
  }),
}));

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
  it("skips rows that fail to convert instead of emitting an undefined message", () => {
    const repo: MessageFormatRepository<{ kind: string }> = {
      headId: "good",
      messages: [
        { parentId: null, message: { kind: "bad" } },
        { parentId: "good", message: { kind: "good" } },
      ],
    };

    const convert = (items: { kind: string }[]): ThreadMessage[] =>
      items[0]!.kind === "good" ? [{ id: "good" } as ThreadMessage] : [];

    const result = toExportedMessageRepository(convert, repo);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.message).toEqual({ id: "good" });
    expect(result.messages.every((m) => m.message !== undefined)).toBe(true);
  });
});
