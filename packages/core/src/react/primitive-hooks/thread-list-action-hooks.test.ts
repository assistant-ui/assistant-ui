/** @vitest-environment jsdom */
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteThread: vi.fn<() => Promise<void>>(),
  archive: vi.fn<() => Promise<void>>(),
  unarchive: vi.fn<() => Promise<void>>(),
  switchTo: vi.fn<() => Promise<void>>(),
  switchToNewThread: vi.fn<() => Promise<void>>(),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({
    threadListItem: {
      delete: mocks.deleteThread,
      archive: mocks.archive,
      unarchive: mocks.unarchive,
      switchTo: mocks.switchTo,
    },
    threads: {
      switchToNewThread: mocks.switchToNewThread,
    },
  }),
}));

import { useThreadListItemArchive } from "./useThreadListItemArchive";
import { useThreadListItemDelete } from "./useThreadListItemDelete";
import { useThreadListItemTrigger } from "./useThreadListItemTrigger";
import { useThreadListItemUnarchive } from "./useThreadListItemUnarchive";
import { useThreadListNew } from "./useThreadListNew";

const useThreadListActions = () => ({
  delete: useThreadListItemDelete().delete,
  archive: useThreadListItemArchive().archive,
  unarchive: useThreadListItemUnarchive().unarchive,
  switch: useThreadListItemTrigger().switchTo,
  create: useThreadListNew().switchToNewThread,
});

const actionMocks = {
  delete: mocks.deleteThread,
  archive: mocks.archive,
  unarchive: mocks.unarchive,
  switch: mocks.switchTo,
  create: mocks.switchToNewThread,
};

describe("thread list action hooks", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each(Object.keys(actionMocks) as Array<keyof typeof actionMocks>)(
    "preserves the %s action promise",
    async (action) => {
      const error = new Error(`${action} unavailable`);
      const actionTask = Promise.reject(error);
      actionMocks[action].mockReturnValueOnce(actionTask);
      const { result } = renderHook(() => useThreadListActions());

      const task = result.current[action]();

      expect(task).toBe(actionTask);
      await expect(task).rejects.toBe(error);
    },
  );
});
