// @vitest-environment jsdom

import { act, render, renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import {
  startTransition,
  Suspense,
  useInsertionEffect,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";
import type { RemoteThreadListAdapter } from "../../../runtimes/remote-thread-list/types";
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

const Suspend = ({ pending }: { pending: Promise<never> }) => {
  throw pending;
};

describe("useCloudThreadListAdapter", () => {
  it("keeps operations scoped to the committed Cloud options", async () => {
    const deleteA = vi.fn(async () => {});
    const deleteB = vi.fn(async () => {});
    const cloudDeleteA = vi.fn(async () => {});
    const cloudDeleteB = vi.fn(async () => {});
    const cloudA = {
      threads: { delete: cloudDeleteA },
    } as unknown as AssistantCloud;
    const cloudB = {
      threads: { delete: cloudDeleteB },
    } as unknown as AssistantCloud;
    const committed: { current: RemoteThreadListAdapter | null } = {
      current: null,
    };
    const renderB = vi.fn();
    let suspend = false;
    const pending = new Promise<never>(() => {});

    const App = ({
      cloud,
      onDelete,
    }: {
      cloud: AssistantCloud;
      onDelete: (threadId: string) => Promise<void>;
    }) => {
      const adapter = useCloudThreadListAdapter({
        cloud,
        delete: onDelete,
      });
      if (cloud === cloudB) renderB();
      useInsertionEffect(() => {
        committed.current = adapter;
      }, [adapter]);
      return null;
    };
    const Boundary = ({ children }: { children: ReactNode }) => (
      <Suspense fallback={null}>
        {children}
        {suspend ? <Suspend pending={pending} /> : null}
      </Suspense>
    );
    const view = render(
      <Boundary>
        <App cloud={cloudA} onDelete={deleteA} />
      </Boundary>,
    );

    act(() => {
      suspend = true;
      startTransition(() => {
        view.rerender(
          <Boundary>
            <App cloud={cloudB} onDelete={deleteB} />
          </Boundary>,
        );
      });
    });
    expect(renderB).toHaveBeenCalled();

    await committed.current!.delete!("thread-1");

    expect(deleteA).toHaveBeenCalledWith("thread-1");
    expect(deleteB).not.toHaveBeenCalled();
    expect(cloudDeleteA).toHaveBeenCalledWith("thread-1");
    expect(cloudDeleteB).not.toHaveBeenCalled();

    suspend = false;
    view.rerender(
      <Boundary>
        <App cloud={cloudB} onDelete={deleteB} />
      </Boundary>,
    );
    await committed.current!.delete!("thread-2");

    expect(deleteB).toHaveBeenCalledWith("thread-2");
    expect(cloudDeleteB).toHaveBeenCalledWith("thread-2");
  });

  it("loads archived Cloud threads alongside regular threads", async () => {
    const activeThreads = [makeThread("active-1")];
    const archivedThreads = [
      { ...makeThread("archived-1"), is_archived: true },
    ];
    const list = vi
      .fn()
      .mockResolvedValueOnce({ threads: activeThreads })
      .mockResolvedValueOnce({ threads: archivedThreads });
    const cloud = { threads: { list } } as unknown as AssistantCloud;
    const { result } = renderHook(() => useCloudThreadListAdapter({ cloud }));

    const page = await result.current.list();

    expect(list).toHaveBeenNthCalledWith(1, { limit: 20 });
    expect(list).toHaveBeenNthCalledWith(2, {
      is_archived: true,
      limit: 20,
    });
    expect(page.threads.map((thread) => thread.remoteId)).toEqual([
      "active-1",
      "archived-1",
    ]);
    expect(
      page.threads.find((thread) => thread.remoteId === "active-1")?.status,
    ).toBe("regular");
    expect(
      page.threads.find((thread) => thread.remoteId === "archived-1")?.status,
    ).toBe("archived");
  });

  it("continues the active list once the archived list is exhausted", async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) =>
      makeThread(`thread-${index + 1}`),
    );
    const secondPage = [makeThread("thread-21")];
    const list = vi
      .fn()
      .mockResolvedValueOnce({ threads: firstPage })
      .mockResolvedValueOnce({ threads: [] })
      .mockResolvedValueOnce({ threads: secondPage });
    const cloud = { threads: { list } } as unknown as AssistantCloud;
    const { result } = renderHook(() => useCloudThreadListAdapter({ cloud }));

    const first = await result.current.list();
    expect(list).toHaveBeenNthCalledWith(1, { limit: 20 });
    expect(list).toHaveBeenNthCalledWith(2, { is_archived: true, limit: 20 });
    expect(first.threads).toHaveLength(20);
    expect(JSON.parse(first.nextCursor!)).toEqual({ a: "thread-20", re: true });

    const second = await result.current.list({ after: first.nextCursor });
    expect(list).toHaveBeenCalledTimes(3);
    expect(list).toHaveBeenNthCalledWith(3, {
      limit: 20,
      after: "thread-20",
    });
    expect(second.threads.map((thread) => thread.remoteId)).toEqual([
      "thread-21",
    ]);
    expect(second.nextCursor).toBeUndefined();
  });

  it("paginates both legs without dropping or duplicating items", async () => {
    const activePage1 = Array.from({ length: 20 }, (_, index) =>
      makeThread(`a-${index + 1}`),
    );
    const archivedPage1 = Array.from({ length: 20 }, (_, index) => ({
      ...makeThread(`r-${index + 1}`),
      is_archived: true,
    }));
    const activePage2 = [makeThread("a-21")];
    const archivedPage2 = [{ ...makeThread("r-21"), is_archived: true }];
    const list = vi
      .fn()
      .mockResolvedValueOnce({ threads: activePage1 })
      .mockResolvedValueOnce({ threads: archivedPage1 })
      .mockResolvedValueOnce({ threads: activePage2 })
      .mockResolvedValueOnce({ threads: archivedPage2 });
    const cloud = { threads: { list } } as unknown as AssistantCloud;
    const { result } = renderHook(() => useCloudThreadListAdapter({ cloud }));

    const page1 = await result.current.list();
    expect(page1.threads).toHaveLength(40);
    expect(JSON.parse(page1.nextCursor!)).toEqual({ a: "a-20", r: "r-20" });

    const page2 = await result.current.list({ after: page1.nextCursor });
    expect(list).toHaveBeenNthCalledWith(3, { limit: 20, after: "a-20" });
    expect(list).toHaveBeenNthCalledWith(4, {
      is_archived: true,
      limit: 20,
      after: "r-20",
    });
    expect(page2.threads.map((thread) => thread.remoteId)).toEqual([
      "a-21",
      "r-21",
    ]);
    expect(page2.nextCursor).toBeUndefined();
  });

  it("accepts a legacy bare-id cursor for the active list", async () => {
    const activeThreads = [makeThread("thread-21")];
    const list = vi
      .fn()
      .mockResolvedValueOnce({ threads: activeThreads })
      .mockResolvedValueOnce({ threads: [] });
    const cloud = { threads: { list } } as unknown as AssistantCloud;
    const { result } = renderHook(() => useCloudThreadListAdapter({ cloud }));

    const page = await result.current.list({ after: "thread-20" });

    expect(list).toHaveBeenNthCalledWith(1, {
      limit: 20,
      after: "thread-20",
    });
    expect(list).toHaveBeenNthCalledWith(2, {
      is_archived: true,
      limit: 20,
    });
    expect(page.threads.map((thread) => thread.remoteId)).toEqual([
      "thread-21",
    ]);
  });
});
