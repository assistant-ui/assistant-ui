// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DocsPageSkeleton } from "./docs-page-skeleton";

afterEach(() => {
  cleanup();
});

describe("docs page skeleton", () => {
  it("announces loading and shimmers placeholders in the page frame", () => {
    const { container } = render(<DocsPageSkeleton />);
    const status = screen.getByRole("status", { name: "Loading page" });
    expect(status.className).toContain("shimmer-container");
    expect(status.querySelectorAll(".shimmer").length).toBeGreaterThan(5);
    expect(container.querySelector("main, #nd-page, article")).not.toBeNull();
  });

  it("reserves the table of contents column, hidden from assistive tech", () => {
    const { container } = render(<DocsPageSkeleton />);
    const toc = container.querySelector(".docs-toc");
    expect(toc).not.toBeNull();
    expect(toc!.getAttribute("aria-hidden")).toBe("true");
    expect(toc!.querySelectorAll(".shimmer").length).toBeGreaterThan(0);
  });
});
