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
});

const SOURCES: Source[] = [
  { domain: "assistant-ui.com", title: "Runtime drafts API" },
  { domain: "react.dev", title: "You might not need an effect" },
];

describe("Sources", () => {
  it("renders the default grid layout with each source's domain and title", () => {
    const { container } = render(
      <Sources sources={SOURCES} open onOpenChange={() => {}} />,
    );

    expect(container.querySelector('[data-slot="sources-list"]')).toBeNull();
    expect(screen.getByText("Runtime drafts API")).toBeTruthy();
    expect(screen.getByText("assistant-ui.com")).toBeTruthy();
    expect(screen.getByText("You might not need an effect")).toBeTruthy();
    expect(screen.getByText("react.dev")).toBeTruthy();
  });

  it('renders one compact row per source when layout is "list"', () => {
    const { container } = render(
      <Sources sources={SOURCES} open onOpenChange={() => {}} layout="list" />,
    );

    const list = container.querySelector('[data-slot="sources-list"]');
    expect(list).toBeTruthy();
    expect(list?.children).toHaveLength(SOURCES.length);
    expect(screen.getByText("Runtime drafts API")).toBeTruthy();
    expect(screen.getByText("assistant-ui.com")).toBeTruthy();
  });

  it("keeps two rows for two different pages on the same domain, both layouts", () => {
    const duplicateDomain: Source[] = [
      { domain: "wikipedia.org", title: "First article" },
      { domain: "wikipedia.org", title: "Second article" },
    ];

    const grid = render(
      <Sources sources={duplicateDomain} open onOpenChange={() => {}} />,
    );
    expect(screen.getByText("First article")).toBeTruthy();
    expect(screen.getByText("Second article")).toBeTruthy();
    expect(screen.getAllByText("wikipedia.org")).toHaveLength(2);
    grid.unmount();

    render(
      <Sources
        sources={duplicateDomain}
        open
        onOpenChange={() => {}}
        layout="list"
      />,
    );
    expect(screen.getByText("First article")).toBeTruthy();
    expect(screen.getByText("Second article")).toBeTruthy();
    expect(screen.getAllByText("wikipedia.org")).toHaveLength(2);
  });

  it("shrinks and truncates a long title alongside a long domain in the list layout, instead of overflowing", () => {
    const longSource: Source[] = [
      {
        domain: "an-unusually-long-subdomain-for-a-source.example.com",
        title:
          "A title long enough that, combined with the domain above, would overflow a narrow row if neither text span could shrink",
      },
    ];

    render(
      <Sources
        sources={longSource}
        open
        onOpenChange={() => {}}
        layout="list"
      />,
    );

    const title = screen.getByText(longSource[0]!.title);
    const domain = screen.getByText(longSource[0]!.domain!);
    expect(title.className).toContain("min-w-0");
    expect(title.className).toContain("flex-1");
    expect(title.className).toContain("truncate");
    expect(domain.className).toContain("min-w-0");
    expect(domain.className).toContain("max-w-[40%]");
    expect(domain.className).toContain("truncate");
  });

  it("stays collapsed until the trigger is expanded", () => {
    render(<Sources sources={SOURCES} open={false} onOpenChange={() => {}} />);

    expect(screen.getByRole("button", { name: /Sources/ })).toBeTruthy();
    expect(screen.queryByText("Runtime drafts API")).toBeNull();
  });
});

it("preserves safe links, snippets and dated metadata in the list layout", () => {
  render(
    <Sources
      sources={[
        {
          title: "Safe citation",
          url: "https://example.com/source",
          snippet: "Reference excerpt",
          author: "Ada",
          publishedAt: "2025-09-16",
        },
        { title: "Unsafe citation", url: "javascript:alert(1)" },
      ]}
      open
      onOpenChange={() => {}}
      layout="list"
    />,
  );
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
