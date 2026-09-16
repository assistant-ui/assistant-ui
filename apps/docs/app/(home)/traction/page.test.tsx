import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const events: string[] = [];
  let resolveTimeline!: (value: { series: never[]; data: never[] }) => void;
  const timeline = new Promise<{ series: never[]; data: never[] }>(
    (resolve) => {
      resolveTimeline = resolve;
    },
  );

  return {
    events,
    resolveTimeline: () => resolveTimeline({ series: [], data: [] }),
    fetchNpmDownloads: vi.fn(async () => {
      events.push("npm");
      return { totalWeekly: 0, perPackage: {} };
    }),
    fetchStarHistory: vi.fn(async () => {
      events.push("stars");
      return [];
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
  fetchStarHistory: mocks.fetchStarHistory,
  fetchTimelineSeries: mocks.fetchTimelineSeries,
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
  it("holds the package fan-out until the timeline resolves, and nothing else", async () => {
    const page = TractionPage();
    await Promise.resolve();

    expect(mocks.fetchTimelineSeries).toHaveBeenCalled();
    expect(mocks.fetchStarHistory).toHaveBeenCalled();
    expect(mocks.fetchNpmDownloads).not.toHaveBeenCalled();

    mocks.resolveTimeline();
    await page;

    expect(mocks.events).toEqual(["timeline", "stars", "npm"]);
  });
});
