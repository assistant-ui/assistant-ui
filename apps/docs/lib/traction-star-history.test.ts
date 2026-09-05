import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStarHistory } = vi.hoisted(() => ({ getStarHistory: vi.fn() }));

vi.mock("./github", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./github")>()),
  getStarHistory,
}));

const { fetchStarHistory } = await import("./traction");

const WEEK_S = 7 * 86_400;
const WEEK_MS = WEEK_S * 1000;
/** A Sunday, matching the week boundary the endpoint buckets on. */
const FIRST_WEEK = Math.floor(Date.UTC(2024, 0, 7) / 1000);

const week = (index: number, total: number) => ({
  week: FIRST_WEEK + index * WEEK_S,
  total,
  days: [total, 0, 0, 0, 0, 0, 0],
});

describe("fetchStarHistory", () => {
  beforeEach(() => {
    getStarHistory.mockReset();
  });

  it("accumulates the weekly buckets in order, newest first on the wire", () => {
    // The endpoint returns newest first, so the reversal is load bearing.
    getStarHistory.mockResolvedValue([week(2, 5), week(0, 10), week(1, 3)]);

    return expect(fetchStarHistory()).resolves.toEqual([
      { date: new Date((FIRST_WEEK + WEEK_S) * 1000).toISOString(), value: 10 },
      {
        date: new Date((FIRST_WEEK + 2 * WEEK_S) * 1000).toISOString(),
        value: 13,
      },
      {
        date: new Date((FIRST_WEEK + 3 * WEEK_S) * 1000).toISOString(),
        value: 18,
      },
    ]);
  });

  it("closes the bucket in progress at now rather than in the future", async () => {
    const current = Math.floor((Date.now() - WEEK_MS / 2) / 1000);
    getStarHistory.mockResolvedValue([
      { week: current, total: 4, days: [1, 1, 1, 1, 0, 0, 0] },
      { week: current - WEEK_S, total: 6, days: [6, 0, 0, 0, 0, 0, 0] },
    ]);

    const points = await fetchStarHistory();

    expect(points.at(-1)!.value).toBe(10);
    expect(new Date(points.at(-1)!.date).getTime()).toBeLessThanOrEqual(
      Date.now(),
    );
  });

  it("is ordered and non-decreasing", async () => {
    getStarHistory.mockResolvedValue(
      Array.from({ length: 40 }, (_, i) => week(i, i % 7)),
    );

    const points = await fetchStarHistory();

    expect(points).toHaveLength(40);
    for (let i = 1; i < points.length; i++) {
      expect(
        new Date(points[i]!.date).getTime() -
          new Date(points[i - 1]!.date).getTime(),
      ).toBeGreaterThan(0);
      expect(points[i]!.value).toBeGreaterThanOrEqual(points[i - 1]!.value);
    }
  });

  it("draws nothing when the history is unavailable", async () => {
    getStarHistory.mockResolvedValue(null);

    await expect(fetchStarHistory()).resolves.toEqual([]);
  });

  it("draws nothing rather than a two point line from a single bucket", async () => {
    getStarHistory.mockResolvedValue([week(0, 10)]);

    await expect(fetchStarHistory()).resolves.toEqual([]);
  });
});
