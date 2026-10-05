import { act, waitFor } from "@testing-library/react";
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

// React 18's act holds renders until its callback settles, so a task that waits on a render starts inside act and settles outside it, where React can commit what the task waits on.
export async function settleOutsideAct<T>(task: () => Promise<T>): Promise<T> {
  let pending!: Promise<T>;
  await act(async () => {
    pending = task();
    pending.catch(() => {});
  });
  await waitFor(() => pending.then(settled, settled));
  await act(async () => {});
  return pending;
}

const settled = () => {};
