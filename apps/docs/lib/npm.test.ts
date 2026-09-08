import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NPM_REVALIDATE, getDownloadsRange, getWeeklyDownloads } from "./npm";

const fetchMock = vi.fn();

const respond = (body: unknown, ok = true, status = 200) =>
  fetchMock.mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });

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
    respond({ downloads: [{ day: "2026-09-01", downloads: 7 }] });

    await expect(
      getDownloadsRange("@assistant-ui/react", "2026-09-01", "2026-09-08"),
    ).resolves.toEqual([{ day: "2026-09-01", downloads: 7 }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.npmjs.org/downloads/range/2026-09-01:2026-09-08/@assistant-ui/react",
      { next: { revalidate: NPM_REVALIDATE.WARM } },
    );
  });

  it("holds a window indefinitely when asked to", async () => {
    respond({ downloads: [] });

    await getDownloadsRange(
      "@assistant-ui/react",
      "2026-08-01",
      "2026-08-31",
      false,
    );

    expect(fetchMock.mock.calls[0]![1]).toEqual({
      next: { revalidate: false },
    });
  });

  it("bypasses the cache at revalidate zero", async () => {
    respond({ downloads: [] });

    await getDownloadsRange(
      "@assistant-ui/react",
      "2026-08-01",
      "2026-08-31",
      0,
    );

    expect(fetchMock.mock.calls[0]![1]).toEqual({ cache: "no-store" });
  });

  it("names the status when npm refuses the request", async () => {
    respond(null, false, 429);

    await expect(
      getDownloadsRange("@assistant-ui/react", "2026-08-01", "2026-08-31"),
    ).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("429"));
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
