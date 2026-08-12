/** @vitest-environment jsdom */
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteThread: vi.fn<() => Promise<void>>(),
  archive: vi.fn<() => Promise<void>>(),
  unarchive: vi.fn<() => Promise<void>>(),
  switchTo: vi.fn<() => Promise<void>>(),
  switchToNewThread: vi.fn<() => Promise<void>>(),
  loadMore: vi.fn<() => Promise<void>>(),
  state: {
    threads: {
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
    },
  },
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
      loadMore: mocks.loadMore,
    },
  }),
  useAuiState: ((selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state)) as typeof import("@assistant-ui/store").useAuiState,
}));

import { useThreadListItemArchive } from "./useThreadListItemArchive";
import { useThreadListItemDelete } from "./useThreadListItemDelete";
import { useThreadListItemTrigger } from "./useThreadListItemTrigger";
import { useThreadListItemUnarchive } from "./useThreadListItemUnarchive";
import { useThreadListLoadMore } from "./useThreadListLoadMore";
import { useThreadListNew } from "./useThreadListNew";

const useThreadListActions = () => ({
  delete: useThreadListItemDelete().delete,
  archive: useThreadListItemArchive().archive,
  unarchive: useThreadListItemUnarchive().unarchive,
  switch: useThreadListItemTrigger().switchTo,
  create: useThreadListNew().switchToNewThread,
  "load more": useThreadListLoadMore().loadMore,
});

const actionMocks = {
  delete: mocks.deleteThread,
  archive: mocks.archive,
  unarchive: mocks.unarchive,
  switch: mocks.switchTo,
  create: mocks.switchToNewThread,
  "load more": mocks.loadMore,
};

describe("thread list action hooks", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    consoleError.mockRestore();
  });

  it.each(Object.keys(actionMocks) as Array<keyof typeof actionMocks>)(
    "reports rejected %s actions while preserving their promise",
    async (action) => {
      const error = new Error(`${action} unavailable`);
      const actionTask = Promise.reject(error);
      actionMocks[action].mockReturnValueOnce(actionTask);
      const { result } = renderHook(() => useThreadListActions());

      const task = result.current[action]();

      expect(task).toBe(actionTask);
      await expect(task).rejects.toBe(error);
      expect(consoleError).toHaveBeenCalledWith(
        `[assistant-ui] thread list ${action} failed:`,
        error,
      );
    },
  );

  it("reports synchronous action failures as rejected promises", async () => {
    const error = new Error("invalid thread");
    mocks.switchTo.mockImplementationOnce(() => {
      throw error;
    });
    const { result } = renderHook(() => useThreadListActions());

    const task = result.current.switch();

    await expect(task).rejects.toBe(error);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] thread list switch failed:",
      error,
    );
  });
});
