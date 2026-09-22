import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ImageResponse: vi.fn(function (
    _element: unknown,
    options: { headers: HeadersInit },
  ) {
    return new Response(null, { headers: options.headers });
  }),
  getRepo: vi.fn(),
  getWeeklyDownloads: vi.fn(),
  fetchContributors: vi.fn(),
  fetchDownloadsTimeline: vi.fn(),
  fetchStarHistory: vi.fn(),
  loadOgFonts: vi.fn(async () => []),
}));

vi.mock("next/og", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/og")>()),
  ImageResponse: mocks.ImageResponse,
}));

vi.mock("@/lib/github", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/github")>()),
  getRepo: mocks.getRepo,
}));

vi.mock("@/lib/npm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/npm")>()),
  getWeeklyDownloads: mocks.getWeeklyDownloads,
}));

vi.mock("@/lib/og-fonts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/og-fonts")>()),
  loadOgFonts: mocks.loadOgFonts,
}));

vi.mock("@/lib/traction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/traction")>()),
  fetchContributors: mocks.fetchContributors,
  fetchDownloadsTimeline: mocks.fetchDownloadsTimeline,
  fetchStarHistory: mocks.fetchStarHistory,
}));

const { renderTractionImage } = await import("./traction-image");

const COMPLETE_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400";
const DEGRADED_CACHE_CONTROL =
  "public, max-age=60, s-maxage=60, stale-while-revalidate=60";
const points = [
  { date: "2026-01-01", value: 1 },
  { date: "2026-02-01", value: 2 },
];

beforeEach(() => {
  mocks.getRepo.mockResolvedValue({
    stars: 1,
    forks: 0,
    openIssues: 0,
    watchers: 0,
  });
  mocks.getWeeklyDownloads.mockResolvedValue(1);
  mocks.fetchContributors.mockResolvedValue([]);
  mocks.fetchDownloadsTimeline.mockResolvedValue(points);
  mocks.fetchStarHistory.mockResolvedValue(points);
});

describe("renderTractionImage cache policy", () => {
  it("keeps the long cache for a complete render", async () => {
    const response = await renderTractionImage("light");

    expect(response.headers.get("Cache-Control")).toBe(COMPLETE_CACHE_CONTROL);
  });

  it.each([
    ["missing repo", () => mocks.getRepo.mockResolvedValue(null)],
    [
      "missing weekly downloads",
      () => mocks.getWeeklyDownloads.mockResolvedValue(null),
    ],
    [
      "missing contributors",
      () => mocks.fetchContributors.mockResolvedValue(null),
    ],
    [
      "short star history",
      () => mocks.fetchStarHistory.mockResolvedValue([points[0]]),
    ],
    [
      "short downloads timeline",
      () => mocks.fetchDownloadsTimeline.mockResolvedValue([points[0]]),
    ],
  ] as const)("shortens the cache for %s", async (_reason, degrade) => {
    degrade();

    const response = await renderTractionImage("dark");

    expect(response.headers.get("Cache-Control")).toBe(DEGRADED_CACHE_CONTROL);
  });
});
