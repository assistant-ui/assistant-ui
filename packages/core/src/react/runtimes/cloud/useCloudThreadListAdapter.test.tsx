// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { describe, expect, it, vi } from "vitest";
import { useCloudThreadListAdapter } from "./useCloudThreadListAdapter";

const makeThread = (id: string, is_archived: boolean) => ({
  title: id,
  last_message_at: new Date("2026-01-01T00:00:00.000Z"),
  metadata: { source: id },
  external_id: `${id}-external`,
  id,
  project_id: "project",
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-01-01T00:00:00.000Z"),
  workspace_id: "workspace",
  is_archived,
});

describe("useCloudThreadListAdapter", () => {
  it("loads regular and archived Cloud threads", async () => {
    const active = makeThread("active", false);
    const archived = makeThread("archived", true);
    const list = vi.fn(async (query?: { is_archived?: boolean }) => ({
      threads: query?.is_archived ? [archived] : [active],
    }));
    const cloud = {
      threads: { list },
    } as unknown as AssistantCloud;

    const { result } = renderHook(() => useCloudThreadListAdapter({ cloud }));

    const response = await result.current.list();

    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[0]).toEqual([]);
    expect(list).toHaveBeenNthCalledWith(2, { is_archived: true });
    expect(response.threads).toEqual([
      {
        status: "regular",
        remoteId: "active",
        title: "active",
        lastMessageAt: active.last_message_at,
        externalId: "active-external",
        custom: { source: "active" },
      },
      {
        status: "archived",
        remoteId: "archived",
        title: "archived",
        lastMessageAt: archived.last_message_at,
        externalId: "archived-external",
        custom: { source: "archived" },
      },
    ]);
  });
});
