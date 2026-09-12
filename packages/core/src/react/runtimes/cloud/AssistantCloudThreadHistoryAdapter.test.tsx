// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadAssistantMessage } from "../../../types/message";
import {
  useAssistantCloudThreadHistoryAdapter,
  useScopedAssistantCloudThreadHistoryAdapter,
} from "./AssistantCloudThreadHistoryAdapter";

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
        getState: () => ({
          mainThreadId: id,
          threadItems: [{ id, remoteId }],
        }),
      },
      thread: { getState: () => ({ isEmpty: false, suggestions: [] }) },
      on: () => () => {},
      subscribe: () => () => {},
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
        getState: () => ({
          mainThreadId: remoteId,
          threadItems: [{ id: remoteId, remoteId }],
        }),
      },
      thread: { getState: () => ({ isEmpty: false, suggestions: [] }) },
      on: () => () => {},
      subscribe: () => () => {},
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

const makeCloud = (telemetry: Partial<AssistantCloud["telemetry"]> = {}) =>
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
    events: { track: vi.fn() },
    telemetry: { enabled: true, ...telemetry },
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

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAssistantCloudThreadHistoryAdapter", () => {
  it("tracks cloud engagement events without message content", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(100);
    const listeners = new Map<string, (payload: any) => void>();
    let notify: (() => void) | undefined;
    const threadState = {
      isEmpty: false,
      suggestions: [] as { prompt: string }[],
    };
    const threadListItem = {
      source: "threads",
      getState: () => ({ id: "thread-1", remoteId: "thread-1" }),
      initialize: async () => ({ remoteId: "thread-1", externalId: undefined }),
    };
    mocks.aui = {
      threadListItem,
      threads: {
        item: vi.fn(() => threadListItem),
        getState: () => ({
          mainThreadId: "thread-1",
          threadItems: [{ id: "thread-1", remoteId: "thread-1" }],
        }),
      },
      thread: { getState: () => threadState },
      on: vi.fn((selector, callback) => {
        listeners.set(selector.event, callback);
        return () => listeners.delete(selector.event);
      }),
      subscribe: vi.fn((callback) => {
        notify = callback;
        return () => {};
      }),
    } as unknown as import("@assistant-ui/store").AssistantClient;
    const cloud = makeCloud();
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const message = makeAssistantMessage("local-message-1");

    await result.current.append({ parentId: null, message });
    await waitFor(() => expect(listeners.size).toBeGreaterThan(0));

    listeners.get("thread.runEnd")!({ threadId: "thread-1" });
    now.mockReturnValue(125);
    listeners.get("composer.send")!({
      threadId: "thread-1",
      chars: 5,
      attachments: 1,
      suggestion: true,
    });
    listeners.get("composer.send")!({
      threadId: "thread-1",
      messageId: "local-message-1",
      chars: 7,
      attachments: 0,
    });
    listeners.get("thread.runStart")!({ threadId: "thread-1" });
    now.mockReturnValue(150);
    listeners.get("thread.cancelRun")!({ threadId: "thread-1" });
    listeners.get("message.reload")!({
      threadId: "thread-1",
      messageId: "local-message-1",
    });
    listeners.get("message.branchSwitched")!({
      threadId: "thread-1",
      messageId: "local-message-1",
    });
    listeners.get("message.copied")!({
      threadId: "thread-1",
      messageId: "local-message-1",
    });
    listeners.get("composer.attachmentAdd")!({
      threadId: "thread-1",
      contentType: "image/png",
    });
    listeners.get("composer.attachmentAddError")!({
      threadId: "thread-1",
      reason: "adapter-error",
      message: "not sent",
      contentType: "application/pdf",
    });
    listeners.get("threads.selectionChanged")!({
      threadId: "thread-1",
      previousThreadId: "thread-0",
    });
    listeners.get("message.speak")!({
      threadId: "thread-1",
      messageId: "local-message-1",
    });
    listeners.get("thread.voiceStarted")!({ threadId: "thread-1" });
    listeners.get("message.error")!({
      threadId: "thread-1",
      messageId: "local-message-1",
      reason: "error",
    });
    listeners.get("message.error")!({
      threadId: "thread-1",
      messageId: "local-message-2",
      reason: "error",
    });
    threadState.isEmpty = true;
    threadState.suggestions = [{ prompt: "one" }, { prompt: "two" }];
    notify!();
    await waitFor(() =>
      expect(vi.mocked(cloud.events.track).mock.calls.length).toBeGreaterThan(
        12,
      ),
    );

    expect(
      vi.mocked(cloud.events.track).mock.calls.map(([event]) => event),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "message_sent",
          thread_id: "thread-1",
          value: 25,
          props: { chars: 5, attachments: 1 },
        }),
        expect.objectContaining({
          kind: "message_edited",
          thread_id: "thread-1",
          message_id: "remote-message-1",
          props: { chars: 7 },
        }),
        expect.objectContaining({ kind: "suggestion_clicked" }),
        expect.objectContaining({ kind: "run_stopped", value: 25 }),
        expect.objectContaining({ kind: "message_regenerated" }),
        expect.objectContaining({ kind: "branch_switched" }),
        expect.objectContaining({ kind: "message_copied" }),
        expect.objectContaining({
          kind: "attachment_added",
          props: { type: "image/png" },
        }),
        expect.objectContaining({
          kind: "attachment_failed",
          props: { type: "application/pdf" },
        }),
        expect.objectContaining({ kind: "thread_switched" }),
        expect.objectContaining({ kind: "speech_started" }),
        expect.objectContaining({ kind: "voice_started" }),
        expect.objectContaining({
          kind: "error_shown",
          props: { reason: "error" },
        }),
        expect.objectContaining({ kind: "suggestions_shown", value: 2 }),
      ]),
    );
    expect(
      vi
        .mocked(cloud.events.track)
        .mock.calls.map(([event]) => event)
        .filter((event) => event.kind === "error_shown"),
    ).toHaveLength(1);
  });

  it("drops engagement events resolved after the Cloud scope changes", async () => {
    const initialization = deferred<{
      remoteId: string;
      externalId: undefined;
    }>();
    const listeners = new Map<string, (payload: any) => void>();
    const client = mocks.makeClient(undefined);
    client.threadListItem.initialize = vi.fn(() => initialization.promise);
    client.on = vi.fn((selector, callback) => {
      listeners.set(selector.event, callback);
      return () => listeners.delete(selector.event);
    });
    mocks.aui = client;
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();
    const cloudRef = { current: firstCloud };
    const scopeRef = { current: "workspace-a" };
    renderHook(() =>
      useScopedAssistantCloudThreadHistoryAdapter(cloudRef, scopeRef),
    );
    await waitFor(() => expect(listeners.has("composer.send")).toBe(true));

    listeners.get("composer.send")!({
      threadId: "local-thread",
      chars: 5,
      attachments: 0,
    });
    await vi.waitFor(() =>
      expect(client.threadListItem.initialize).toHaveBeenCalledOnce(),
    );

    cloudRef.current = secondCloud;
    scopeRef.current = "workspace-b";
    initialization.resolve({ remoteId: "thread-a", externalId: undefined });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(firstCloud.events.track).not.toHaveBeenCalled();
    expect(secondCloud.events.track).not.toHaveBeenCalled();
  });

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
      limit: 200,
    });
  });

  it("resets default message mappings when the Cloud client changes", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();
    vi.mocked(firstCloud.threads.messages.create).mockResolvedValue({
      message_id: "remote-a",
    });
    vi.mocked(secondCloud.threads.messages.create).mockResolvedValue({
      message_id: "remote-b",
    });
    const cloudRef = { current: firstCloud };
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter(cloudRef),
    );
    const message = makeAssistantMessage("local-message-1");

    await result.current.append({ parentId: null, message });
    cloudRef.current = secondCloud;
    await result.current.update({ parentId: null, message });

    expect(secondCloud.threads.messages.create).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ parent_id: null }),
    );
    expect(secondCloud.threads.messages.update).not.toHaveBeenCalled();
  });

  it("preserves message mappings only within the same Cloud scope", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();
    vi.mocked(firstCloud.threads.messages.create).mockResolvedValue({
      message_id: "remote-a",
    });
    vi.mocked(secondCloud.threads.messages.create).mockResolvedValue({
      message_id: "remote-b",
    });
    const cloudRef = { current: firstCloud };
    const scopeRef = { current: "workspace-a" };
    const { result } = renderHook(() =>
      useScopedAssistantCloudThreadHistoryAdapter(cloudRef, scopeRef),
    );
    const message = makeAssistantMessage("local-message-1");

    await result.current.append({ parentId: null, message });
    cloudRef.current = secondCloud;
    await result.current.update({ parentId: null, message });

    expect(secondCloud.threads.messages.update).toHaveBeenCalledWith(
      "thread-1",
      "remote-a",
      expect.anything(),
    );

    scopeRef.current = "workspace-b";
    await result.current.update({ parentId: null, message });

    expect(secondCloud.threads.messages.create).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ parent_id: null }),
    );
    expect(secondCloud.threads.messages.update).toHaveBeenCalledOnce();
  });

  it("keeps a stale append from populating the replacement Cloud scope", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    let resolveFirst!: (value: { message_id: string }) => void;
    const firstCloud = makeCloud();
    vi.mocked(firstCloud.threads.messages.create).mockReturnValue(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const secondCloud = makeCloud();
    vi.mocked(secondCloud.threads.messages.create).mockResolvedValue({
      message_id: "remote-b",
    });
    const cloudRef = { current: firstCloud };
    const scopeRef = { current: "workspace-a" };
    const { result } = renderHook(() =>
      useScopedAssistantCloudThreadHistoryAdapter(cloudRef, scopeRef),
    );
    const message = makeAssistantMessage("local-message-1");

    const staleAppend = result.current.append({ parentId: null, message });
    await vi.waitFor(() => {
      expect(firstCloud.threads.messages.create).toHaveBeenCalledOnce();
    });

    cloudRef.current = secondCloud;
    scopeRef.current = "workspace-b";
    await result.current.append({ parentId: null, message });
    resolveFirst({ message_id: "remote-a" });
    await staleAppend;
    await result.current.update({ parentId: null, message });

    expect(secondCloud.threads.messages.update).toHaveBeenCalledWith(
      "thread-1",
      "remote-b",
      expect.anything(),
    );
  });

  it("rejects an append when its scope changes during thread initialization", async () => {
    const initialization = deferred<{
      remoteId: string;
      externalId: undefined;
    }>();
    const client = mocks.makeClient(undefined);
    client.threadListItem.initialize = vi.fn(() => initialization.promise);
    mocks.aui = client;
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();
    const cloudRef = { current: firstCloud };
    const scopeRef = { current: "workspace-a" };
    const { result } = renderHook(() =>
      useScopedAssistantCloudThreadHistoryAdapter(cloudRef, scopeRef),
    );

    const append = result.current.append({
      parentId: null,
      message: makeAssistantMessage("local-message-1"),
    });
    const rejected = expect(append).rejects.toThrow(
      "Cloud scope changed during the persistence operation",
    );
    await vi.waitFor(() =>
      expect(client.threadListItem.initialize).toHaveBeenCalledOnce(),
    );

    cloudRef.current = secondCloud;
    scopeRef.current = "workspace-b";
    initialization.resolve({ remoteId: "thread-a", externalId: undefined });

    await rejected;
    expect(firstCloud.threads.messages.create).not.toHaveBeenCalled();
    expect(secondCloud.threads.messages.create).not.toHaveBeenCalled();
  });

  it("rejects a formatted append when its scope changes during initialization", async () => {
    const initialization = deferred<{
      remoteId: string;
      externalId: undefined;
    }>();
    const client = mocks.makeClient(undefined);
    client.threadListItem.initialize = vi.fn(() => initialization.promise);
    mocks.aui = client;
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();
    const cloudRef = { current: firstCloud };
    const scopeRef = { current: "workspace-a" };
    const { result } = renderHook(() =>
      useScopedAssistantCloudThreadHistoryAdapter(cloudRef, scopeRef),
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

    const append = formatted.append({
      parentId: null,
      message: { id: "local-message-1" },
    });
    const rejected = expect(append).rejects.toThrow(
      "Cloud scope changed during the persistence operation",
    );
    await vi.waitFor(() =>
      expect(client.threadListItem.initialize).toHaveBeenCalledOnce(),
    );

    cloudRef.current = secondCloud;
    scopeRef.current = "workspace-b";
    initialization.resolve({ remoteId: "thread-a", externalId: undefined });

    await rejected;
    expect(firstCloud.threads.messages.create).not.toHaveBeenCalled();
    expect(secondCloud.threads.messages.create).not.toHaveBeenCalled();
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
      limit: 200,
    });

    mocks.aui = mocks.makeClient("thread-2");
    rerender();
    await formatted.load();
    expect(cloud.threads.messages.list).toHaveBeenCalledWith("thread-2", {
      format: "test",
      limit: 200,
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
      limit: 200,
    });

    mocks.aui = mocks.makeClient("thread-2");
    rerender();

    await result.current.load();
    expect(cloud.threads.messages.list).toHaveBeenCalledWith("thread-2", {
      format: "aui/v0",
      limit: 200,
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

  it("drops feedback resolved after the Cloud scope changes", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const created = deferred<{ message_id: string }>();
    const firstCloud = makeCloud();
    vi.mocked(firstCloud.threads.messages.create).mockReturnValue(
      created.promise,
    );
    const secondCloud = makeCloud();
    const cloudRef = { current: firstCloud };
    const scopeRef = { current: "workspace-a" };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() =>
      useScopedAssistantCloudThreadHistoryAdapter(cloudRef, scopeRef),
    );
    const message = makeAssistantMessage("local-message-1");
    const append = result.current.append({ parentId: null, message });
    await vi.waitFor(() =>
      expect(firstCloud.threads.messages.create).toHaveBeenCalledOnce(),
    );

    result.current.feedback.submit({ message, type: "positive" });
    cloudRef.current = secondCloud;
    scopeRef.current = "workspace-b";
    created.resolve({ message_id: "remote-a" });
    await append;
    await vi.waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        "[assistant-ui] Cloud feedback submission failed:",
        expect.objectContaining({
          message: "Cloud scope changed during the persistence operation",
        }),
      ),
    );

    expect(firstCloud.threads.messages.feedback).not.toHaveBeenCalled();
    expect(secondCloud.threads.messages.feedback).not.toHaveBeenCalled();
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

  it("reports persisted assistant telemetry dimensions", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud({
      release: "web-2026.09.08",
      environment: "production",
      tags: ["region:sg", "tier:paid"],
    });
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const message: ThreadAssistantMessage = {
      ...makeAssistantMessage("local-message-1"),
      status: { type: "incomplete", reason: "length" },
      metadata: {
        ...makeAssistantMessage("local-message-1").metadata,
        custom: {
          traceId: "AABBCCDDEEFF00112233445566778899",
          provider: "openai",
        },
        timing: {
          streamStartTime: 100,
          firstTokenTime: 55.6,
          totalChunks: 1,
          toolCallCount: 0,
        },
      },
    };

    await result.current.append({ parentId: null, message });

    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({
        thread_id: "thread-1",
        status: "incomplete",
        outcome_type: "length",
        message_id: "remote-message-1",
        first_token_ms: 56,
        trace_id: "aabbccddeeff00112233445566778899",
        provider: "openai",
        provider_type: "openai",
        release: "web-2026.09.08",
        environment: "production",
        tags: ["region:sg", "tier:paid"],
      }),
    );
  });

  it("reports the error message and code of a failed run", async () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const error = new Error("Rate limited");
    error.name = "AI_APICallError";
    const message: ThreadAssistantMessage = {
      ...makeAssistantMessage("local-message-1"),
      status: { type: "incomplete", reason: "error", error },
    };

    await result.current.append({ parentId: null, message });

    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        error: "Rate limited",
        error_code: "AI_APICallError",
      }),
    );
  });

  it.each([
    ["cancelled", "aborted"],
    ["length", "length"],
    ["content-filter", "content_filter"],
  ] as const)("maps incomplete %s to outcome %s", async (reason, outcome) => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const message: ThreadAssistantMessage = {
      ...makeAssistantMessage("local-message-1"),
      status: { type: "incomplete", reason },
    };

    await result.current.append({ parentId: null, message });

    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({ outcome_type: outcome }),
    );
  });

  it("omits a clean outcome and an unknown cloud message ID", () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
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

    formatted.reportTelemetry([
      {
        parentId: null,
        message: {
          id: "local-message-1",
          role: "assistant",
          content: [{ type: "text", text: "done" }],
          status: { type: "complete", reason: "stop" },
        },
      },
    ]);

    const report = vi.mocked(cloud.runs.report).mock.calls[0]![0]!;
    expect(report).not.toHaveProperty("outcome_type");
    expect(report).not.toHaveProperty("message_id");
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
          metadata: {
            traceId: "00112233445566778899AABBCCDDEEFF",
            provider: "anthropic",
          },
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
            finish_reason: "tool-calls",
          },
          {
            tool_calls: [
              expect.objectContaining({
                tool_call_id: "static-2",
                tool_source: "frontend",
              }),
            ],
            finish_reason: "tool-calls",
          },
        ],
        trace_id: "00112233445566778899aabbccddeeff",
        provider: "anthropic",
        provider_type: "anthropic",
      }),
    );
  });

  it("reports a single ai-sdk/v6 step with its tool calls", () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
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
              toolCallId: "search-1",
              input: { query: "test" },
              output: { result: "ok" },
            },
          ],
        },
      },
    ]);

    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({
        total_steps: 1,
        steps: [
          {
            tool_calls: [
              expect.objectContaining({
                tool_call_id: "search-1",
                tool_source: "frontend",
              }),
            ],
            finish_reason: "tool-calls",
          },
        ],
      }),
    );
  });

  it("reads the status of an ai-sdk/v6 run from its finish reason", () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
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
          parts: [{ type: "text", text: "cut" }],
          metadata: { finishReason: "length" },
        },
      },
    ]);

    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({ status: "incomplete", outcome_type: "length" }),
    );
  });

  it("reads the error and timing of an ai-sdk/v6 run from the thread message", () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
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
    const base = makeAssistantMessage("assistant-1");
    const message: ThreadAssistantMessage = {
      ...base,
      status: {
        type: "incomplete",
        reason: "error",
        error: Object.assign(new Error("model unavailable"), {
          code: "model_unavailable",
        }),
      },
      metadata: {
        ...base.metadata,
        timing: {
          streamStartTime: 100,
          firstTokenTime: 240,
          totalChunks: 3,
          toolCallCount: 0,
        },
      },
    };

    formatted.reportTelemetry(
      [
        {
          parentId: null,
          message: {
            id: "message-1",
            role: "assistant",
            parts: [{ type: "text", text: "partial" }],
          },
        },
      ],
      { message },
    );

    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        error: "model unavailable",
        error_code: "model_unavailable",
        first_token_ms: 240,
      }),
    );
  });

  it("reports a run that failed before any assistant message was stored", () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
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
    const message: ThreadAssistantMessage = {
      ...makeAssistantMessage("assistant-1"),
      content: [],
      status: {
        type: "incomplete",
        reason: "error",
        error: { code: "AI_APICallError", message: "upstream failed" },
      },
    };

    formatted.reportTelemetry([], { message, durationMs: 120 });

    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        error: "upstream failed",
        error_code: "AI_APICallError",
        duration_ms: 120,
      }),
    );
  });

  it("reports the model ID carried by aui/v0 step metadata", () => {
    mocks.aui = mocks.makeClient("thread-1");
    const cloud = makeCloud();
    const cloudRef = { current: cloud };
    const { result } = renderHook(() =>
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

    formatted.reportTelemetry([
      {
        parentId: null,
        message: {
          id: "message-1",
          role: "assistant",
          content: [{ type: "text", text: "done" }],
          status: { type: "complete" },
          metadata: {
            steps: [{ response: { modelId: "provider/model-1" } }],
          },
        },
      },
    ]);

    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({ model_id: "provider/model-1" }),
    );
  });

  it("reports the model ID carried by ai-sdk/v6 step metadata", () => {
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
          parts: [{ type: "text", text: "done" }],
          metadata: {
            steps: [{ response: { modelId: "provider/model-1" } }],
          },
        },
      },
    ]);

    expect(cloud.runs.report).toHaveBeenCalledWith(
      expect.objectContaining({ model_id: "provider/model-1" }),
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
