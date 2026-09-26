import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Sources, type Source } from "./sources";

afterEach(cleanup);

const renderSources = (sources: readonly Source[]) =>
  render(<Sources sources={sources} open onOpenChange={() => {}} />);

describe("Sources", () => {
  it("links safe URLs and leaves unsafe URLs as cards", () => {
    renderSources([
      {
        domain: "example.com",
        title: "Safe source",
        url: "https://example.com/reference",
      },
      {
        domain: "unsafe.example",
        title: "Unsafe source",
        url: "javascript:alert(1)",
      },
    ]);

    const link = screen.getByRole("link", { name: /Safe source/ });
    expect(link.getAttribute("href")).toBe("https://example.com/reference");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    const unsafeCard = screen
      .getByText("Unsafe source")
      .closest('[data-slot="source-card"]');
    expect(unsafeCard?.tagName).toBe("DIV");
    expect(unsafeCard?.getAttribute("href")).toBeNull();
  });

  it("derives a domain from a safe URL", () => {
    renderSources([
      {
        title: "Domain fallback",
        url: "https://www.example.com/reference",
      },
    ]);

    expect(screen.getByText("example.com")).toBeTruthy();
  });

  it("renders the author and formatted publication date as one meta line", () => {
    renderSources([
      {
        domain: "example.com",
        title: "Dated source",
        author: "Ada Lovelace",
        publishedAt: "2025-09-16",
      },
    ]);

    expect(screen.getByText("Ada Lovelace · Sep 2025")).toBeTruthy();
  });

  it("stacks no more than three domain initials in its trigger", () => {
    const { container } = renderSources([
      { domain: "first.example", title: "First" },
      { domain: "second.example", title: "Second" },
      { domain: "third.example", title: "Third" },
      { domain: "fourth.example", title: "Fourth" },
    ]);
    const badges = container.querySelectorAll('[data-slot="sources-badge"]');

    expect(badges).toHaveLength(3);
    expect(Array.from(badges, (badge) => badge.textContent)).toEqual([
      "F",
      "S",
      "T",
    ]);
  });
});
