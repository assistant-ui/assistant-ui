import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStargazersPage } = vi.hoisted(() => ({
  getStargazersPage: vi.fn(),
}));

vi.mock("./github", () => ({
  getStargazersPage,
  getCommitActivityStats: vi.fn(),
  getCommitCoAuthors: vi.fn(),
  getCommitsSince: vi.fn(),
  getContributors: vi.fn(),
  getReleases: vi.fn(),
  getUser: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock("./npm", () => ({ getDownloadsRange: vi.fn() }));

const { fetchStarHistory } = await import("./traction");

const WEEK_MS = 7 * 86_400_000;
/** A Monday, so the first star lands exactly on a week boundary. */
const EPOCH = Date.UTC(2024, 0, 1);
const TOTAL = 250;
const STEP_MS = 12 * 3_600_000;

const starredAt = (n: number) => new Date(EPOCH + n * STEP_MS).toISOString();

const serve = (total = TOTAL, failing: number[] = []) => {
  const lastPage = Math.ceil(total / 100);
  getStargazersPage.mockImplementation(async (page: number) => {
    if (page > lastPage || failing.includes(page)) {
      return { data: [], lastPage: page === 1 ? null : lastPage };
    }
    const start = (page - 1) * 100;
    return {
      data: Array.from({ length: Math.min(100, total - start) }, (_, i) => ({
        starred_at: starredAt(start + i),
      })),
      lastPage,
    };
  });
};

describe("fetchStarHistory", () => {
  beforeEach(() => {
    getStargazersPage.mockReset();
  });

  it("counts every star exactly on a weekly grid", async () => {
    serve();

    const points = await fetchStarHistory(TOTAL);

    expect(getStargazersPage).toHaveBeenCalledTimes(3);
    expect(points.at(-1)).toEqual({ date: starredAt(TOTAL - 1), value: TOTAL });

    // Two stars a day, so a week boundary is a whole number of weeks in.
    for (const [i, point] of points.slice(0, -1).entries()) {
      const elapsed = new Date(point.date).getTime() - EPOCH;
      expect(elapsed).toBe((i + 1) * WEEK_MS);
      expect(point.value).toBe(Math.min(TOTAL, (i + 1) * 14));
    }
  });

  it("is ordered, non-decreasing, and never coarser than a week", async () => {
    serve();

    const points = await fetchStarHistory(TOTAL);

    expect(points.length).toBeGreaterThan(2);
    for (let i = 1; i < points.length; i++) {
      const gap =
        new Date(points[i]!.date).getTime() -
        new Date(points[i - 1]!.date).getTime();
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(WEEK_MS);
      expect(points[i]!.value).toBeGreaterThanOrEqual(points[i - 1]!.value);
    }
  });

  it("extends the line to the repo's live count", async () => {
    serve();

    const points = await fetchStarHistory(TOTAL + 6);

    expect(points.at(-1)!.value).toBe(TOTAL + 6);
    expect(points.at(-2)!.value).toBe(TOTAL);
  });

  it("never draws a drop when the cached count trails the listing", async () => {
    serve();

    const points = await fetchStarHistory(TOTAL - 20);

    expect(points.at(-1)!.value).toBe(TOTAL);
  });

  it("draws nothing rather than a curve missing a page", async () => {
    serve(TOTAL, [2]);

    // A kept page-2 failure would shift every later point down by 100 and let
    // the tail close the gap as a cliff, which is a shape nobody measured.
    await expect(fetchStarHistory(TOTAL)).resolves.toEqual([]);
  });

  it("omits a tail the listing cannot explain as lag", async () => {
    serve();

    const points = await fetchStarHistory(TOTAL + 4000);

    expect(points.at(-1)!.value).toBe(TOTAL);
  });

  it("does not repeat the boundary when the last star lands on one", async () => {
    // 2 stars a day from a Monday, so star 15 is starred at exactly EPOCH + 7d.
    serve(15);

    const points = await fetchStarHistory(15);

    // Without the guard the week boundary and the closing star are two points
    // at the same instant, a zero gap the series is not allowed to contain.
    expect(points).toEqual([
      { date: new Date(EPOCH + 14 * STEP_MS).toISOString(), value: 15 },
    ]);
  });

  it("returns nothing when the first page is unavailable", async () => {
    serve(TOTAL, [1]);

    await expect(fetchStarHistory(TOTAL)).resolves.toEqual([]);
  });
});
