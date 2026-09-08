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

const daysOf = (month: string, through: number, downloads: number) =>
  Array.from({ length: through }, (_, i) => ({
    day: `${month}-${String(i + 1).padStart(2, "0")}`,
    downloads,
  }));

/** Every window npm was asked for, as `start:end`. */
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
    getDownloadsRange.mockImplementation((_pkg: string, start: string) =>
      Promise.resolve(daysOf(start.slice(0, 7), 28, 100)),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks for one calendar window per month across the trailing year", async () => {
    await fetchDownloadsTimeline("@assistant-ui/react");

    expect(windows()).toEqual([
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

  it("holds a month that has ended and only refetches the one in flight", async () => {
    await fetchDownloadsTimeline("@assistant-ui/react");

    expect(revalidateFor("2026-08-01:2026-08-31")).toBe(false);
    expect(revalidateFor("2026-09-01:2026-09-08")).toBe(NPM_REVALIDATE.WARM);
  });

  it("keeps the rest of the series when one window cannot be read", async () => {
    getDownloadsRange.mockImplementation((_pkg: string, start: string) =>
      Promise.resolve(
        start.startsWith("2026-03") ? [] : daysOf(start.slice(0, 7), 28, 100),
      ),
    );

    const points = await fetchDownloadsTimeline("@assistant-ui/react");

    expect(points).toHaveLength(12);
    expect(points.map((point) => point.date)).not.toContain("2026-03");
    expect(points[0]).toEqual({ date: "2025-09", value: 2800 });
  });

  it("returns nothing when npm is unreachable for every window", async () => {
    getDownloadsRange.mockResolvedValue([]);

    await expect(
      fetchDownloadsTimeline("@assistant-ui/react"),
    ).resolves.toEqual([]);
  });

  it("sums whole months and projects the month in flight past its elapsed days", async () => {
    getDownloadsRange.mockImplementation((_pkg: string, start: string) =>
      Promise.resolve(
        start.startsWith("2026-09")
          ? daysOf("2026-09", 8, 100)
          : daysOf(start.slice(0, 7), 28, 100),
      ),
    );

    const points = await fetchDownloadsTimeline("@assistant-ui/react");

    expect(points.at(-2)).toEqual({ date: "2026-08", value: 2800 });
    const inflight = points.at(-1)!;
    expect(inflight.date).toBe("2026-09");
    expect(inflight.value).toBeGreaterThan(800);
  });
});
