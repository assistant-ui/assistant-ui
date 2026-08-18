// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { describe, expect, it, vi } from "vitest";
import { useAssistantCloudThreadHistoryAdapter } from "./AssistantCloudThreadHistoryAdapter";

const mocks = vi.hoisted(() => {
  const makeClient = (
    remoteId: string | undefined,
    id = remoteId ?? "local-thread",
    initializeRemoteId = remoteId ?? id,
  ) => {
    const threadListItem = {
      source: "threads",
      getState: () => ({ id, remoteId }),
      initialize: async () => ({
        remoteId: initializeRemoteId,
        externalId: undefined,
      }),
    };
    return {
      threadListItem,
      threads: { item: vi.fn(() => threadListItem) },
    } as unknown as import("@assistant-ui/store").AssistantClient;
  };

  return {
    makeClient,
    aui: makeClient("thread-1"),
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
}));

const makeCloud = () =>
  ({
    threads: {
      messages: {
        list: vi.fn().mockResolvedValue({ messages: [] }),
        create: vi.fn().mockResolvedValue({ message_id: "remote-message-1" }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    },
    telemetry: { enabled: true },
    runs: { report: vi.fn().mockResolvedValue(undefined) },
  }) as unknown as AssistantCloud;

describe("useAssistantCloudThreadHistoryAdapter", () => {
  it("refreshes formatted persistence when the Cloud client changes", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();
    const cloudRef = { current: firstCloud };
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter(cloudRef),
    );
    const formatted = result.current.withFormat<
      { id: string },
      Record<string, unknown>
    >({
      format: "test",
      encode: ({ message }) => message,
      decode: ({ parent_id, content }) => ({
        parentId: parent_id,
        message: content as { id: string },
      }),
      getId: (message) => message.id,
    });

    await formatted.load();
    await formatted.load();

    expect(firstCloud.threads.messages.list).toHaveBeenCalledTimes(2);

    cloudRef.current = secondCloud;
    await formatted.load();

    expect(firstCloud.threads.messages.list).toHaveBeenCalledTimes(2);
    expect(secondCloud.threads.messages.list).toHaveBeenCalledOnce();
    expect(secondCloud.threads.messages.list).toHaveBeenCalledWith("thread-1", {
      format: "test",
    });
  });

  it("resolves formatted persistence against the current threadListItem", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const cloudRef = { current: cloud };
    const { result, rerender } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter(cloudRef),
    );
    const formatted = result.current.withFormat<
      { id: string },
      Record<string, unknown>
    >({
      format: "test",
      encode: ({ message }) => message,
      decode: ({ parent_id, content }) => ({
        parentId: parent_id,
        message: content as { id: string },
      }),
      getId: (message) => message.id,
    });

    await formatted.load();
    expect(cloud.threads.messages.list).toHaveBeenCalledWith("thread-1", {
      format: "test",
    });

    mocks.aui = mocks.makeClient("thread-2");
    rerender();
    await formatted.load();
    expect(cloud.threads.messages.list).toHaveBeenCalledWith("thread-2", {
      format: "test",
    });
  });

  it("resolves the aui client at call time instead of capturing it", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const cloudRef = { current: cloud };
    const { result, rerender } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter(cloudRef),
    );

    await result.current.load();
    expect(cloud.threads.messages.list).toHaveBeenCalledWith("thread-1", {
      format: "aui/v0",
    });

    mocks.aui = mocks.makeClient("thread-2");
    rerender();

    await result.current.load();
    expect(cloud.threads.messages.list).toHaveBeenCalledWith("thread-2", {
      format: "aui/v0",
    });
  });

  it("pins formatted writes and telemetry to the keyed thread item", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const cloudRef = { current: cloud };
    const { result, rerender } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter(cloudRef),
    );
    const formatted = result.current.withFormat({
      format: "aui/v0",
      encode: ({ message }) => message,
      decode: ({ parent_id, content }) => ({
        parentId: parent_id,
        message: content as { id: string },
      }),
      getId: (message: { id: string }) => message.id,
    });
    const item = {
      parentId: null,
      message: {
        id: "message-1",
        role: "assistant",
        content: [{ type: "text", text: "done" }],
        status: { type: "complete" },
      },
    };

    await formatted.append(item);

    mocks.aui = mocks.makeClient("thread-2");
    rerender();
    await formatted.update(item, "message-1");
    formatted.reportTelemetry([item]);

    expect(cloud.threads.messages.create).toHaveBeenCalledWith(
      "thread-1",
      expect.anything(),
    );
    expect(cloud.threads.messages.update).toHaveBeenCalledWith(
      "thread-1",
      "remote-message-1",
      expect.anything(),
    );
    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({ thread_id: "thread-1" }),
    );
  });

  it("initializes the pinned item instead of the new main thread", async () => {
    mocks.aui = mocks.makeClient(undefined, "new-thread", "thread-1");
    const cloud = makeCloud();
    const cloudRef = { current: cloud };
    const { result, rerender } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter(cloudRef),
    );
    const formatted = result.current.withFormat({
      format: "test",
      encode: ({ message }) => message,
      decode: ({ parent_id, content }) => ({
        parentId: parent_id,
        message: content as { id: string },
      }),
      getId: (message: { id: string }) => message.id,
    });

    formatted.pin?.();
    await formatted.append({ parentId: null, message: { id: "message-1" } });
    mocks.aui = mocks.makeClient("thread-2");
    rerender();
    await formatted.append({ parentId: null, message: { id: "message-2" } });

    expect(cloud.threads.messages.create).toHaveBeenCalledWith(
      "thread-1",
      expect.anything(),
    );
  });
});
