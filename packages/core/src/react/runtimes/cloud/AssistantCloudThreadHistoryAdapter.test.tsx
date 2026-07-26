// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { describe, expect, it, vi } from "vitest";
import { useAssistantCloudThreadHistoryAdapter } from "./AssistantCloudThreadHistoryAdapter";

const mocks = vi.hoisted(() => {
  const threadListItem = {
    getState: () => ({ remoteId: "thread-1" }),
  };

  return {
    assistantClient: {
      threadListItem: () => threadListItem,
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.assistantClient,
}));

const makeCloud = () =>
  ({
    threads: {
      messages: {
        list: vi.fn().mockResolvedValue({ messages: [] }),
      },
    },
  }) as unknown as AssistantCloud;

describe("useAssistantCloudThreadHistoryAdapter", () => {
  it("refreshes formatted persistence when the Cloud client changes", async () => {
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
});
