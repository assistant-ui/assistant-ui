import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const events: string[] = [];
  let resolveTimeline!: (value: { series: never[]; data: never[] }) => void;
  let timeline: Promise<{ series: never[]; data: never[] }>;

  const resetTimeline = () => {
    events.length = 0;
    timeline = new Promise((resolve) => {
      resolveTimeline = resolve;
    });
  };

  resetTimeline();

  return {
    events,
    resolveTimeline: () => resolveTimeline({ series: [], data: [] }),
    resetTimeline,
    fetchNpmDownloads: vi.fn(async () => {
      events.push("npm");
      return { totalWeekly: 0, perPackage: {} };
    }),
    fetchTimelineSeries: vi.fn(() => {
      events.push("timeline");
      return timeline;
    }),
  };
});

vi.mock("@/lib/traction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/traction")>()),
  fetchNpmDownloads: mocks.fetchNpmDownloads,
  fetchTimelineSeries: mocks.fetchTimelineSeries,
  fetchStarHistory: vi.fn(async () => []),
  fetchContributors: vi.fn(async () => null),
  fetchBotCoAuthors: vi.fn(async () => []),
  fetchCommitActivity: vi.fn(async () => []),
  fetchReleaseActivity: vi.fn(async () => []),
}));

vi.mock("@/lib/github", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/github")>()),
  getRepo: vi.fn(async () => null),
  getDependents: vi.fn(async () => null),
  getCommitStats: vi.fn(async () => ({
    total: null,
    firstCommitDate: null,
  })),
}));

vi.mock("@/components/shared/live-dot", () => ({ LiveDot: () => null }));
vi.mock("@/components/shared/page-frame", () => ({
  PageFrame: () => null,
}));
vi.mock("@/components/shared/type", () => ({
  typeDeck: "",
  typeEyebrow: "",
  typePage: "",
}));
vi.mock("@/components/pages/traction/activity-heatmap", () => ({
  ActivityHeatmap: () => null,
}));
vi.mock("@/components/pages/traction/downloads-chart", () => ({
  DownloadsChart: () => null,
}));
vi.mock("@/components/pages/traction/star-history-chart", () => ({
  StarHistoryChart: () => null,
}));
vi.mock("@/components/pages/traction/weekly-downloads-stat", () => ({
  WeeklyDownloadsStat: () => null,
}));

const { default: TractionPage } = await import("./page");

describe("TractionPage", () => {
  beforeEach(() => {
    mocks.resetTimeline();
    mocks.fetchNpmDownloads.mockClear();
    mocks.fetchTimelineSeries.mockClear();
  });

  it("waits for the timeline before starting package downloads", async () => {
    const page = TractionPage();
    await Promise.resolve();

    expect(mocks.events).toEqual(["timeline"]);
    expect(mocks.fetchNpmDownloads).not.toHaveBeenCalled();

    mocks.resolveTimeline();
    await page;

    expect(mocks.events.indexOf("npm")).toBeGreaterThan(
      mocks.events.indexOf("timeline"),
    );
  });
});
