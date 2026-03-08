// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UseThreadsResult } from "../types";
import { useCloudChat } from "./useCloudChat";

function createThreads(
  cloud: unknown,
  threadId: string | null,
): UseThreadsResult {
  return {
    cloud: cloud as never,
    threads: [],
    isLoading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(true),
    rename: vi.fn().mockResolvedValue(true),
    archive: vi.fn().mockResolvedValue(true),
    unarchive: vi.fn().mockResolvedValue(true),
    threadId,
    selectThread: vi.fn(),
    generateTitle: vi.fn().mockResolvedValue(null),
  };
}

describe("useCloudChat thread switching", () => {
  it("resets visible chat messages immediately when switching to new chat (threadId -> null)", () => {
    const mockCloud = {
      threads: {
        create: vi.fn(),
        list: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    };

    const threads = createThreads(mockCloud, "thread-1");

    const { result, rerender } = renderHook(
      ({ tid }) => {
        threads.threadId = tid;
        return useCloudChat({ threads: threads });
      },
      { initialProps: { tid: "thread-1" as string | null } },
    );

    act(() => {
      result.current.setMessages([
        { id: "m1", role: "user", parts: [{ type: "text", text: "hello" }] },
      ]);
    });
    expect(result.current.messages).toHaveLength(1);

    rerender({ tid: null });

    expect(result.current.messages).toHaveLength(0);
  });
});
