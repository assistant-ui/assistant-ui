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

const { NPM_REVALIDATE } = await import("./npm");
const { fetchDownloadsTimeline, fetchTimelineSeries } =
  await import("./traction");

const NOW = new Date("2026-09-08T12:00:00Z");
const PER_DAY = 100;

/** Every day the window actually spans, so a mis-built window shows as a wrong sum. */
const daysIn = (start: string, end: string) => {
  const days: { day: string; downloads: number }[] = [];
  for (
    const cursor = new Date(`${start}T00:00:00Z`);
    cursor.toISOString().slice(0, 10) <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    days.push({ day: cursor.toISOString().slice(0, 10), downloads: PER_DAY });
  }
  return days;
};

const serveWindows = () =>
  getDownloadsRange.mockImplementation(
    (_pkg: string, start: string, end: string) =>
      Promise.resolve(daysIn(start, end)),
  );

const windows = () =>
  getDownloadsRange.mock.calls.map(([, start, end]) => `${start}:${end}`);

const revalidations = () =>
  getDownloadsRange.mock.calls.map(([, , , revalidate]) => revalidate);

describe("fetchDownloadsTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    getDownloadsRange.mockReset();
    getLastWeek.mockReset();
    getLastWeek.mockImplementation(async () => ({
      downloads: 0,
      start: null,
      end: new Date().toISOString().slice(0, 10),
    }));
    serveWindows();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the year as a settled window it can hold plus the unsettled tail", async () => {
    await fetchDownloadsTimeline("@assistant-ui/react");

    expect(windows()).toEqual([
      "2025-09-01:2026-08-31",
      "2026-09-01:2026-09-08",
    ]);
    expect(revalidations()).toEqual([NPM_REVALIDATE.COLD, NPM_REVALIDATE.WARM]);
  });

  it("leaves a just-ended month in the tail until npm has backfilled it", async () => {
    vi.setSystemTime(new Date("2026-09-01T06:00:00Z"));
    getLastWeek.mockResolvedValue({
      downloads: 0,
      start: null,
      end: "2026-08-30",
    });

    await fetchDownloadsTimeline("@assistant-ui/react");

    expect(windows()).toEqual([
      "2025-09-01:2026-07-31",
      "2026-08-01:2026-08-30",
    ]);
    expect(revalidations()).toEqual([NPM_REVALIDATE.COLD, NPM_REVALIDATE.WARM]);
  });

  it("covers thirteen months, one point each", async () => {
    const points = await fetchDownloadsTimeline("@assistant-ui/react");

    expect(points.map((point) => point.date)).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("keeps the settled history when the tail cannot be read", async () => {
    getDownloadsRange.mockImplementation(
      (_pkg: string, start: string, end: string) =>
        Promise.resolve(start.startsWith("2026-09") ? [] : daysIn(start, end)),
    );

    const points = await fetchDownloadsTimeline("@assistant-ui/react");

    expect(points).toHaveLength(12);
    expect(points.at(-1)).toEqual({ date: "2026-08", value: 31 * PER_DAY });
  });

  it("keeps the tail when the settled history cannot be read", async () => {
    getDownloadsRange.mockImplementation(
      (_pkg: string, start: string, end: string) =>
        Promise.resolve(start.startsWith("2025-09") ? [] : daysIn(start, end)),
    );

    const points = await fetchDownloadsTimeline("@assistant-ui/react");

    expect(points.map((point) => point.date)).toEqual(["2026-09"]);
  });

  it("returns nothing when npm is unreachable for both windows", async () => {
    getDownloadsRange.mockResolvedValue([]);

    await expect(
      fetchDownloadsTimeline("@assistant-ui/react"),
    ).resolves.toEqual([]);
  });

  it("sums whole months and projects the month in flight", async () => {
    const points = await fetchDownloadsTimeline("@assistant-ui/react");

    expect(points.at(-2)).toEqual({ date: "2026-08", value: 31 * PER_DAY });
    // 8 settled days of 100 over a 30 day month, blended 8/30 with August's 3100.
    expect(points.at(-1)).toEqual({ date: "2026-09", value: 3073 });
  });

  it("uses npm's reported end when it trails the current day", async () => {
    vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
    getLastWeek.mockResolvedValue({
      downloads: 1,
      start: "2026-09-05",
      end: "2026-09-11",
    });
    getDownloadsRange.mockImplementation(
      (_pkg: string, start: string, end: string) =>
        Promise.resolve(
          start === "2026-09-01"
            ? [
                ...daysIn(start, end),
                ...daysIn("2026-09-12", "2026-09-16").map((d) => ({
                  ...d,
                  downloads: 0,
                })),
              ]
            : daysIn(start, end),
        ),
    );

    const points = await fetchDownloadsTimeline("@assistant-ui/react");

    expect(windows()).toEqual([
      "2025-09-01:2026-08-31",
      "2026-09-01:2026-09-11",
    ]);
    expect(points.at(-1)).toEqual({ date: "2026-09", value: 3063 });
  });

  it("falls back to the current day when npm withholds its window", async () => {
    getLastWeek.mockResolvedValue(null);

    await fetchDownloadsTimeline("@assistant-ui/react");

    expect(windows()).toEqual([
      "2025-09-01:2026-08-31",
      "2026-09-01:2026-09-08",
    ]);
  });
});

describe("fetchTimelineSeries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    getDownloadsRange.mockReset();
    getLastWeek.mockReset();
    getLastWeek.mockResolvedValue({
      downloads: 0,
      start: null,
      end: "2026-09-05",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("leaves a month it could not read out of the row rather than calling it zero", async () => {
    getDownloadsRange.mockImplementation(
      (pkg: string, start: string, end: string) =>
        Promise.resolve(
          pkg === "quiet" && start.startsWith("2025-09")
            ? []
            : daysIn(start, end),
        ),
    );

    const timeline = await fetchTimelineSeries(["loud", "quiet"]);

    expect(getLastWeek).toHaveBeenCalledTimes(1);
    expect(windows().filter((window) => window.startsWith("2026-09"))).toEqual([
      "2026-09-01:2026-09-05",
      "2026-09-01:2026-09-05",
    ]);
    const august = timeline.data.find((row) => row.date === "2026-08")!;
    expect(august["s0"]).toBe(31 * PER_DAY);
    expect("s1" in august).toBe(false);
  });
});
