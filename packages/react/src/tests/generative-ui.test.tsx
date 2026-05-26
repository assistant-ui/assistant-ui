import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GenerativeUIRender,
  GenerativeUIRenderError,
  type GenerativeUISpec,
} from "../index";

const Card = ({ title, children }: any) => (
  <div data-component="Card">
    <h3>{title}</h3>
    {children}
  </div>
);
const Button = ({ label }: any) => (
  <button type="button" data-component="Button">
    {label}
  </button>
);

describe("MessagePrimitive.GenerativeUI (same-realm renderer)", () => {
  it("renders a flat tree with allowlisted components", () => {
    const spec: GenerativeUISpec = {
      root: {
        component: "Card",
        props: { title: "Hello" },
        children: [{ component: "Button", props: { label: "Click me" } }],
      },
    };

    const out = renderToStaticMarkup(
      <GenerativeUIRender spec={spec} components={{ Card, Button }} />,
    );

    expect(out).toContain('data-component="Card"');
    expect(out).toContain("<h3>Hello</h3>");
    expect(out).toContain('data-component="Button"');
    expect(out).toContain("Click me");
  });

  it("renders an array root", () => {
    const spec: GenerativeUISpec = {
      root: [
        { component: "Card", props: { title: "A" } },
        { component: "Card", props: { title: "B" } },
      ],
    };
    const out = renderToStaticMarkup(
      <GenerativeUIRender spec={spec} components={{ Card }} />,
    );
    expect(out).toContain("<h3>A</h3>");
    expect(out).toContain("<h3>B</h3>");
  });

  it("renders string children inline", () => {
    const spec: GenerativeUISpec = {
      root: {
        component: "Card",
        props: { title: "T" },
        children: ["hello ", "world"],
      },
    };
    const out = renderToStaticMarkup(
      <GenerativeUIRender spec={spec} components={{ Card }} />,
    );
    expect(out).toContain("hello world");
  });

  it("throws GenerativeUIRenderError for unknown components", () => {
    const spec: GenerativeUISpec = {
      root: { component: "NotAllowed", props: {} },
    };

    expect(() =>
      renderToStaticMarkup(
        <GenerativeUIRender spec={spec} components={{ Card }} />,
      ),
    ).toThrow(GenerativeUIRenderError);
  });

  it("uses Fallback when provided for unknown components", () => {
    const spec: GenerativeUISpec = {
      root: { component: "NotAllowed", props: { foo: 1 } },
    };
    const Fallback = ({ component }: any) => (
      <span data-fallback={component}>missing</span>
    );

    const out = renderToStaticMarkup(
      <GenerativeUIRender
        spec={spec}
        components={{ Card }}
        Fallback={Fallback}
      />,
    );
    expect(out).toContain('data-fallback="NotAllowed"');
    expect(out).toContain("missing");
  });

  it("handles empty / partial specs gracefully (stream-friendly)", () => {
    const out1 = renderToStaticMarkup(
      <GenerativeUIRender spec={{ root: [] }} components={{ Card }} />,
    );
    expect(out1).toBe("");

    // Partial spec — top-level component resolved but no children yet.
    const out2 = renderToStaticMarkup(
      <GenerativeUIRender
        spec={{ root: { component: "Card", props: { title: "loading" } } }}
        components={{ Card }}
      />,
    );
    expect(out2).toContain("<h3>loading</h3>");
  });

  it("respects user-provided keys", () => {
    const spec: GenerativeUISpec = {
      root: [
        { component: "Card", props: { title: "x" }, key: "stable-1" },
        { component: "Card", props: { title: "y" }, key: "stable-2" },
      ],
    };
    expect(() =>
      renderToStaticMarkup(
        <GenerativeUIRender spec={spec} components={{ Card }} />,
      ),
    ).not.toThrow();
  });

  it("is a typed error subclass with the offending component name", () => {
    try {
      renderToStaticMarkup(
        <GenerativeUIRender
          spec={{ root: { component: "Bad" } }}
          components={{ Card }}
        />,
      );
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(GenerativeUIRenderError);
      expect((e as GenerativeUIRenderError).componentName).toBe("Bad");
      expect((e as Error).name).toBe("GenerativeUIRenderError");
    }
  });
});
