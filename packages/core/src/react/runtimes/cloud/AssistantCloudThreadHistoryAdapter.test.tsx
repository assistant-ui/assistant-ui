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
    persistenceInstances: [] as Array<{
      cloud: unknown;
      load: ReturnType<typeof vi.fn>;
    }>,
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.assistantClient,
}));

vi.mock("assistant-cloud", async (importOriginal) => ({
  ...(await importOriginal<typeof import("assistant-cloud")>()),
  CloudMessagePersistence: class {
    readonly load = vi.fn().mockResolvedValue([]);

    constructor(readonly cloud: unknown) {
      mocks.persistenceInstances.push(this);
    }
  },
}));

const makeCloud = () => ({}) as AssistantCloud;

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

    expect(mocks.persistenceInstances).toHaveLength(1);
    expect(mocks.persistenceInstances[0]?.cloud).toBe(firstCloud);
    expect(mocks.persistenceInstances[0]?.load).toHaveBeenCalledTimes(2);

    cloudRef.current = secondCloud;
    await formatted.load();

    expect(mocks.persistenceInstances).toHaveLength(2);
    expect(mocks.persistenceInstances[1]?.cloud).toBe(secondCloud);
    expect(mocks.persistenceInstances[1]?.load).toHaveBeenCalledTimes(1);
    expect(mocks.persistenceInstances[1]?.load).toHaveBeenCalledWith(
      "thread-1",
      "test",
    );
  });
});
