import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDownloadsRange, getLastWeek } = vi.hoisted(() => ({
  getDownloadsRange: vi.fn(),
  getLastWeek: vi.fn(),
}));

vi.mock("./npm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./npm")>()),
  getDownloadsRange,
  getLastWeek,
}));

const { FLAGSHIP_PACKAGE } = await import("./npm");
const { fetchNpmDownloads } = await import("./traction");

const TODAY = new Date("2026-09-16T03:00:00Z");

const LAST_WEEK = {
  downloads: 1_282_657,
  start: "2026-09-05",
  end: "2026-09-11",
};
const SETTLED_WEEK = [171_939, 170_602, 0, 0, 322_755, 324_879, 292_482];
const EARLIER_DAY = 100;

const rangeRows = (start: string, end: string) => {
  const rows: { day: string; downloads: number }[] = [];
  for (
    let day = new Date(`${start}T00:00:00Z`);
    day.toISOString().slice(0, 10) <= end;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    rows.push({ day: day.toISOString().slice(0, 10), downloads: EARLIER_DAY });
  }
  SETTLED_WEEK.forEach((downloads, index) => {
    rows[rows.length - SETTLED_WEEK.length + index]!.downloads = downloads;
  });
  return rows;
};

describe("fetchNpmDownloads", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
    getLastWeek.mockResolvedValue(LAST_WEEK);
    getDownloadsRange.mockImplementation((_name, start, end) =>
      Promise.resolve(rangeRows(start, end)),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports the week npm reports, not the days since", async () => {
    const downloads = await fetchNpmDownloads();

    expect(getDownloadsRange).toHaveBeenCalledWith(
      FLAGSHIP_PACKAGE,
      "2026-07-13",
      LAST_WEEK.end,
      undefined,
    );
    expect(
      new Set(
        getDownloadsRange.mock.calls.map(([, start, end]) => `${start}:${end}`),
      ),
    ).toEqual(new Set([`2026-07-13:${LAST_WEEK.end}`]));
    expect(downloads.perPackage[FLAGSHIP_PACKAGE]).toEqual({
      weekly: LAST_WEEK.downloads,
      series: [...Array(23).fill(EARLIER_DAY), ...SETTLED_WEEK],
      monthly: 23 * EARLIER_DAY + LAST_WEEK.downloads,
      prevMonthly: 30 * EARLIER_DAY,
    });
  });

  it("falls back to the current day when npm withholds the window", async () => {
    getLastWeek.mockResolvedValue(null);

    await fetchNpmDownloads();

    expect(getDownloadsRange).toHaveBeenCalledWith(
      FLAGSHIP_PACKAGE,
      "2026-07-18",
      "2026-09-16",
      undefined,
    );
  });
});
