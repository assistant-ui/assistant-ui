// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadAssistantMessage } from "../../../types/message";
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
      threads: {
        item: vi.fn(() => threadListItem),
        getState: () => ({ threadItems: [{ id, remoteId }] }),
      },
    } as unknown as import("@assistant-ui/store").AssistantClient;
  };

  const makeSplitClient = (remoteId: string) => {
    const itemShape = () => ({
      source: "threads",
      getState: () => ({ id: remoteId, remoteId }),
      initialize: async () => ({ remoteId, externalId: undefined }),
    });
    const live = itemShape();
    const listItem = itemShape();
    return {
      threadListItem: live,
      threads: {
        item: vi.fn(() => listItem),
        getState: () => ({ threadItems: [{ id: remoteId, remoteId }] }),
      },
    } as unknown as import("@assistant-ui/store").AssistantClient;
  };

  return {
    makeClient,
    makeSplitClient,
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
        feedback: vi.fn().mockResolvedValue({
          feedback_id: "feedback-1",
          type: "positive",
        }),
      },
    },
    telemetry: { enabled: true },
    runs: { report: vi.fn().mockResolvedValue(undefined) },
  }) as unknown as AssistantCloud;

const makeAssistantMessage = (id: string): ThreadAssistantMessage => ({
  id,
  role: "assistant",
  content: [{ type: "text", text: "done" }],
  status: { type: "complete", reason: "stop" },
  createdAt: new Date(0),
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("submits feedback with the mapped cloud message ID", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const cloudRef = { current: cloud };
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter(cloudRef),
    );
    const message = makeAssistantMessage("local-message-1");

    await result.current.append({ parentId: null, message });
    result.current.feedback.submit({ message, type: "positive" });

    await waitFor(() => {
      expect(cloud.threads.messages.feedback).toHaveBeenCalledWith(
        "thread-1",
        "remote-message-1",
        { type: "positive" },
      );
    });
  });

  it("warns and skips feedback before the thread has a remote ID", async () => {
    mocks.aui = mocks.makeClient(undefined, "local-thread", "thread-1");
    const cloud = makeCloud();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const message = makeAssistantMessage("local-message-1");

    result.current.feedback.submit({ message, type: "negative" });

    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        "[assistant-ui] Skipping feedback for message local-message-1: the thread has no remote id.",
      );
    });
    expect(cloud.threads.messages.feedback).not.toHaveBeenCalled();
  });

  it("warns and skips feedback before the message has a cloud ID", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const message = makeAssistantMessage("local-message-1");

    result.current.feedback.submit({ message, type: "negative" });

    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        "[assistant-ui] Skipping feedback for message local-message-1: no cloud message id is mapped.",
      );
    });
    expect(cloud.threads.messages.feedback).not.toHaveBeenCalled();
  });

  it("reports cloud feedback errors without throwing them into the UI", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const error = new Error("feedback unavailable");
    vi.mocked(cloud.threads.messages.feedback).mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const message = makeAssistantMessage("local-message-1");

    await result.current.append({ parentId: null, message });
    expect(() =>
      result.current.feedback.submit({ message, type: "positive" }),
    ).not.toThrow();

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Cloud feedback submission failed:",
        error,
      );
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

  it("reports frontend and MCP sources for ai-sdk/v6 tool calls", () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const cloudRef = { current: cloud };
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter(cloudRef),
    );
    const formatted = result.current.withFormat({
      format: "ai-sdk/v6",
      encode: ({ message }) => message,
      decode: ({ parent_id, content }) => ({
        parentId: parent_id,
        message: content as { id: string },
      }),
      getId: (message: { id: string }) => message.id,
    });

    formatted.reportTelemetry([
      {
        parentId: null,
        message: {
          id: "message-1",
          role: "assistant",
          parts: [
            { type: "step-start" },
            {
              type: "tool-search",
              toolCallId: "static-1",
              input: { query: "test" },
              output: { result: "ok" },
            },
            {
              type: "dynamic-tool",
              toolName: "mcp-search",
              toolCallId: "dynamic-1",
              input: { query: "test" },
              output: { result: "ok" },
            },
            { type: "step-start" },
            {
              type: "tool-search",
              toolCallId: "static-2",
              input: { query: "again" },
              output: { result: "ok" },
            },
          ],
        },
      },
    ]);

    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_calls: [
          expect.objectContaining({
            tool_call_id: "static-1",
            tool_source: "frontend",
          }),
          expect.objectContaining({
            tool_call_id: "dynamic-1",
            tool_source: "mcp",
          }),
          expect.objectContaining({
            tool_call_id: "static-2",
            tool_source: "frontend",
          }),
        ],
        steps: [
          {
            tool_calls: [
              expect.objectContaining({
                tool_call_id: "static-1",
                tool_source: "frontend",
              }),
              expect.objectContaining({
                tool_call_id: "dynamic-1",
                tool_source: "mcp",
              }),
            ],
          },
          {
            tool_calls: [
              expect.objectContaining({
                tool_call_id: "static-2",
                tool_source: "frontend",
              }),
            ],
          },
        ],
      }),
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

  it("updates a history-loaded message when the list item identity differs from the live item", async () => {
    mocks.aui = mocks.makeSplitClient("thread-split");
    const cloud = makeCloud();
    (cloud.threads.messages.list as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        messages: [
          {
            id: "m1",
            parent_id: null,
            format: "test",
            content: { id: "m1" },
          },
        ],
      },
    );
    const cloudRef = { current: cloud };
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

    formatted.pin!();
    await formatted.load();
    await formatted.update!({ parentId: null, message: { id: "m1" } }, "m1");

    expect(cloud.threads.messages.update).toHaveBeenCalledWith(
      "thread-split",
      "m1",
      expect.anything(),
    );
  });
});
