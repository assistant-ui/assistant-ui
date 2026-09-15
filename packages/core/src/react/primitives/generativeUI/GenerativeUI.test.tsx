import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GenerativeUIRender } from "./GenerativeUI";

const components = {
  Card: () => <span>card</span>,
};

const Fallback = ({ component }: { component: string }) => (
  <span>fallback:{component}</span>
);

describe("GenerativeUIRender", () => {
  it.each([
    "constructor",
    "valueOf",
    "hasOwnProperty",
    "__proto__",
    "toString",
  ])("uses Fallback for inherited component name %s", (component) => {
    const html = renderToStaticMarkup(
      <GenerativeUIRender
        spec={{ root: { component } }}
        components={components}
        Fallback={Fallback}
      />,
    );

    expect(html).toBe(`<span>fallback:${component}</span>`);
  });

  it.each([
    "constructor",
    "valueOf",
    "hasOwnProperty",
    "__proto__",
    "toString",
  ])(
    "throws GenerativeUIRenderError for inherited component name %s",
    (component) => {
      expect(() =>
        renderToStaticMarkup(
          <GenerativeUIRender
            spec={{ root: { component } }}
            components={components}
          />,
        ),
      ).toThrowError(
        expect.objectContaining({
          name: "GenerativeUIRenderError",
          componentName: component,
        }),
      );
    },
  );

  it("renders an explicitly registered prototype-named component", () => {
    const html = renderToStaticMarkup(
      <GenerativeUIRender
        spec={{ root: { component: "toString" } }}
        components={{ toString: () => <span>registered</span> }}
      />,
    );

    expect(html).toBe("<span>registered</span>");
  });
});
