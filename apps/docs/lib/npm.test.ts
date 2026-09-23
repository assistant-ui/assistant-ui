import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NPM_REVALIDATE,
  getDownloadsRange,
  getLastWeek,
  getWeeklyDownloads,
} from "./npm";

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

  it("reads a refused request as no data, and says so", async () => {
    respond(null, false, 429);

    await expect(range()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("429"));
  });

  it("reads the week npm names alongside its count", async () => {
    respond({ downloads: 926_410, start: "2026-09-02", end: "2026-09-08" });

    await expect(getLastWeek("@assistant-ui/react")).resolves.toEqual({
      downloads: 926_410,
      start: "2026-09-02",
      end: "2026-09-08",
    });
  });

  it("keeps the count when npm names no window", async () => {
    respond({ downloads: 926_410 });

    await expect(getWeeklyDownloads("@assistant-ui/react")).resolves.toBe(
      926_410,
    );
  });

  it("drops a window npm cannot have meant", async () => {
    respond({ downloads: 926_410, start: "2026-09-02", end: "not-a-day" });

    await expect(getLastWeek("@assistant-ui/react")).resolves.toEqual({
      downloads: 926_410,
      start: "2026-09-02",
      end: null,
    });
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
