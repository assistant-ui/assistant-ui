/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  GenerativeUINode,
  GenerativeUISpec,
} from "../../../types/message";
import { GenerativeUIRender } from "./GenerativeUI";

const Card = ({ children }: { children?: ReactNode }) => (
  <section>{children}</section>
);

const renderRoot = (root: GenerativeUISpec["root"]) =>
  render(<GenerativeUIRender spec={{ root }} components={{ Card }} />).container
    .innerHTML;

describe("GenerativeUIRender", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a string children value as the only child", () => {
    expect(renderRoot({ component: "Card", children: "Sunny" })).toBe(
      "<section>Sunny</section>",
    );
  });

  it("renders a node children value as the only child", () => {
    expect(
      renderRoot({
        component: "Card",
        children: { component: "Card", children: ["Sunny"] },
      }),
    ).toBe("<section><section>Sunny</section></section>");
  });

  it("renders number leaves and nested arrays recursively", () => {
    expect(
      renderRoot({
        component: "Card",
        children: ["Count: ", [42, { component: "Card", children: 7 }]],
      }),
    ).toBe("<section>Count: 42<section>7</section></section>");
  });

  it("skips an array-like object children value as a malformed node", () => {
    const children = { length: 1 };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      renderRoot({
        component: "Card",
        children: children as unknown as GenerativeUINode,
      }),
    ).toBe("<section></section>");
    expect(warn).toHaveBeenCalledWith(
      "[generative-ui] Skipping malformed node at 0/0:",
      children,
    );
  });
});
