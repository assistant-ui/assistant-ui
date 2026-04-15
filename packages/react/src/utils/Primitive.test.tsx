import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Primitive, withRenderProp } from "./Primitive";

const ALL_NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul",
] as const;

// Void elements cannot have children
const VOID_ELEMENTS = new Set(["img", "input"]);

describe("Primitive", () => {
  describe.each(ALL_NODES)("Primitive.%s", (node) => {
    const Comp = Primitive[node];

    it("renders the correct HTML tag", () => {
      const html = VOID_ELEMENTS.has(node)
        ? renderToStaticMarkup(<Comp />)
        : renderToStaticMarkup(<Comp>content</Comp>);

      expect(html).toMatch(new RegExp(`^<${node}[\\s/>]`));
    });

    it("renders the render element instead of the default tag", () => {
      // Use <i> as render target — it won't collide with any Primitive node name
      const html = VOID_ELEMENTS.has(node)
        ? renderToStaticMarkup(<Comp render={<i data-test="yes" />} />)
        : renderToStaticMarkup(
            <Comp render={<i data-test="yes" />}>content</Comp>,
          );

      expect(html).toContain("<i");
      expect(html).toContain('data-test="yes"');
      expect(html).not.toMatch(new RegExp(`<${node}[\\s>]`));
    });

    if (!VOID_ELEMENTS.has(node)) {
      it("render produces same markup as asChild", () => {
        const renderHtml = renderToStaticMarkup(
          <Comp render={<i className="child" />} className="parent">
            text
          </Comp>,
        );

        const asChildHtml = renderToStaticMarkup(
          <Comp asChild className="parent">
            <i className="child">text</i>
          </Comp>,
        );

        expect(renderHtml).toBe(asChildHtml);
      });
    }
  });

  describe("render prop edge cases", () => {
    it("preserves a useful displayName on wrapped components", () => {
      const Wrapped = withRenderProp(Primitive.div);

      expect(Wrapped.displayName).toBe("Primitive.div");
    });

    it("uses render element's own children as fallback", () => {
      const html = renderToStaticMarkup(
        <Primitive.span render={<em>Fallback</em>} />,
      );
      expect(html).toBe("<em>Fallback</em>");
    });

    it("outer children override render element's children", () => {
      const html = renderToStaticMarkup(
        <Primitive.span render={<em>Original</em>}>Override</Primitive.span>,
      );
      expect(html).toBe("<em>Override</em>");
    });

    it("passes multiple children into the render element", () => {
      const html = renderToStaticMarkup(
        <Primitive.div render={<section />}>
          <p>A</p>
          <p>B</p>
        </Primitive.div>,
      );
      expect(html).toContain("<section");
      expect(html).toContain("<p>A</p>");
      expect(html).toContain("<p>B</p>");
    });
  });
});
