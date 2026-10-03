import { Children, Suspense, isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

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
    fetchNpmDownloads: vi.fn(async () => ({ totalWeekly: 0, perPackage: {} })),
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

    for (const open of mocks.requests) open();

    expect((await rendered).props.concentration).not.toBeNull();
    expect(mocks.fetchNpmDownloads).toHaveBeenCalledOnce();
  });
});
