import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getCommitActivityStats, getCommitsSince } = vi.hoisted(() => ({
  getCommitActivityStats: vi.fn(),
  getCommitsSince: vi.fn(),
}));

vi.mock("./github", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./github")>()),
  getCommitActivityStats,
  getCommitsSince,
}));

const { fetchCommitActivity } = await import("./traction");

describe("fetchCommitActivity", () => {
  beforeEach(() => {
    getCommitActivityStats.mockResolvedValue(null);
    getCommitsSince.mockResolvedValue([]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks the commit list for the year from a day boundary", async () => {
    vi.setSystemTime(new Date("2026-09-21T13:45:12.345Z"));

    await fetchCommitActivity();

    expect(getCommitsSince).toHaveBeenCalledWith(
      "2025-09-21T00:00:00.000Z",
      undefined,
      undefined,
    );
  });

  it("keeps the same window for every render of the day", async () => {
    vi.setSystemTime(new Date("2026-09-21T00:00:00.000Z"));
    await fetchCommitActivity();
    vi.setSystemTime(new Date("2026-09-21T23:59:59.999Z"));
    await fetchCommitActivity();

    const [first, second] = getCommitsSince.mock.calls;
    expect(second![0]).toBe(first![0]);
  });

  it("counts the fallback commits by day", async () => {
    vi.setSystemTime(new Date("2026-09-21T13:45:12.345Z"));
    getCommitsSince.mockResolvedValue([
      { commit: { author: { date: "2026-09-20T08:00:00Z" } } },
      { commit: { author: { date: "2026-09-20T09:00:00Z" } } },
      { commit: { committer: { date: "2026-09-19T09:00:00Z" } } },
    ]);

    await expect(fetchCommitActivity()).resolves.toEqual([
      { date: "2026-09-20", count: 2 },
      { date: "2026-09-19", count: 1 },
    ]);
  });
});
