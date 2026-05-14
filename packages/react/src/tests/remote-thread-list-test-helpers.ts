import { vi } from "vitest";
import type { RemoteThreadListAdapter } from "../index";

export function makeAdapter(
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter {
  return {
    list: vi.fn(async () => ({ threads: [] })),
    initialize: vi.fn(async (threadId: string) => ({
      remoteId: threadId,
      externalId: threadId,
    })),
    rename: vi.fn(async () => {}),
    archive: vi.fn(async () => {}),
    unarchive: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    generateTitle: vi.fn(
      async () =>
        new ReadableStream({
          start(c) {
            c.close();
          },
        }) as never,
    ),
    fetch: vi.fn(async (id: string) => ({
      status: "regular" as const,
      remoteId: id,
      externalId: id,
      title: "Test",
    })),
    ...overrides,
  };
}
