/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GenerativeUISpec } from "../../../types/message";
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
