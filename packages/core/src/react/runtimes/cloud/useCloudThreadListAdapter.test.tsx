// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { describe, expect, it, vi } from "vitest";
import { useCloudThreadListAdapter } from "./useCloudThreadListAdapter";

const makeThread = (id: string) => ({
  id,
  title: id,
  is_archived: false,
  external_id: null,
  metadata: null,
  last_message_at: new Date(0),
  created_at: new Date(0),
  updated_at: new Date(0),
  project_id: "project-1",
  workspace_id: "workspace-1",
});

describe("useCloudThreadListAdapter", () => {
  it("exposes full Cloud pages through the remote thread cursor", async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) =>
      makeThread(`thread-${index + 1}`),
    );
    const secondPage = [makeThread("thread-21")];
    const list = vi
      .fn()
      .mockResolvedValueOnce({ threads: firstPage })
      .mockResolvedValueOnce({ threads: secondPage });
    const cloud = { threads: { list } } as unknown as AssistantCloud;
    const { result } = renderHook(() => useCloudThreadListAdapter({ cloud }));

    const first = await result.current.list();
    expect(list).toHaveBeenNthCalledWith(1, { limit: 20 });
    expect(first.threads).toHaveLength(20);
    expect(first.nextCursor).toBe("thread-20");

    const second = await result.current.list({ after: first.nextCursor });
    expect(list).toHaveBeenNthCalledWith(2, {
      limit: 20,
      after: "thread-20",
    });
    expect(second.threads.map((thread) => thread.remoteId)).toEqual([
      "thread-21",
    ]);
    expect(second.nextCursor).toBeUndefined();
  });
});
