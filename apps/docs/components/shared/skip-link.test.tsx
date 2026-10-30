// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DocsPageShell } from "@/components/pages/docs/layout/docs-page";
import { PageFrame } from "./page-frame";
import { SkipLink } from "./skip-link";

afterEach(cleanup);

describe("SkipLink", () => {
  it.each([
    ["PageFrame", <PageFrame key="frame">content</PageFrame>],
    ["DocsPageShell", <DocsPageShell key="docs">content</DocsPageShell>],
  ])("points at the main landmark of %s", (_, page) => {
    render(
      <>
        <SkipLink />
        {page}
      </>,
    );

    const href = screen
      .getByRole("link", { name: "Skip to content" })
      .getAttribute("href");
    expect(screen.getByRole("main").id).toBe(href?.slice(1));
  });
});
