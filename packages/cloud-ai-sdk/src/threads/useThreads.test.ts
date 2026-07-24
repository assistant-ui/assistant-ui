// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useThreads } from "./useThreads";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function createThreadListResponse(title: string) {
  return {
    threads: [
      {
        id: "thread-1",
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

describe("useThreads", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
