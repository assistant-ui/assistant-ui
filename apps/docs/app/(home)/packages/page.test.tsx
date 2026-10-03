import { Children, Suspense, isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { PackageDownloads } from "../../../lib/traction";

const mocks = vi.hoisted(() => {
  const requests: (() => void)[] = [];

  return {
    requests,
    connection: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          requests.push(resolve);
        }),
    ),
    fetchNpmDownloads: vi.fn(async () => ({
      totalWeekly: 10,
      weeklyAvailability: { total: true },
      perPackage: {
        "@assistant-ui/react": {
          weekly: 10,
          series: [10],
          monthly: 10,
          prevMonthly: 0,
        },
      } as Record<string, PackageDownloads>,
    })),
  };
});

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: mocks.connection,
}));

vi.mock("@/lib/traction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/traction")>()),
  fetchNpmDownloads: mocks.fetchNpmDownloads,
}));

const { default: PackagesPage } = await import("./page");

type Directory = ReactElement<{ concentration: unknown }>;

const flush = () => new Promise((resolve) => setTimeout(resolve));

describe("PackagesPage", () => {
  it("renders the catalogue as a static shell and reads npm after the request", async () => {
    const boundary = Children.toArray(PackagesPage().props.children).find(
      (child) => isValidElement(child) && child.type === Suspense,
    ) as ReactElement<{
      fallback: Directory;
      children: ReactElement<object, (props: object) => Promise<Directory>>;
    }>;
    expect(boundary.props.fallback.props.concentration).toBeNull();

    const directory = boundary.props.children;
    const rendered = directory.type(directory.props);
    await flush();

    expect(mocks.requests).toHaveLength(1);
    expect(mocks.fetchNpmDownloads).not.toHaveBeenCalled();

    for (const open of mocks.requests.splice(0)) open();

    const result = await rendered;
    expect(result.props.concentration).toMatchObject({
      leaders: [{ name: "@assistant-ui/react", weekly: 10 }],
      total: 10,
    });
    expect(mocks.fetchNpmDownloads).toHaveBeenCalledOnce();
  });

  it("withholds the share ranking when any package range is unavailable", async () => {
    mocks.fetchNpmDownloads.mockResolvedValueOnce({
      totalWeekly: 0,
      weeklyAvailability: { total: false },
      perPackage: {
        "@assistant-ui/react": {
          weekly: 0,
          series: [],
          monthly: 0,
          prevMonthly: 0,
        },
        "assistant-stream": {
          weekly: 14,
          series: [14],
          monthly: 14,
          prevMonthly: 0,
        },
      },
    });

    const boundary = Children.toArray(PackagesPage().props.children).find(
      (child) => isValidElement(child) && child.type === Suspense,
    ) as ReactElement<{
      children: ReactElement<object, (props: object) => Promise<Directory>>;
    }>;
    const directory = boundary.props.children;
    const rendered = directory.type(directory.props);
    await flush();
    for (const open of mocks.requests.splice(0)) open();

    const result = await rendered;
    const props = result.props as {
      concentration: { leaders: unknown[]; total: number };
      rows: { name: string; weekly: string | null }[];
    };
    expect(props.concentration).toEqual({
      leaders: [],
      tailNames: [],
      tailCount: 0,
      tailWeekly: 0,
      total: 0,
    });
    expect(
      props.rows.find((row) => row.name === "@assistant-ui/react")?.weekly,
    ).toBeNull();
    expect(
      props.rows.find((row) => row.name === "assistant-stream")?.weekly,
    ).not.toBeNull();
  });
});
