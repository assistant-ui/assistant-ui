import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NPM_REVALIDATE, getDownloadsRange, getWeeklyDownloads } from "./npm";

const fetchMock = vi.fn();

const respond = (body: unknown, ok = true, status = 200) =>
  fetchMock.mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });

const range = (revalidate?: number) =>
  getDownloadsRange(
    "@assistant-ui/react",
    "2026-08-01",
    "2026-08-31",
    revalidate,
  );

describe("npm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reads a range and carries its revalidation to the data cache", async () => {
    respond({ downloads: [{ day: "2026-08-01", downloads: 7 }] });

    await expect(range()).resolves.toEqual([
      { day: "2026-08-01", downloads: 7 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.npmjs.org/downloads/range/2026-08-01:2026-08-31/@assistant-ui/react",
      { next: { revalidate: NPM_REVALIDATE.WARM } },
    );
  });

  it("holds a window indefinitely when asked to", async () => {
    respond({ downloads: [] });

    await range(false);

    expect(fetchMock.mock.calls[0]![1]).toEqual({
      next: { revalidate: false },
    });
  });

  it("bypasses the cache at revalidate zero", async () => {
    respond({ downloads: [] });

    await range(0);

    expect(fetchMock.mock.calls[0]![1]).toEqual({ cache: "no-store" });
  });

  it("retries a rate-limited request rather than reading it as no data", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 429, json: vi.fn() })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ downloads: [{ day: "d", downloads: 3 }] }),
      });

    const downloads = range();
    await vi.advanceTimersByTimeAsync(300);

    await expect(downloads).resolves.toEqual([{ day: "d", downloads: 3 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("gives up once the backoff ladder is spent, and says so", async () => {
    vi.useFakeTimers();
    respond(null, false, 429);

    const downloads = range();
    await vi.advanceTimersByTimeAsync(300 + 1200);

    await expect(downloads).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("429"));
  });

  it("does not retry a status npm will answer the same way", async () => {
    respond(null, false, 404);

    await expect(range()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("404"));
  });

  it("paces requests so a deploy cannot burst the whole package list at npm", async () => {
    const release: (() => void)[] = [];
    let peak = 0;
    let open = 0;
    fetchMock.mockImplementation(() => {
      open++;
      peak = Math.max(peak, open);
      return new Promise((resolve) => {
        release.push(() => {
          open--;
          resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ downloads: [] }),
          });
        });
      });
    });

    const all = Promise.all(Array.from({ length: 10 }, () => range()));
    while (release.length) release.shift()!();
    await new Promise((resolve) => setTimeout(resolve, 0));
    while (release.length) release.shift()!();
    await new Promise((resolve) => setTimeout(resolve, 0));
    while (release.length) release.shift()!();
    await all;

    expect(peak).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("names the error when the request never lands", async () => {
    fetchMock.mockRejectedValue(new Error("socket hang up"));

    await expect(getWeeklyDownloads("@assistant-ui/react")).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("/downloads/point/last-week/@assistant-ui/react"),
      expect.any(Error),
    );
  });
});
