import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ImageResponse: vi.fn(function (
    _element: ReactElement,
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
const DEGRADED_CACHE_CONTROL = "private, no-store";
const points = [
  { date: "2026-01-01", value: 1 },
  { date: "2026-02-01", value: 2 },
];

const render = async (theme: "light" | "dark") => {
  const response = await renderTractionImage(theme);
  const markup = renderToStaticMarkup(mocks.ImageResponse.mock.lastCall![0]);
  return {
    cacheControl: response.headers.get("Cache-Control"),
    drawsFallback:
      markup.includes("—") || markup.includes("currently unavailable"),
  };
};

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
  it("caches a render that draws every source", async () => {
    expect(await render("light")).toEqual({
      cacheControl: COMPLETE_CACHE_CONTROL,
      drawsFallback: false,
    });
  });

  it.each([
    ["repo", () => mocks.getRepo.mockResolvedValue(null)],
    [
      "weekly downloads",
      () => mocks.getWeeklyDownloads.mockResolvedValue(null),
    ],
    ["contributors", () => mocks.fetchContributors.mockResolvedValue(null)],
    [
      "star history",
      () => mocks.fetchStarHistory.mockResolvedValue([points[0]]),
    ],
    [
      "downloads timeline",
      () => mocks.fetchDownloadsTimeline.mockResolvedValue([points[0]]),
    ],
  ] as const)(
    "does not store a render whose %s fell back",
    async (_source, degrade) => {
      degrade();

      expect(await render("dark")).toEqual({
        cacheControl: DEGRADED_CACHE_CONTROL,
        drawsFallback: true,
      });
    },
  );
});
