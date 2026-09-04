// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useThreads } from "./useThreads";

const mocks = vi.hoisted(() => ({
  generateThreadTitle: vi.fn(),
}));

vi.mock("./generateThreadTitle", async (importOriginal) => ({
  ...(await importOriginal()),
  generateThreadTitle: mocks.generateThreadTitle,
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createThreadListResponse(title: string, id = "thread-1") {
  return {
    threads: [
      {
        id,
        title,
        is_archived: false,
        external_id: null,
        last_message_at: new Date("2026-01-01T00:00:00.000Z"),
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
  };
}

function createCloud(id: string) {
  return {
    threads: {
      list: vi.fn().mockResolvedValue(createThreadListResponse(id, id)),
      get: vi.fn().mockImplementation(async (threadId: string) => {
        return createThreadListResponse(threadId, threadId).threads[0]!;
      }),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("useThreads", () => {
  afterEach(() => {
    mocks.generateThreadTitle.mockReset();
    vi.restoreAllMocks();
  });

  it("clears a selected thread archived outside the current client", async () => {
    const activeThread = createThreadListResponse("Active", "thread-1")
      .threads[0]!;
    const archivedThread = { ...activeThread, is_archived: true };
    let isArchived = false;
    const get = vi.fn(async () => archivedThread);
    const cloud = {
      threads: {
        list: vi.fn(async () => ({
          threads: isArchived ? [] : [activeThread],
        })),
        get,
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    } as never;
    const { result } = renderHook(() =>
      useThreads({ cloud, includeArchived: false, enabled: false }),
    );

    await act(async () => {
      await result.current.refresh();
    });
    act(() => result.current.selectThread("thread-1"));

    isArchived = true;
    await act(async () => {
      await result.current.refresh();
    });

    expect(get).toHaveBeenCalledWith("thread-1");
    expect(result.current.threads).toEqual([]);
    expect(result.current.threadId).toBeNull();
  });

  it("preserves a remotely archived selection made visible during refresh", async () => {
    const activeThread = createThreadListResponse("Active", "thread-1")
      .threads[0]!;
    const archivedThread = { ...activeThread, is_archived: true };
    const verification = createDeferred<typeof archivedThread>();
    const list = vi
      .fn()
      .mockResolvedValueOnce({ threads: [activeThread] })
      .mockResolvedValueOnce({ threads: [] });
    const cloud = {
      threads: {
        list,
        get: vi.fn().mockReturnValueOnce(verification.promise),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    };
    const { result, rerender } = renderHook(
      ({ includeArchived }) =>
        useThreads({
          cloud: cloud as never,
          includeArchived,
          enabled: false,
        }),
      { initialProps: { includeArchived: false } },
    );

    await act(async () => {
      await result.current.refresh();
    });
    act(() => result.current.selectThread("thread-1"));

    let refreshPromise!: Promise<boolean>;
    act(() => {
      refreshPromise = result.current.refresh();
    });
    await waitFor(() => {
      expect(result.current.threads).toEqual([]);
      expect(cloud.threads.get).toHaveBeenCalledWith("thread-1");
    });

    rerender({ includeArchived: true });
    await act(async () => {
      verification.resolve(archivedThread);
      await refreshPromise;
    });

    expect(result.current.threadId).toBe("thread-1");
  });

  it("returns fallback and exposes error when an action fails", async () => {
    const cloud = {
      threads: {
        list: vi.fn().mockResolvedValue({ threads: [] }),
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn().mockRejectedValue(new Error("rename failed")),
      },
    } as never;

    const { result } = renderHook(() => useThreads({ cloud }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const ok = await result.current.rename("thread-1", "New title");

    expect(ok).toBe(false);
    await waitFor(() => {
      expect(result.current.error?.message).toBe("rename failed");
    });
  });

  it("keeps a manual rename made during title generation", async () => {
    const generatedTitle = createDeferred<string>();
    const cloud = createCloud("cloud-1");
    const update = cloud.threads.update;
    mocks.generateThreadTitle.mockImplementationOnce(
      async (currentCloud, threadId) => {
        const title = await generatedTitle.promise;
        await currentCloud.threads.update(threadId, { title });
        return title;
      },
    );
    mocks.generateThreadTitle.mockImplementationOnce(
      async (currentCloud, threadId) => {
        await currentCloud.threads.update(threadId, {
          title: "Regenerated title",
        });
        return "Regenerated title";
      },
    );
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    let generation!: Promise<string | null>;
    act(() => {
      generation = result.current.generateTitle("thread-1");
    });
    await waitFor(() => {
      expect(mocks.generateThreadTitle).toHaveBeenCalledOnce();
    });

    let rename!: Promise<boolean>;
    act(() => {
      rename = result.current.rename("thread-1", "Manual title");
    });
    expect(update).toHaveBeenCalledWith("thread-1", { title: "Manual title" });

    await act(async () => {
      await rename;
    });

    await act(async () => {
      generatedTitle.resolve("Generated title");
      await generation;
    });

    expect(update).toHaveBeenNthCalledWith(1, "thread-1", {
      title: "Manual title",
    });
    expect(update).toHaveBeenNthCalledWith(2, "thread-1", {
      title: "Generated title",
    });
    expect(update).toHaveBeenNthCalledWith(3, "thread-1", {
      title: "Manual title",
    });

    let repeatedTitle: string | null = null;
    await act(async () => {
      repeatedTitle = await result.current.generateTitle("thread-1");
    });
    expect(repeatedTitle).toBe("Regenerated title");
    expect(mocks.generateThreadTitle).toHaveBeenCalledTimes(2);
  });

  it("skips later automatic generation after a direct manual rename", async () => {
    const cloud = createCloud("cloud-1");
    mocks.generateThreadTitle.mockResolvedValue("Regenerated title");
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    await act(async () => {
      await result.current.rename("thread-1", "Manual title");
    });

    let automaticTitle: string | null = null;
    await act(async () => {
      automaticTitle = await result.current.generateTitle("thread-1", {
        automatic: true,
      });
    });
    expect(automaticTitle).toBe("Manual title");
    expect(mocks.generateThreadTitle).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.generateTitle("thread-1");
    });
    expect(mocks.generateThreadTitle).toHaveBeenCalledOnce();
  });

  it("waits for a newer pending rename instead of returning an older title", async () => {
    const renameUpdate = createDeferred<void>();
    const cloud = createCloud("cloud-1");
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    await act(async () => {
      await result.current.rename("thread-1", "Old manual title");
    });
    cloud.threads.update.mockReturnValueOnce(renameUpdate.promise);

    let rename!: Promise<boolean>;
    let generation!: Promise<string | null>;
    let generationSettled = false;
    act(() => {
      rename = result.current.rename("thread-1", "New manual title");
      generation = result.current.generateTitle("thread-1", {
        automatic: true,
      });
      void generation.then(() => {
        generationSettled = true;
      });
    });

    await Promise.resolve();
    expect(generationSettled).toBe(false);
    expect(mocks.generateThreadTitle).not.toHaveBeenCalled();

    let generatedTitle: string | null = null;
    await act(async () => {
      renameUpdate.resolve();
      await rename;
      generatedTitle = await generation;
    });

    expect(generatedTitle).toBe("New manual title");
    expect(mocks.generateThreadTitle).not.toHaveBeenCalled();
  });

  it("does not start automatic generation while a rename is pending", async () => {
    const renameUpdate = createDeferred<void>();
    const cloud = createCloud("cloud-1");
    cloud.threads.update.mockReturnValueOnce(renameUpdate.promise);
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    let rename!: Promise<boolean>;
    let generation!: Promise<string | null>;
    act(() => {
      rename = result.current.rename("thread-1", "Manual title");
      generation = result.current.generateTitle("thread-1", {
        automatic: true,
      });
    });

    expect(mocks.generateThreadTitle).not.toHaveBeenCalled();

    let generatedTitle: string | null = null;
    await act(async () => {
      renameUpdate.resolve();
      await rename;
      generatedTitle = await generation;
    });

    expect(generatedTitle).toBe("Manual title");
    expect(cloud.threads.update).toHaveBeenCalledOnce();
    expect(mocks.generateThreadTitle).not.toHaveBeenCalled();
  });

  it("starts explicit generation while a rename is pending", async () => {
    const renameUpdate = createDeferred<void>();
    const cloud = createCloud("cloud-1");
    cloud.threads.update.mockReturnValueOnce(renameUpdate.promise);
    mocks.generateThreadTitle
      .mockResolvedValueOnce("Regenerated title")
      .mockResolvedValueOnce("Automatic title");
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    let rename!: Promise<boolean>;
    let generation!: Promise<string | null>;
    act(() => {
      rename = result.current.rename("thread-1", "Manual title");
      generation = result.current.generateTitle("thread-1");
    });

    await expect(generation).resolves.toBe("Regenerated title");
    expect(mocks.generateThreadTitle).toHaveBeenCalledOnce();

    await act(async () => {
      renameUpdate.resolve();
      await rename;
    });

    await expect(
      result.current.generateTitle("thread-1", { automatic: true }),
    ).resolves.toBe("Automatic title");
    expect(mocks.generateThreadTitle).toHaveBeenCalledTimes(2);
  });

  it("keeps an earlier manual title when a newer rename fails", async () => {
    const failingRename = createDeferred<void>();
    const cloud = createCloud("cloud-1");
    mocks.generateThreadTitle.mockResolvedValue("Generated title");
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    await act(async () => {
      await result.current.rename("thread-1", "First manual title");
    });
    cloud.threads.update.mockReturnValueOnce(failingRename.promise);

    let rename!: Promise<boolean>;
    let generation!: Promise<string | null>;
    act(() => {
      rename = result.current.rename("thread-1", "Second manual title");
      generation = result.current.generateTitle("thread-1", {
        automatic: true,
      });
    });

    let generatedTitle: string | null = null;
    await act(async () => {
      failingRename.reject(new Error("rename failed"));
      expect(await rename).toBe(false);
      generatedTitle = await generation;
    });

    expect(generatedTitle).toBe("First manual title");
    expect(mocks.generateThreadTitle).not.toHaveBeenCalled();
  });

  it("drops retained manual titles when the cloud changes", async () => {
    const cloudA = createCloud("cloud-1");
    const cloudB = createCloud("cloud-2");
    mocks.generateThreadTitle.mockResolvedValue("Generated title");
    const { result, rerender } = renderHook(
      ({ cloud }) => useThreads({ cloud: cloud as never, enabled: false }),
      { initialProps: { cloud: cloudA } },
    );

    await act(async () => {
      await result.current.rename("thread-1", "Manual title");
    });

    rerender({ cloud: cloudB });

    let automaticTitle: string | null = null;
    await act(async () => {
      automaticTitle = await result.current.generateTitle("thread-1", {
        automatic: true,
      });
    });

    expect(automaticTitle).toBe("Generated title");
    expect(mocks.generateThreadTitle).toHaveBeenCalledOnce();
  });

  it("does not report a previous scope's manual title after a failed rename", async () => {
    const failingRename = createDeferred<void>();
    const cloudA = createCloud("cloud-1");
    const cloudB = createCloud("cloud-2");
    mocks.generateThreadTitle.mockResolvedValue("Generated title");
    const { result, rerender } = renderHook(
      ({ cloud }) => useThreads({ cloud: cloud as never, enabled: false }),
      { initialProps: { cloud: cloudA } },
    );

    await act(async () => {
      await result.current.rename("thread-1", "First manual title");
    });
    cloudA.threads.update.mockReturnValueOnce(failingRename.promise);

    let rename!: Promise<boolean>;
    let generation!: Promise<string | null>;
    act(() => {
      rename = result.current.rename("thread-1", "Second manual title");
      generation = result.current.generateTitle("thread-1", {
        automatic: true,
      });
    });

    rerender({ cloud: cloudB });

    let generatedTitle: string | null = null;
    await act(async () => {
      failingRename.reject(new Error("rename failed"));
      await rename;
      generatedTitle = await generation;
    });

    expect(generatedTitle).toBe("Generated title");
  });

  it("loads threads when Strict Mode replays effects", async () => {
    const cloud = {
      threads: {
        list: vi
          .fn()
          .mockResolvedValue(createThreadListResponse("Customer support")),
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    } as never;

    const { result } = renderHook(() => useThreads({ cloud }), {
      reactStrictMode: true,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.threads).toMatchObject([
      { id: "thread-1", title: "Customer support" },
    ]);
  });

  it("stays idle until automatic thread fetching is enabled", async () => {
    const deferred = createDeferred<{ threads: never[] }>();
    const list = vi.fn().mockReturnValue(deferred.promise);
    const cloud = {
      threads: {
        list,
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    } as never;

    const { result, rerender } = renderHook(
      ({ enabled }) => useThreads({ cloud, enabled }),
      { initialProps: { enabled: false } },
    );

    expect(result.current.isLoading).toBe(false);
    expect(list).not.toHaveBeenCalled();

    rerender({ enabled: true });

    expect(result.current.isLoading).toBe(true);
    expect(list).toHaveBeenCalledOnce();

    deferred.resolve({ threads: [] });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("settles loading when automatic fetching becomes disabled", async () => {
    const deferred =
      createDeferred<ReturnType<typeof createThreadListResponse>>();
    const list = vi.fn().mockReturnValue(deferred.promise);
    const cloud = {
      threads: {
        list,
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    } as never;

    const { result, rerender } = renderHook(
      ({ enabled }) => useThreads({ cloud, enabled }),
      { initialProps: { enabled: true } },
    );

    expect(result.current.isLoading).toBe(true);
    expect(list).toHaveBeenCalledOnce();

    rerender({ enabled: false });

    expect(result.current.isLoading).toBe(false);
    expect(list).toHaveBeenCalledOnce();
  });

  it("loads every active and archived page when requested", async () => {
    const activePage = Array.from(
      { length: 20 },
      (_, index) =>
        createThreadListResponse(`Active ${index}`, `active-${index}`)
          .threads[0]!,
    );
    const archivedPage = Array.from({ length: 20 }, (_, index) => ({
      ...createThreadListResponse(`Archived ${index}`, `archived-${index}`)
        .threads[0]!,
      is_archived: true,
    }));
    const lastArchived = {
      ...createThreadListResponse("Newest archived", "archived-20").threads[0]!,
      is_archived: true,
      last_message_at: new Date("2026-02-01T00:00:00.000Z"),
    };
    const list = vi.fn(
      async (query?: { is_archived?: boolean; after?: string }) => {
        if (query?.is_archived) {
          return { threads: query.after ? [lastArchived] : archivedPage };
        }
        return { threads: query?.after ? [] : activePage };
      },
    );
    const cloud = {
      threads: {
        list,
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    } as never;
    const { result } = renderHook(() =>
      useThreads({ cloud, includeArchived: true, enabled: false }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(list).toHaveBeenCalledWith({
      is_archived: false,
      limit: 20,
    });
    expect(list).toHaveBeenCalledWith({
      is_archived: true,
      limit: 20,
    });
    expect(list).toHaveBeenCalledWith({
      is_archived: false,
      limit: 20,
      after: "active-19",
    });
    expect(list).toHaveBeenCalledWith({
      is_archived: true,
      limit: 20,
      after: "archived-19",
    });
    expect(result.current.threads).toHaveLength(41);
    expect(result.current.threads[0]).toMatchObject({
      id: "archived-20",
      status: "archived",
    });
  });

  it("stops when thread pagination does not advance", async () => {
    const firstPage = Array.from(
      { length: 20 },
      (_, index) =>
        createThreadListResponse(`Thread ${index}`, `thread-${index}`)
          .threads[0]!,
    );
    const list = vi.fn().mockResolvedValue({ threads: firstPage });
    const cloud = {
      threads: {
        list,
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    } as never;
    const { result } = renderHook(() => useThreads({ cloud, enabled: false }));

    await act(async () => {
      expect(await result.current.refresh()).toBe(true);
    });

    expect(list).toHaveBeenNthCalledWith(1, {
      is_archived: false,
      limit: 20,
    });
    expect(list).toHaveBeenNthCalledWith(2, {
      is_archived: false,
      limit: 20,
      after: "thread-19",
    });
    expect(list).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.threads).toHaveLength(20);
  });

  it("deduplicates threads returned by both archive filters", async () => {
    const active = createThreadListResponse("Active", "shared").threads[0]!;
    const archived = {
      ...active,
      title: "Archived",
      is_archived: true,
    };
    const list = vi.fn(async (query?: { is_archived?: boolean }) => ({
      threads: query?.is_archived ? [archived] : [active],
    }));
    const cloud = {
      threads: {
        list,
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    } as never;
    const { result } = renderHook(() =>
      useThreads({ cloud, includeArchived: true, enabled: false }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.threads).toHaveLength(1);
    expect(result.current.threads).toMatchObject([
      { id: "shared", title: "Archived", status: "archived" },
    ]);
  });

  it("keeps the previous complete list when an archived refresh fails", async () => {
    const active = createThreadListResponse("Active", "active").threads[0]!;
    const archived = {
      ...createThreadListResponse("Archived", "archived").threads[0]!,
      is_archived: true,
    };
    const list = vi
      .fn()
      .mockResolvedValueOnce({ threads: [active] })
      .mockResolvedValueOnce({ threads: [archived] })
      .mockResolvedValueOnce({ threads: [{ ...active, title: "Updated" }] })
      .mockRejectedValueOnce(new Error("archived refresh failed"));
    const cloud = {
      threads: {
        list,
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    } as never;
    const { result } = renderHook(() =>
      useThreads({ cloud, includeArchived: true, enabled: false }),
    );

    await act(async () => {
      expect(await result.current.refresh()).toBe(true);
    });
    const completeThreads = result.current.threads;

    await act(async () => {
      expect(await result.current.refresh()).toBe(false);
    });

    expect(result.current.error?.message).toBe("archived refresh failed");
    expect(result.current.threads).toBe(completeThreads);
  });

  it("keeps the latest refresh when requests resolve out of order", async () => {
    const first = createDeferred<ReturnType<typeof createThreadListResponse>>();
    const second =
      createDeferred<ReturnType<typeof createThreadListResponse>>();
    const cloud = {
      threads: {
        list: vi
          .fn()
          .mockReturnValueOnce(first.promise)
          .mockReturnValueOnce(second.promise),
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    } as never;

    const { result } = renderHook(() => useThreads({ cloud, enabled: false }));

    let firstRefresh!: Promise<boolean>;
    let secondRefresh!: Promise<boolean>;
    act(() => {
      firstRefresh = result.current.refresh();
      secondRefresh = result.current.refresh();
    });

    await act(async () => {
      second.resolve(createThreadListResponse("Newest"));
      await secondRefresh;
    });
    expect(result.current.threads[0]?.title).toBe("Newest");

    await act(async () => {
      first.resolve(createThreadListResponse("Stale"));
      await firstRefresh;
    });
    expect(result.current.threads[0]?.title).toBe("Newest");
  });

  it("clears a selected thread after refresh confirms it was deleted", async () => {
    const cloud = createCloud("thread-1");
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    await act(async () => {
      await result.current.refresh();
    });
    cloud.threads.list.mockResolvedValueOnce({ threads: [] });
    cloud.threads.get.mockRejectedValueOnce({ status: 404 });

    await act(async () => {
      result.current.selectThread("thread-1");
      await result.current.refresh();
    });

    expect(result.current.threads).toEqual([]);
    expect(result.current.threadId).toBeNull();
  });

  it("does not verify a selection that has never appeared in a list", async () => {
    const cloud = createCloud("thread-1");
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );
    cloud.threads.list.mockResolvedValueOnce({ threads: [] });
    cloud.threads.get.mockRejectedValueOnce({ status: 404 });

    await act(async () => {
      result.current.selectThread("thread-1");
      await result.current.refresh();
    });

    expect(cloud.threads.get).not.toHaveBeenCalled();
    expect(result.current.threadId).toBe("thread-1");
  });

  it("preserves a selected thread that is omitted from the list page", async () => {
    const cloud = createCloud("thread-1");
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    await act(async () => {
      await result.current.refresh();
    });
    act(() => {
      result.current.selectThread("thread-1");
    });
    cloud.threads.list.mockResolvedValueOnce({ threads: [] });

    await act(async () => {
      await result.current.refresh();
    });

    expect(cloud.threads.get).toHaveBeenCalledWith("thread-1");
    expect(result.current.threadId).toBe("thread-1");
  });

  it("commits refreshed threads when selection verification fails", async () => {
    const cloud = createCloud("thread-1");
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    await act(async () => {
      await result.current.refresh();
    });
    act(() => {
      result.current.selectThread("thread-1");
    });
    cloud.threads.list.mockResolvedValueOnce(
      createThreadListResponse("Updated", "thread-2"),
    );
    cloud.threads.get.mockRejectedValueOnce(
      Object.assign(new Error("verification unavailable"), { status: 503 }),
    );

    await act(async () => {
      expect(await result.current.refresh()).toBe(true);
    });

    expect(result.current.threads).toMatchObject([
      { id: "thread-2", title: "Updated" },
    ]);
    expect(result.current.threadId).toBe("thread-1");
    expect(result.current.error).toBeNull();
  });

  it("finishes loading before selection verification settles", async () => {
    const cloud = createCloud("thread-1");
    const verification =
      createDeferred<
        ReturnType<typeof createThreadListResponse>["threads"][number]
      >();
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    await act(async () => {
      await result.current.refresh();
    });
    cloud.threads.update.mockRejectedValueOnce(new Error("rename failed"));
    await act(async () => {
      expect(await result.current.rename("thread-1", "New title")).toBe(false);
    });
    expect(result.current.error?.message).toBe("rename failed");

    act(() => {
      result.current.selectThread("thread-1");
    });
    cloud.threads.list.mockResolvedValueOnce(
      createThreadListResponse("Updated", "thread-2"),
    );
    cloud.threads.get.mockReturnValueOnce(verification.promise);
    let refreshSettled = false;
    let refreshPromise!: Promise<boolean>;
    act(() => {
      refreshPromise = result.current.refresh();
      void refreshPromise.then(() => {
        refreshSettled = true;
      });
    });

    await waitFor(() => {
      expect(result.current.threads).toMatchObject([
        { id: "thread-2", title: "Updated" },
      ]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
    expect(refreshSettled).toBe(false);

    await act(async () => {
      verification.resolve(
        createThreadListResponse("Selected", "thread-1").threads[0]!,
      );
      expect(await refreshPromise).toBe(true);
    });
  });

  it("preserves a newer selection while a refresh is pending", async () => {
    const cloud = createCloud("thread-1");
    const refresh =
      createDeferred<ReturnType<typeof createThreadListResponse>>();
    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    await act(async () => {
      await result.current.refresh();
    });
    act(() => {
      result.current.selectThread("thread-1");
    });
    cloud.threads.list.mockReturnValueOnce(refresh.promise);
    cloud.threads.get.mockRejectedValueOnce({ status: 404 });
    let refreshPromise!: Promise<boolean>;
    act(() => {
      refreshPromise = result.current.refresh();
    });
    act(() => {
      result.current.selectThread("thread-2");
    });

    await act(async () => {
      refresh.resolve({ threads: [] });
      await refreshPromise;
    });

    expect(result.current.threadId).toBe("thread-2");
  });

  it("clears the selected thread when the cloud changes", async () => {
    const cloudA = createCloud("thread-a");
    const cloudB = createCloud("thread-b");

    const { result, rerender } = renderHook(
      ({ cloud }) => useThreads({ cloud: cloud as never }),
      { initialProps: { cloud: cloudA } },
    );

    await waitFor(() => {
      expect(result.current.threads[0]?.id).toBe("thread-a");
    });
    const selectThreadA = result.current.selectThread;
    act(() => {
      selectThreadA("thread-a");
    });

    rerender({ cloud: cloudB });

    expect(result.current.threadId).toBeNull();
    await waitFor(() => {
      expect(result.current.threads[0]?.id).toBe("thread-b");
    });
    expect(result.current.threadId).toBeNull();

    act(() => {
      selectThreadA("late-thread-a");
    });
    expect(result.current.threadId).toBeNull();

    rerender({ cloud: cloudA });
    expect(result.current.threadId).toBeNull();
    await waitFor(() => {
      expect(result.current.threads[0]?.id).toBe("thread-a");
    });
    expect(result.current.threadId).toBeNull();
  });

  it("resets scoped thread state when the cloud changes", async () => {
    const cloudA = createCloud("thread-a");
    const cloudB = createCloud("thread-b");
    const cloudBList =
      createDeferred<ReturnType<typeof createThreadListResponse>>();
    cloudB.threads.list.mockReturnValue(cloudBList.promise);

    const { result, rerender } = renderHook(
      ({ cloud }) => useThreads({ cloud: cloud as never }),
      { initialProps: { cloud: cloudA } },
    );

    await waitFor(() => {
      expect(result.current.threads[0]?.id).toBe("thread-a");
    });
    cloudA.threads.list.mockRejectedValueOnce(
      new Error("previous workspace unavailable"),
    );
    await act(async () => {
      expect(await result.current.refresh()).toBe(false);
    });
    expect(result.current.error?.message).toBe(
      "previous workspace unavailable",
    );

    rerender({ cloud: cloudB });

    expect(result.current.threads).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);

    cloudBList.reject(new Error("workspace unavailable"));
    await waitFor(() => {
      expect(result.current.error?.message).toBe("workspace unavailable");
    });
    expect(result.current.threads).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("clears loading when a cloud change disables refreshes", async () => {
    const cloudA = createCloud("thread-a");
    const cloudB = createCloud("thread-b");
    const cloudAList =
      createDeferred<ReturnType<typeof createThreadListResponse>>();
    cloudA.threads.list.mockReturnValue(cloudAList.promise);

    const { result, rerender } = renderHook(
      ({ cloud, enabled }) => useThreads({ cloud: cloud as never, enabled }),
      { initialProps: { cloud: cloudA, enabled: true } },
    );

    expect(result.current.isLoading).toBe(true);

    rerender({ cloud: cloudB, enabled: false });

    expect(result.current.threads).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(cloudB.threads.list).not.toHaveBeenCalled();

    await act(async () => {
      cloudAList.resolve(createThreadListResponse("Stale A", "thread-a"));
      await cloudAList.promise;
    });
    expect(result.current.threads).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("ignores a refresh that resolves after the cloud changes", async () => {
    const cloudA = createCloud("thread-a");
    const cloudB = createCloud("thread-b");
    const staleRefresh =
      createDeferred<ReturnType<typeof createThreadListResponse>>();

    const { result, rerender } = renderHook(
      ({ cloud }) => useThreads({ cloud: cloud as never }),
      { initialProps: { cloud: cloudA } },
    );

    await waitFor(() => {
      expect(result.current.threads[0]?.id).toBe("thread-a");
    });
    cloudA.threads.list.mockReturnValueOnce(staleRefresh.promise);

    let refreshPromise!: Promise<boolean>;
    act(() => {
      refreshPromise = result.current.refresh();
    });
    expect(cloudA.threads.list).toHaveBeenCalledTimes(2);

    rerender({ cloud: cloudB });
    await waitFor(() => {
      expect(result.current.threads[0]?.id).toBe("thread-b");
    });

    await act(async () => {
      staleRefresh.resolve(
        createThreadListResponse("Stale A", "stale-thread-a"),
      );
      await refreshPromise;
    });
    expect(result.current.threads[0]?.id).toBe("thread-b");
  });

  it("ignores async mutations from an earlier use of the same cloud", async () => {
    const cloudA = createCloud("thread-a");
    const cloudB = createCloud("thread-b");
    const staleCreate = createDeferred<{ thread_id: string }>();

    const { result, rerender } = renderHook(
      ({ cloud }) => useThreads({ cloud: cloud as never }),
      { initialProps: { cloud: cloudA } },
    );

    await waitFor(() => {
      expect(result.current.threads[0]?.id).toBe("thread-a");
    });
    cloudA.threads.create.mockReturnValueOnce(staleCreate.promise);

    let createPromise!: ReturnType<typeof result.current.create>;
    act(() => {
      createPromise = result.current.create();
    });

    rerender({ cloud: cloudB });
    await waitFor(() => {
      expect(result.current.threads[0]?.id).toBe("thread-b");
    });
    rerender({ cloud: cloudA });
    await waitFor(() => {
      expect(result.current.threads[0]?.id).toBe("thread-a");
    });

    await act(async () => {
      staleCreate.resolve({ thread_id: "stale-thread-a" });
      await createPromise;
    });
    expect(result.current.threads.map((thread) => thread.id)).toEqual([
      "thread-a",
    ]);
  });

  it("clears the selected thread after deleting it", async () => {
    const cloud = createCloud("thread-1");
    cloud.threads.delete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    act(() => {
      result.current.selectThread("thread-1");
    });
    expect(result.current.threadId).toBe("thread-1");

    await act(async () => {
      await result.current.delete("thread-1");
    });

    expect(result.current.threadId).toBeNull();
  });

  it("clears the selected thread after archiving hides it", async () => {
    const cloud = createCloud("thread-1");
    cloud.threads.update.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    act(() => {
      result.current.selectThread("thread-1");
    });

    await act(async () => {
      await result.current.archive("thread-1");
    });

    expect(result.current.threadId).toBeNull();
  });

  it("preserves the selected thread when archived threads remain visible", async () => {
    const cloud = createCloud("thread-1");
    cloud.threads.update.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useThreads({
        cloud: cloud as never,
        enabled: false,
        includeArchived: true,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });
    act(() => {
      result.current.selectThread("thread-1");
    });

    await act(async () => {
      await result.current.archive("thread-1");
    });

    expect(result.current.threadId).toBe("thread-1");
    expect(result.current.threads[0]?.status).toBe("archived");
  });

  it("uses the latest archive visibility after options change", async () => {
    const cloud = createCloud("thread-1");
    const archive = createDeferred<void>();
    cloud.threads.update.mockReturnValueOnce(archive.promise);

    const { result, rerender } = renderHook(
      ({ includeArchived }) =>
        useThreads({
          cloud: cloud as never,
          enabled: false,
          includeArchived,
        }),
      { initialProps: { includeArchived: true } },
    );

    await act(async () => {
      await result.current.refresh();
    });
    act(() => {
      result.current.selectThread("thread-1");
    });

    let archivePromise!: Promise<boolean>;
    act(() => {
      archivePromise = result.current.archive("thread-1");
    });
    rerender({ includeArchived: false });

    await act(async () => {
      archive.resolve();
      await archivePromise;
    });

    expect(result.current.threadId).toBeNull();
    expect(result.current.threads).toEqual([]);
  });

  it("preserves a newer selection when an archive finishes", async () => {
    const cloud = createCloud("thread-1");
    const archive = createDeferred<void>();
    cloud.threads.update.mockReturnValueOnce(archive.promise);

    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    act(() => {
      result.current.selectThread("thread-1");
    });

    let archivePromise!: Promise<boolean>;
    act(() => {
      archivePromise = result.current.archive("thread-1");
    });
    act(() => {
      result.current.selectThread("thread-2");
    });

    await act(async () => {
      archive.resolve();
      await archivePromise;
    });

    expect(result.current.threadId).toBe("thread-2");
  });

  it("preserves a newer selection when a deletion finishes", async () => {
    const cloud = createCloud("thread-1");
    const deletion = createDeferred<void>();
    cloud.threads.delete.mockReturnValueOnce(deletion.promise);

    const { result } = renderHook(() =>
      useThreads({ cloud: cloud as never, enabled: false }),
    );

    act(() => {
      result.current.selectThread("thread-1");
    });

    let deletePromise!: Promise<boolean>;
    act(() => {
      deletePromise = result.current.delete("thread-1");
    });
    act(() => {
      result.current.selectThread("thread-2");
    });

    await act(async () => {
      deletion.resolve();
      await deletePromise;
    });

    expect(result.current.threadId).toBe("thread-2");
  });

  it("avoids unmounted state updates during async refresh", async () => {
    const deferred = createDeferred<{ threads: never[] }>();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const cloud = {
      threads: {
        list: vi.fn().mockReturnValue(deferred.promise),
        get: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    } as never;

    const { unmount } = renderHook(() => useThreads({ cloud }));

    unmount();
    deferred.resolve({ threads: [] });
    await deferred.promise;

    await Promise.resolve();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
