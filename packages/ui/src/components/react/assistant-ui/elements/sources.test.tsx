import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Sources, type Source, type SourcesProps } from "./sources";

afterEach(cleanup);

const renderSources = (
  sources: readonly Source[],
  layout?: SourcesProps["layout"],
) =>
  render(
    <Sources sources={sources} open onOpenChange={() => {}} layout={layout} />,
  );

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

  it("falls back to en-US when Intl rejects the locale", () => {
    render(
      <Sources
        sources={[
          {
            domain: "example.com",
            title: "Dated source",
            publishedAt: "2025-09-16",
          },
        ]}
        open
        onOpenChange={() => {}}
        locale="en_US"
      />,
    );

    expect(screen.getByText("Sep 2025")).toBeTruthy();
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

  it("keeps safe links, snippets and dates in the compact list layout", () => {
    const { container } = renderSources(
      [
        {
          title: "Safe citation",
          url: "https://example.com/source",
          snippet: "Reference excerpt",
          author: "Ada",
          publishedAt: "2025-09-16",
        },
        { title: "Unsafe citation", url: "javascript:alert(1)" },
      ],
      "list",
    );

    expect(
      container
        .querySelector('[data-slot="sources"]')
        ?.getAttribute("data-layout"),
    ).toBe("list");
    expect(
      container.querySelectorAll('[data-slot="source-card"]'),
    ).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: /Safe citation/ }).getAttribute("href"),
    ).toBe("https://example.com/source");
    expect(screen.getByText("example.com")).toBeTruthy();
    expect(screen.getByText("Reference excerpt")).toBeTruthy();
    expect(screen.getByText("Ada · Sep 2025")).toBeTruthy();
    expect(
      screen.getByText("Unsafe citation").closest('[data-slot="source-card"]')
        ?.tagName,
    ).toBe("DIV");
  });
});
