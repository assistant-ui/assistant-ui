/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { type ReactNode, useState } from "react";
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
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      renderRoot({
        component: "Card",
        children: ["Count: ", [42, { component: "Card", children: 7 }]],
      }),
    ).toBe("<section>Count: 42<section>7</section></section>");
    expect(error).not.toHaveBeenCalled();
  });

  it("preserves keyed component identity when nested arrays reorder", () => {
    let nextInstance = 0;
    const StatefulCard = ({ label }: { label?: string }) => {
      const [instance] = useState(() => ++nextInstance);
      return <span>{`${label}:${instance}`}</span>;
    };
    const nodes = [
      { component: "StatefulCard", key: "a", props: { label: "A" } },
      { component: "StatefulCard", key: "b", props: { label: "B" } },
    ] satisfies readonly GenerativeUINode[];
    const view = render(
      <GenerativeUIRender
        spec={{ root: nodes }}
        components={{ StatefulCard }}
      />,
    );

    expect(view.container.textContent).toBe("A:1B:2");
    view.rerender(
      <GenerativeUIRender
        spec={{ root: [nodes[1]!, nodes[0]!] }}
        components={{ StatefulCard }}
      />,
    );
    expect(view.container.textContent).toBe("B:2A:1");
  });

  it("stops rendering arrays beyond the recursion limit", () => {
    let root: GenerativeUINode = "too deep";
    for (let depth = 0; depth < 66; depth += 1) root = [root];

    expect(renderRoot(root)).toBe("");
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
