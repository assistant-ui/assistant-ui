// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { describe, expect, it, vi } from "vitest";
import { useAssistantCloudThreadHistoryAdapter } from "./AssistantCloudThreadHistoryAdapter";

const mocks = vi.hoisted(() => {
  const makeClient = (remoteId: string) =>
    ({
      threadListItem: {
        getState: () => ({ remoteId }),
      },
    }) as unknown as import("@assistant-ui/store").AssistantClient;

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
      },
    },
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
});
