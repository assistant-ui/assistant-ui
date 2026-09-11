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
    // Centre of the jitter band, so a backoff step is exactly its nominal wait.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
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

  it("carries a long revalidation for settled history", async () => {
    respond({ downloads: [] });

    await range(NPM_REVALIDATE.COLD);

    expect(fetchMock.mock.calls[0]![1]).toEqual({
      next: { revalidate: NPM_REVALIDATE.COLD },
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

  it("spreads the retries of a refused burst instead of replaying it", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(1);
    respond(null, false, 429);

    const first = range();
    const second = range();
    await vi.advanceTimersByTimeAsync(150);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(2_000);
    await Promise.all([first, second]);
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
