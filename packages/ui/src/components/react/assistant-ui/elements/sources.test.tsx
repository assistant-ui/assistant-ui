import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ComponentProps } from "react";

import { Sources, type Source } from "./sources";

const sources: Source[] = [
  { domain: "example.com", title: "Example article" },
  { domain: "react.dev", title: "React documentation" },
];

afterEach(cleanup);

const renderSources = (props: Partial<ComponentProps<typeof Sources>> = {}) =>
  render(<Sources sources={sources} open onOpenChange={() => {}} {...props} />);

describe("Sources", () => {
  it("keeps the card grid as the default layout", () => {
    const { container } = renderSources();

    expect(container.querySelector(".grid-cols-2")).not.toBeNull();
    expect(
      container.querySelectorAll('[data-slot="source-card"]'),
    ).toHaveLength(sources.length);
    expect(container.querySelector('[data-slot="source-list"]')).toBeNull();
  });

  it("renders list sources in glyph, title, and domain order", () => {
    const { container } = renderSources({ layout: "list" });
    const items = container.querySelectorAll('[data-slot="source-list-item"]');

    expect(items).toHaveLength(sources.length);
    expect(
      Array.from(items[0]!.children).map((child) => child.textContent),
    ).toEqual(["E", "Example article", "example.com"]);
    expect(
      Array.from(items[1]!.children).map((child) => child.textContent),
    ).toEqual(["R", "React documentation", "react.dev"]);
  });

  it("keeps repeated domains as separate list rows", () => {
    const repeatedSources: Source[] = [
      { domain: "example.com", title: "First article" },
      { domain: "example.com", title: "Second article" },
    ];
    const { container } = renderSources({
      sources: repeatedSources,
      layout: "list",
    });

    const items = container.querySelectorAll('[data-slot="source-list-item"]');
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain("First article");
    expect(items[1]!.textContent).toContain("Second article");
  });
});
