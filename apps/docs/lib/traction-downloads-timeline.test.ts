import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDownloadsRange } = vi.hoisted(() => ({
  getDownloadsRange: vi.fn(),
}));

vi.mock("./npm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./npm")>()),
  getDownloadsRange,
}));

const { NPM_REVALIDATE } = await import("./npm");
const { fetchDownloadsTimeline } = await import("./traction");

const NOW = new Date("2026-09-08T12:00:00Z");
const PER_DAY = 100;

/** Every day the window actually spans, so a mis-built window shows up as a wrong sum. */
const daysIn = (start: string, end: string) => {
  const days: { day: string; downloads: number }[] = [];
  for (
    const cursor = new Date(`${start}T00:00:00Z`);
    cursor.toISOString().slice(0, 10) <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    days.push({
      day: cursor.toISOString().slice(0, 10),
      downloads: PER_DAY,
    });
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

const revalidateFor = (window: string) =>
  getDownloadsRange.mock.calls.find(
    ([, start, end]) => `${start}:${end}` === window,
  )?.[3];

describe("fetchDownloadsTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    getDownloadsRange.mockReset();
    serveWindows();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks for one calendar window per month across the trailing year", async () => {
    await fetchDownloadsTimeline("@assistant-ui/react");

    expect(windows().slice().sort()).toEqual([
      "2025-09-01:2025-09-30",
      "2025-10-01:2025-10-31",
      "2025-11-01:2025-11-30",
      "2025-12-01:2025-12-31",
      "2026-01-01:2026-01-31",
      "2026-02-01:2026-02-28",
      "2026-03-01:2026-03-31",
      "2026-04-01:2026-04-30",
      "2026-05-01:2026-05-31",
      "2026-06-01:2026-06-30",
      "2026-07-01:2026-07-31",
      "2026-08-01:2026-08-31",
      "2026-09-01:2026-09-08",
    ]);
  });

  it("reads the newest month first so a spent budget drops the oldest", async () => {
    await fetchDownloadsTimeline("@assistant-ui/react");

    expect(windows()[0]).toBe("2026-09-01:2026-09-08");
    expect(windows().at(-1)).toBe("2025-09-01:2025-09-30");
  });

  it("holds a month only once npm's trailing lag has passed", async () => {
    await fetchDownloadsTimeline("@assistant-ui/react");

    expect(revalidateFor("2026-09-01:2026-09-08")).toBe(NPM_REVALIDATE.WARM);
    expect(revalidateFor("2026-08-01:2026-08-31")).toBe(false);
  });

  it("keeps a just-ended month refreshing while npm is still settling it", async () => {
    vi.setSystemTime(new Date("2026-09-01T06:00:00Z"));

    await fetchDownloadsTimeline("@assistant-ui/react");

    expect(revalidateFor("2026-08-01:2026-08-31")).toBe(NPM_REVALIDATE.COOL);
    expect(revalidateFor("2026-07-01:2026-07-31")).toBe(false);
  });

  it("stops scheduling windows once the wall-clock budget is spent", async () => {
    getDownloadsRange.mockImplementation(
      (_pkg: string, start: string, end: string) => {
        vi.setSystemTime(new Date(Date.now() + 5_000));
        return Promise.resolve(daysIn(start, end));
      },
    );

    const points = await fetchDownloadsTimeline("@assistant-ui/react");

    expect(getDownloadsRange).toHaveBeenCalledTimes(6);
    expect(points.map((point) => point.date)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("keeps the rest of the series when one window cannot be read", async () => {
    getDownloadsRange.mockImplementation(
      (_pkg: string, start: string, end: string) =>
        Promise.resolve(start.startsWith("2026-03") ? [] : daysIn(start, end)),
    );

    const points = await fetchDownloadsTimeline("@assistant-ui/react");

    expect(points).toHaveLength(12);
    expect(points.map((point) => point.date)).not.toContain("2026-03");
    expect(points[0]).toEqual({ date: "2025-09", value: 30 * PER_DAY });
  });

  it("returns nothing when npm is unreachable for every window", async () => {
    getDownloadsRange.mockResolvedValue([]);

    await expect(
      fetchDownloadsTimeline("@assistant-ui/react"),
    ).resolves.toEqual([]);
  });

  it("sums whole months and projects the month in flight", async () => {
    const points = await fetchDownloadsTimeline("@assistant-ui/react");

    expect(points.at(-2)).toEqual({ date: "2026-08", value: 31 * PER_DAY });
    // 6 settled days of 100 over a 30 day month, blended 0.2/0.8 with August's 3100.
    expect(points.at(-1)).toEqual({ date: "2026-09", value: 3080 });
  });
});
