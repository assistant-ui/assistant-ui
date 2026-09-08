import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDownloadsRange } = vi.hoisted(() => ({
  getDownloadsRange: vi.fn(),
}));

vi.mock("./npm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./npm")>()),
  getDownloadsRange,
}));

const { FLAGSHIP_PACKAGE } = await import("./npm");
const { fetchNpmDownloads } = await import("./traction");

const NOW = new Date("2026-09-08T12:00:00Z");

describe("fetchNpmDownloads", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    getDownloadsRange.mockReset();
    getDownloadsRange.mockResolvedValue(
      Array.from({ length: 63 }, (_, index) => {
        const day = new Date(Date.UTC(2026, 6, 8 + index));
        return {
          day: day.toISOString().slice(0, 10),
          downloads: index >= 61 ? 0 : 100,
        };
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("derives rolling metrics from settled daily rows", async () => {
    const downloads = await fetchNpmDownloads();

    expect(getDownloadsRange).toHaveBeenCalledWith(
      FLAGSHIP_PACKAGE,
      "2026-07-08",
      "2026-09-08",
      undefined,
    );
    expect(downloads.perPackage[FLAGSHIP_PACKAGE]).toEqual({
      weekly: 700,
      series: Array(30).fill(100),
      monthly: 3000,
      prevMonthly: 3000,
    });
  });
});
