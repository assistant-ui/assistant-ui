import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMastraMemory } from "./useMastraMemory";

describe("useMastraMemory", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates and deletes threads through the configured API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          thread: {
            id: "thread-1",
            metadata: { title: "Candidate" },
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        }),
      )
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useMastraMemory({ apiUrl: "/memory", userId: "user-1" }),
    );

    let threadId = "";
    await act(async () => {
      threadId = await result.current.createThread({ title: "Candidate" });
    });

    expect(threadId).toBe("thread-1");
    expect(result.current.currentThread).toBe("thread-1");

    await act(async () => {
      await result.current.deleteThread("thread-1");
    });

    expect(result.current.currentThread).toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/memory/threads/thread-1", {
      method: "DELETE",
    });
  });
});
