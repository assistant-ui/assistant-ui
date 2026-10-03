import {
  Children,
  Suspense,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const requests: (() => void)[] = [];
  const timelines: ((value: { series: never[]; data: never[] }) => void)[] = [];

  return {
    requests,
    timelines,
    connection: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          requests.push(resolve);
        }),
    ),
    traction: {
      fetchTimelineSeries: vi.fn(
        () =>
          new Promise<{ series: never[]; data: never[] }>((resolve) => {
            timelines.push(resolve);
          }),
      ),
      fetchNpmDownloads: vi.fn(async () => ({
        totalWeekly: 0,
        perPackage: {},
      })),
      fetchStarHistory: vi.fn(async () => []),
      fetchContributors: vi.fn(async () => null),
      fetchBotCoAuthors: vi.fn(async () => []),
      fetchCommitActivity: vi.fn(async () => []),
      fetchReleaseActivity: vi.fn(async () => []),
    },
    github: {
      getRepo: vi.fn(async () => null),
      getDependents: vi.fn(async () => null),
      getCommitStats: vi.fn(async () => ({
        total: null,
        firstCommitDate: null,
      })),
    },
  };
});

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: mocks.connection,
}));

vi.mock("@/lib/traction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/traction")>()),
  ...mocks.traction,
}));

vi.mock("@/lib/github", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/github")>()),
  ...mocks.github,
}));

vi.mock("@/components/shared/live-dot", () => ({ LiveDot: () => null }));
vi.mock("@/components/shared/page-frame", () => ({
  PageFrame: () => null,
}));
vi.mock("@/components/shared/type", () => ({
  typeDeck: "",
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

type Section = ReactElement<object, (props: object) => Promise<ReactNode>>;

const sectionsOf = (node: ReactNode): Section[] => {
  if (Array.isArray(node)) return node.flatMap(sectionsOf);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  if (node.type === Suspense) return [node.props.children as Section];
  return sectionsOf(node.props.children);
};

const flush = () => new Promise((resolve) => setTimeout(resolve));

describe("TractionPage", () => {
  it("streams every read behind Suspense after the request, with npm's catalogue after the timeline", async () => {
    const sections = sectionsOf(TractionPage());
    expect(sections).toHaveLength(5);

    const rendered = Promise.all(
      sections.map((section) => section.type(section.props)),
    );
    await flush();

    expect(mocks.requests).toHaveLength(5);
    for (const read of [
      ...Object.values(mocks.traction),
      ...Object.values(mocks.github),
    ]) {
      expect(read).not.toHaveBeenCalled();
    }

    for (const open of mocks.requests) open();
    await flush();

    expect(mocks.traction.fetchTimelineSeries).toHaveBeenCalled();
    expect(mocks.traction.fetchStarHistory).toHaveBeenCalled();
    expect(mocks.traction.fetchNpmDownloads).not.toHaveBeenCalled();

    for (const resolve of mocks.timelines) resolve({ series: [], data: [] });
    await rendered;

    expect(mocks.traction.fetchNpmDownloads).toHaveBeenCalledOnce();
    for (const read of [
      ...Object.values(mocks.traction),
      ...Object.values(mocks.github),
    ]) {
      expect(read).toHaveBeenCalled();
    }
  });

  it("keeps all eight stat cards when GitHub does not answer", async () => {
    const [stats] = sectionsOf(TractionPage());
    const rendered = stats!.type(stats!.props);
    await flush();
    for (const open of mocks.requests.splice(0)) open();
    await flush();
    for (const resolve of mocks.timelines.splice(0)) {
      resolve({ series: [], data: [] });
    }

    const section = (await rendered) as ReactElement<{ children: ReactNode }>;
    expect(Children.toArray(section.props.children)).toHaveLength(8);
  });
});
