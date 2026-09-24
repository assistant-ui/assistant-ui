// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadAssistantMessage } from "../../../types/message";
import { useAssistantCloudThreadHistoryAdapter } from "./AssistantCloudThreadHistoryAdapter";
import { auiV0Encode } from "./auiV0";

const mocks = vi.hoisted(() => ({
  aui: undefined as unknown as import("@assistant-ui/store").AssistantClient,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
}));

const makeClient = () => {
  const live = {
    source: "threads",
    getState: () => ({ id: "local-thread", remoteId: "cloud-thread" }),
    initialize: vi.fn().mockResolvedValue({ remoteId: "cloud-thread" }),
  };
  const keyed = {
    source: "threads",
    getState: () => ({ id: "local-thread", remoteId: "cloud-thread" }),
    initialize: vi.fn().mockResolvedValue({ remoteId: "cloud-thread" }),
  };
  const item = vi.fn(() => keyed);
  mocks.aui = {
    threadListItem: live,
    threads: {
      item,
      getState: () => ({
        mainThreadId: "local-thread",
        threadItems: [{ id: "local-thread", remoteId: "cloud-thread" }],
      }),
    },
    thread: { getState: () => ({ isEmpty: false, suggestions: [] }) },
    on: () => () => {},
    subscribe: () => () => {},
  } as unknown as import("@assistant-ui/store").AssistantClient;
  return { live, keyed, item };
};

const makeCloud = (
  telemetry: { enabled?: boolean; messages?: boolean } = {},
) => {
  const list = vi.fn().mockResolvedValue({ messages: [] });
  const create = vi.fn().mockImplementation(async () => ({
    message_id: `cloud-${create.mock.calls.length}`,
  }));
  const feedback = vi.fn().mockResolvedValue({
    feedback_id: "feedback-1",
    type: "positive",
  });
  const report = vi.fn().mockResolvedValue(undefined);
  const cloud = {
    telemetry: { enabled: true, ...telemetry },
    threads: { messages: { list, create, feedback } },
    runs: { report },
    events: { track: vi.fn() },
  } as unknown as AssistantCloud;
  return { cloud, list, create, feedback, report };
};

const message = (id: string): ThreadAssistantMessage => ({
  id,
  role: "assistant",
  content: [{ type: "text", text: id }],
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

const row = (
  externalId: string,
  cloudId: string,
  content = auiV0Encode(message(externalId)),
) => ({
  id: cloudId,
  external_id: externalId,
  parent_id: null,
  height: 0,
  created_at: new Date(0),
  updated_at: new Date(0),
  format: "aui/v0",
  content,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Assistant Cloud backend transcript copy", () => {
  it("copies changed messages oldest first with external parents and no run report", async () => {
    const { keyed, item } = makeClient();
    const { cloud, list, create, report } = makeCloud();
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const branch = [message("a"), message("b"), message("c")];

    await result.current.unstable_copy(branch, ["b", "c"]);

    expect(item).toHaveBeenCalledWith({ id: "local-thread" });
    expect(keyed.initialize).toHaveBeenCalledOnce();
    expect(list).toHaveBeenCalledWith("cloud-thread", { limit: 200 });
    expect(create.mock.calls.map(([, body]) => body)).toMatchObject([
      { external_id: "a", parent_id: null },
      { external_id: "b", parent_external_id: "a", parent_id: null },
      { external_id: "c", parent_external_id: "b", parent_id: null },
    ]);
    expect(create.mock.calls[0]![1]).not.toHaveProperty("parent_external_id");
    expect(report).not.toHaveBeenCalled();

    await result.current.unstable_copy(branch, ["c"]);
    expect(list).toHaveBeenCalledOnce();
    expect(create.mock.calls.map(([, body]) => body.external_id)).toEqual([
      "a",
      "b",
      "c",
      "c",
    ]);
  });

  it("backfills missing ancestors, skips stored messages, and maps feedback", async () => {
    makeClient();
    const { cloud, list, create, feedback } = makeCloud();
    list.mockResolvedValueOnce({ messages: [row("a", "stored-a")] });
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const branch = [message("a"), message("b"), message("c")];

    await result.current.unstable_copy(branch, ["c"]);

    expect(create.mock.calls.map(([, body]) => body.external_id)).toEqual([
      "b",
      "c",
    ]);
    expect(create.mock.calls[0]![1].parent_external_id).toBe("a");
    result.current.feedback.submit({
      message: branch[2]!,
      type: "positive",
    });
    await waitFor(() => expect(feedback).toHaveBeenCalledOnce());
    expect(feedback).toHaveBeenCalledWith("cloud-thread", "cloud-2", {
      type: "positive",
    });
  });

  it("merges stored interaction logs into a changed tool call without duplicates", async () => {
    makeClient();
    const { cloud, list, create } = makeCloud();
    const first = {
      type: "action" as const,
      occurredAt: 1,
      payload: { choice: "a" },
    };
    const second = {
      type: "action" as const,
      occurredAt: 2,
      payload: { choice: "b" },
    };
    const toolMessage = (entries: (typeof first)[]) => ({
      ...message("a"),
      content: [
        {
          type: "tool-call" as const,
          toolCallId: "call-1",
          toolName: "choose",
          args: {},
          argsText: "{}",
          unstable_interactions: { entries },
        },
      ],
    });
    list.mockResolvedValueOnce({
      messages: [row("a", "stored-a", auiV0Encode(toolMessage([first])))],
    });
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );

    await result.current.unstable_copy([toolMessage([first, second])], ["a"]);

    expect(create).toHaveBeenCalledOnce();
    expect(
      create.mock.calls[0]![1].content.content[0].unstable_interactions,
    ).toEqual({ entries: [first, second] });
  });

  it.each([{ enabled: false }, { messages: false }])(
    "makes no request when telemetry is disabled by %o",
    async (telemetry) => {
      const { keyed } = makeClient();
      const { cloud, list, create } = makeCloud(telemetry);
      const { result } = renderHook(() =>
        useAssistantCloudThreadHistoryAdapter({ current: cloud }),
      );

      await result.current.unstable_copy([message("a")], ["a"]);

      expect(keyed.initialize).not.toHaveBeenCalled();
      expect(list).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );

  it("stops on a failed write and retries from that message", async () => {
    makeClient();
    const { cloud, create } = makeCloud();
    create
      .mockResolvedValueOnce({ message_id: "cloud-a" })
      .mockRejectedValueOnce(new Error("write failed"));
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const branch = [message("a"), message("b"), message("c")];

    await expect(result.current.unstable_copy(branch, ["c"])).rejects.toThrow(
      "write failed",
    );
    await result.current.unstable_copy(branch, ["c"]);

    expect(create.mock.calls.map(([, body]) => body.external_id)).toEqual([
      "a",
      "b",
      "b",
      "c",
    ]);
  });

  it("pages the stored inventory with the last cloud message id", async () => {
    makeClient();
    const { cloud, list, create } = makeCloud();
    list
      .mockResolvedValueOnce({
        messages: Array.from({ length: 200 }, (_, index) =>
          row(`stored-${index}`, `cloud-${index}`),
        ),
      })
      .mockResolvedValueOnce({ messages: [row("a", "cloud-a")] });
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );

    await result.current.unstable_copy([message("a"), message("b")], ["b"]);

    expect(list.mock.calls).toEqual([
      ["cloud-thread", { limit: 200 }],
      ["cloud-thread", { limit: 200, after: "cloud-199" }],
    ]);
    expect(create.mock.calls.map(([, body]) => body.external_id)).toEqual([
      "b",
    ]);
  });

  it("leaves ids longer than 255 characters out of the branch", async () => {
    makeClient();
    const { cloud, create } = makeCloud();
    const { result } = renderHook(() =>
      useAssistantCloudThreadHistoryAdapter({ current: cloud }),
    );
    const longId = "x".repeat(256);

    await result.current.unstable_copy(
      [message("a"), message(longId), message("b")],
      ["b"],
    );

    expect(create.mock.calls.map(([, body]) => body.external_id)).toEqual([
      "a",
      "b",
    ]);
    expect(create.mock.calls[1]![1].parent_external_id).toBe("a");
  });
});
