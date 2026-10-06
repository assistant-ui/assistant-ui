// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSearchSuggestions } from "./use-search-suggestions";
import type { SearchScope } from "../lib/search/route-query";

const page = {
  url: "/docs/cloud",
  title: "Cloud",
  description: "Persist chats",
};
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("debounces queries and ignores a late response from an earlier query", async () => {
  vi.useFakeTimers();
  let finish: (response: Response) => void = () => {};
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(Response.json({ pages: [] }));
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender } = renderHook(
    ({ query }) => useSearchSuggestions(query, "All", []),
    { initialProps: { query: "save history" } },
  );
  expect(fetcher).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(fetcher).toHaveBeenCalledTimes(1);
  rerender({ query: "render messages" });
  await act(async () => {
    finish(Response.json({ pages: [page] }));
  });
  expect(result.current.pages).toEqual([]);
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(result.current.loading).toBe(false);
  expect(result.current.pages).toEqual([]);
});

it("clears old suggestions as soon as the scope changes", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json({ pages: [page] })),
  );
  const { result, rerender } = renderHook(
    ({ scope }) => useSearchSuggestions("save history", scope, []),
    { initialProps: { scope: "All" as SearchScope } },
  );
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(result.current.pages).toEqual([page]);
  rerender({ scope: "Elements" });
  expect(result.current.pages).toEqual([]);
  expect(result.current.loading).toBe(true);
});

it("does not send exact titles and quietly settles when the server fails", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender } = renderHook(
    ({ query }) => useSearchSuggestions(query, "All", [page]),
    { initialProps: { query: "Cloud" } },
  );
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(fetcher).not.toHaveBeenCalled();
  rerender({ query: "save history" });
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(result.current).toEqual({ pages: [], loading: false });
});
