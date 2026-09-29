/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  GenerativeUINode,
  GenerativeUISpec,
} from "../../../types/message";
import type { GenerativeUIRenderProps } from "../../types/MessagePartComponentTypes";
import { GenerativeUIRender, GenerativeUIRenderError } from "./GenerativeUI";

const Card = ({ children }: { children?: ReactNode }) => (
  <section>{children}</section>
);

const Fallback = ({ component }: { component: string }) => <i>{component}</i>;

const inheritedNames = [
  "constructor",
  "hasOwnProperty",
  "isPrototypeOf",
  "toLocaleString",
  "toString",
  "valueOf",
  "__proto__",
];

const renderRoot = (
  root: unknown,
  props: Partial<Pick<GenerativeUIRenderProps, "components" | "Fallback">> = {},
) =>
  render(
    <GenerativeUIRender
      spec={{ root } as GenerativeUISpec}
      components={{ Card }}
      {...props}
    />,
  ).container.innerHTML;

const thrownBy = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
};

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
        children: ["Count: ", [42, { component: "Card", children: [7] }]],
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
        spec={{
          root: { component: "Card", children: [nodes] },
        }}
        components={{ Card, StatefulCard }}
      />,
    );

    expect(view.container.textContent).toBe("A:1B:2");
    view.rerender(
      <GenerativeUIRender
        spec={{
          root: {
            component: "Card",
            children: [[nodes[1]!, nodes[0]!]],
          },
        }}
        components={{ Card, StatefulCard }}
      />,
    );
    expect(view.container.textContent).toBe("B:2A:1");
  });

  it("stops rendering arrays beyond the recursion limit", () => {
    let root: GenerativeUINode = "too deep";
    for (let depth = 0; depth < 66; depth += 1) root = [root];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(renderRoot(root)).toBe("");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "[generative-ui] Skipping node nested past 64 levels at 0/",
      ),
    );
  });

  it("skips an array-like object children value as a malformed node", () => {
    const children = { length: 1 };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(renderRoot({ component: "Card", children })).toBe(
      "<section></section>",
    );
    expect(warn).toHaveBeenCalledWith(
      "[generative-ui] Skipping malformed node at 0/0:",
      children,
    );
  });

  it.each(inheritedNames)(
    "renders Fallback for the inherited name %s",
    (component) => {
      expect(renderRoot({ component }, { Fallback })).toBe(
        `<i>${component}</i>`,
      );
    },
  );

  it.each(inheritedNames)(
    "throws GenerativeUIRenderError for the inherited name %s",
    (component) => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      const error = thrownBy(() => renderRoot({ component }));

      expect(error).toBeInstanceOf(GenerativeUIRenderError);
      expect((error as GenerativeUIRenderError).componentName).toBe(component);
    },
  );

  it("renders a component registered under an inherited name", () => {
    expect(
      renderRoot(
        { component: "toString", children: "Sunny" },
        { components: { toString: Card } },
      ),
    ).toBe("<section>Sunny</section>");
  });
});
