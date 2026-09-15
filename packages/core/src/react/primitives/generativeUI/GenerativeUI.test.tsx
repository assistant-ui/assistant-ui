/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GenerativeUISpec } from "../../../types/message";
import { GenerativeUIRender } from "./GenerativeUI";

const Card = ({ children }: { children?: ReactNode }) => (
  <section>{children}</section>
);

const renderRoot = (root: unknown) =>
  render(
    <GenerativeUIRender
      spec={{ root } as GenerativeUISpec}
      components={{ Card }}
    />,
  ).container.innerHTML;

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

  it.each([
    ["a number", 42],
    ["an array-like object", { length: 1 }],
  ])("skips %s children value as a malformed node", (_label, children) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(renderRoot({ component: "Card", children })).toBe(
      "<section></section>",
    );
    expect(warn).toHaveBeenCalledWith(
      "[generative-ui] Skipping malformed node at 0/0:",
      children,
    );
  });
});
