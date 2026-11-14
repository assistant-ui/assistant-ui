import { Children, Suspense, isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { NpmDownloads } from "@/lib/traction";

const mocks = vi.hoisted(() => ({
  fetchNpmDownloads: vi.fn(async (): Promise<NpmDownloads> => ({
    flagshipWeekly: 0,
    totalWeekly: 0,
    perPackage: {},
  })),
}));

vi.mock("@/lib/traction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/traction")>()),
  fetchNpmDownloads: mocks.fetchNpmDownloads,
}));

const { default: PackagesPage } = await import("./page");

type Directory = ReactElement<{ concentration: unknown }>;

async function resolveDirectory() {
  const boundary = Children.toArray((await PackagesPage()).props.children).find(
    (child) => isValidElement(child) && child.type === Suspense,
  ) as ReactElement<{
    children: ReactElement<object, (props: object) => Promise<Directory>>;
  }>;
  const directory = boundary.props.children;
  return directory.type(directory.props);
}

describe("PackagesPage", () => {
  it("renders the catalogue as a static shell and reads npm inside the boundary", async () => {
    const boundary = Children.toArray(
      (await PackagesPage()).props.children,
    ).find(
      (child) => isValidElement(child) && child.type === Suspense,
    ) as ReactElement<{
      fallback: Directory;
      children: ReactElement<object, (props: object) => Promise<Directory>>;
    }>;
    expect(boundary.props.fallback.props.concentration).toBeNull();
    expect(mocks.fetchNpmDownloads).not.toHaveBeenCalled();

    const directory = boundary.props.children;
    expect(
      (await directory.type(directory.props)).props.concentration,
    ).not.toBeNull();
    expect(mocks.fetchNpmDownloads).toHaveBeenCalledOnce();
  });

  it("reports the share as unavailable when a package read failed", async () => {
    mocks.fetchNpmDownloads.mockResolvedValueOnce({
      flagshipWeekly: 900,
      totalWeekly: null,
      perPackage: {
        "@assistant-ui/react": {
          weekly: 900,
          series: [],
          monthly: 0,
          prevMonthly: 0,
        },
        "@assistant-ui/core": {
          weekly: 100,
          series: [],
          monthly: 0,
          prevMonthly: 0,
        },
      },
    });

    expect((await resolveDirectory()).props.concentration).toEqual({
      leaders: [],
      tailNames: [],
      tailCount: 0,
      tailWeekly: 0,
      total: 0,
    });
  });

  it("totals concentration from the ranked weekly downloads after a complete read", async () => {
    const perPackage = {
      "@assistant-ui/react": {
        weekly: 900,
        series: [],
        monthly: 0,
        prevMonthly: 0,
      },
      "@assistant-ui/core": {
        weekly: 100,
        series: [],
        monthly: 0,
        prevMonthly: 0,
      },
    };
    mocks.fetchNpmDownloads.mockResolvedValueOnce({
      flagshipWeekly: 900,
      totalWeekly: 5000,
      perPackage,
    });

    const concentration = (await resolveDirectory()).props.concentration;

    expect(concentration).toMatchObject({
      total: Object.values(perPackage).reduce(
        (sum, stats) => sum + stats.weekly,
        0,
      ),
    });
  });
});
