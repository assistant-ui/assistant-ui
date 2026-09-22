import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Sources, SourceGlyph, type Source } from "./sources";

afterEach(cleanup);

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
    const domain = screen.getByText(longSource[0]!.domain);
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

  it("omits the trigger button when hideTrigger is set, still rendering the panel content", () => {
    render(
      <Sources sources={SOURCES} open onOpenChange={() => {}} hideTrigger />,
    );

    expect(screen.queryByRole("button", { name: /Sources/ })).toBeNull();
    expect(screen.getByText("Runtime drafts API")).toBeTruthy();
    expect(screen.getByText("assistant-ui.com")).toBeTruthy();
  });
});

describe("SourceGlyph", () => {
  it("renders the domain's first letter, uppercased, standalone", () => {
    render(<SourceGlyph domain="wikipedia.org" />);

    expect(screen.getByText("W")).toBeTruthy();
  });
});
