// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import type * as PageTree from "fumadocs-core/page-tree";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformProvider } from "./context";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/docs",
}));

const tree: PageTree.Root = { name: "Docs", children: [] };

afterEach(() => {
  cleanup();
});

describe("PlatformProvider hint script", () => {
  it("ships in the server HTML so it runs before the sidebar is parsed", () => {
    const html = renderToString(
      <PlatformProvider tree={tree}>x</PlatformProvider>,
    );
    expect(html).toContain("data-allowed=");
  });

  it("is not created by a client-side mount, where React would never run it", () => {
    const { container } = render(
      <PlatformProvider tree={tree}>x</PlatformProvider>,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(document.documentElement.dataset.docsPlatformHint).toBeDefined();
  });
});
