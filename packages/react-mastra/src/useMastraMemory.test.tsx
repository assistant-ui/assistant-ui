import type { MastraClient } from "@mastra/client-js";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMastraMemory } from "./useMastraMemory";

const createClient = () => {
  const searchMemory = vi.fn();
  const getWorkingMemory = vi.fn();
  const updateWorkingMemory = vi.fn();
  const client = {
    searchMemory,
    getWorkingMemory,
    updateWorkingMemory,
  } as unknown as MastraClient;
  return { client, searchMemory, getWorkingMemory, updateWorkingMemory };
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe("useMastraMemory", () => {
  it("searches across a resource without requiring a thread", async () => {
    const { client, searchMemory } = createClient();
    const response = { results: [], count: 0, query: "release risk" };
    searchMemory.mockResolvedValue(response);
    const { result } = renderHook(() =>
      useMastraMemory({
        client,
        agentId: "release-assistant",
        resourceId: "user-1",
        requestContext: { tenant: "acme" },
      }),
    );

    await expect(result.current.searchMemory("release risk")).resolves.toBe(
      response,
    );
    expect(searchMemory).toHaveBeenCalledWith({
      agentId: "release-assistant",
      resourceId: "user-1",
      searchQuery: "release risk",
      requestContext: { tenant: "acme" },
    });
  });

  it("forwards search overrides and tracks overlapping requests", async () => {
    const { client, searchMemory } = createClient();
    const first = deferred<{
      results: never[];
      count: number;
      query: string;
    }>();
    const second = deferred<{
      results: never[];
      count: number;
      query: string;
    }>();
    searchMemory
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() =>
      useMastraMemory({
        client,
        agentId: "agent-1",
        resourceId: "user-1",
        threadId: "thread-default",
      }),
    );

    let firstPromise!: Promise<unknown>;
    let secondPromise!: Promise<unknown>;
    act(() => {
      firstPromise = result.current.searchMemory("one", {
        threadId: "thread-override",
        resourceId: "user-2",
        memoryConfig: { topK: 3 },
        requestContext: { role: "admin" },
      });
      secondPromise = result.current.searchMemory("two");
    });
    expect(result.current.isSearching).toBe(true);

    await act(async () => {
      first.resolve({ results: [], count: 0, query: "one" });
      await firstPromise;
    });
    expect(result.current.isSearching).toBe(true);

    await act(async () => {
      second.resolve({ results: [], count: 0, query: "two" });
      await secondPromise;
    });
    expect(result.current.isSearching).toBe(false);
    expect(searchMemory).toHaveBeenNthCalledWith(1, {
      agentId: "agent-1",
      resourceId: "user-2",
      threadId: "thread-override",
      searchQuery: "one",
      memoryConfig: { topK: 3 },
      requestContext: { role: "admin" },
    });
  });

  it("reads and updates working memory with the selected scope", async () => {
    const { client, getWorkingMemory, updateWorkingMemory } = createClient();
    getWorkingMemory.mockResolvedValue("# Profile");
    updateWorkingMemory.mockResolvedValue({ updated: true });
    const { result } = renderHook(() =>
      useMastraMemory({
        client,
        agentId: "agent-1",
        resourceId: "user-1",
        threadId: "thread-1",
      }),
    );

    await expect(result.current.getWorkingMemory()).resolves.toBe("# Profile");
    await expect(
      result.current.updateWorkingMemory("# Updated", {
        threadId: "thread-2",
        requestContext: { locale: "en" },
      }),
    ).resolves.toEqual({ updated: true });
    expect(getWorkingMemory).toHaveBeenCalledWith({
      agentId: "agent-1",
      threadId: "thread-1",
      resourceId: "user-1",
      requestContext: undefined,
    });
    expect(updateWorkingMemory).toHaveBeenCalledWith({
      agentId: "agent-1",
      threadId: "thread-2",
      workingMemory: "# Updated",
      resourceId: "user-1",
      requestContext: { locale: "en" },
    });
  });

  it("requires a thread for working memory operations", async () => {
    const { client, getWorkingMemory, updateWorkingMemory } = createClient();
    const { result } = renderHook(() =>
      useMastraMemory({
        client,
        agentId: "agent-1",
        resourceId: "user-1",
      }),
    );

    await expect(result.current.getWorkingMemory()).rejects.toThrow(
      "useMastraMemory.getWorkingMemory requires a threadId",
    );
    await expect(
      result.current.updateWorkingMemory("# Profile"),
    ).rejects.toThrow(
      "useMastraMemory.updateWorkingMemory requires a threadId",
    );
    expect(getWorkingMemory).not.toHaveBeenCalled();
    expect(updateWorkingMemory).not.toHaveBeenCalled();
  });

  it("resets operation state and rethrows client errors", async () => {
    const { client, searchMemory } = createClient();
    const failure = deferred<never>();
    searchMemory.mockReturnValue(failure.promise);
    const { result } = renderHook(() =>
      useMastraMemory({
        client,
        agentId: "agent-1",
        resourceId: "user-1",
      }),
    );

    let operation!: Promise<unknown>;
    act(() => {
      operation = result.current.searchMemory("missing");
    });
    expect(result.current.isSearching).toBe(true);

    const error = new Error("memory unavailable");
    await act(async () => {
      failure.reject(error);
      await expect(operation).rejects.toBe(error);
    });
    expect(result.current.isSearching).toBe(false);
  });
});
