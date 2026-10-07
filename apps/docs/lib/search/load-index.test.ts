import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("bounds index loading and allows a retry after a timeout", async () => {
  const controller = new AbortController();
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValue(controller.signal);
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementationOnce(
      async (_, options) =>
        new Promise((_, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new Error("timed out")),
          );
        }),
    )
    .mockResolvedValueOnce(Response.json([]));
  vi.stubGlobal("fetch", fetcher);
  const { loadSearchIndex } = await import("./load-index");
  const pending = loadSearchIndex();
  expect(timeout).toHaveBeenCalledWith(10_000);
  expect(loadSearchIndex()).toBe(pending);
  controller.abort();
  await expect(pending).rejects.toThrow("timed out");
  timeout.mockReturnValue(new AbortController().signal);
  expect(await loadSearchIndex()).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
