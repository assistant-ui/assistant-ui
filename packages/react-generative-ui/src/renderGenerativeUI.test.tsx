import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import { renderGenerativeUI } from "./renderGenerativeUI";
import { buildPresentParameters } from "./buildPresentParameters";
import type { GenerativeUILibrary } from "./types";

const library: GenerativeUILibrary = {
  Card: {
    description: "A card container.",
    properties: z.object({ title: z.string() }),
    render: ({ title, children }: any) => (
      <section data-title={title}>{children}</section>
    ),
  },
  Text: {
    description: "A run of text.",
    properties: z.object({ tone: z.enum(["muted", "normal"]).optional() }),
    render: ({ tone, children }: any) => <p data-tone={tone}>{children}</p>,
  },
  Button: {
    description: "A button with its own `type` prop.",
    properties: z.object({ type: z.enum(["button", "submit"]) }),
    render: ({ type, children }: any) => (
      <button type={type}>{children}</button>
    ),
  },
  Live: {
    description: "Renders from partial props while streaming.",
    properties: z.object({ label: z.string() }),
    streamProperties: true,
    render: (props) => (
      <span data-status={props.$status}>{props.label ?? "…"}</span>
    ),
  },
};

describe("renderGenerativeUI", () => {
  it("renders a component and passes its props", () => {
    const html = renderToStaticMarkup(
      <>{renderGenerativeUI({ $type: "Text", tone: "muted" }, library)}</>,
    );
    expect(html).toBe('<p data-tone="muted"></p>');
  });

  it("renders children recursively", () => {
    const html = renderToStaticMarkup(
      <>
        {renderGenerativeUI(
          {
            $type: "Card",
            title: "Hello",
            children: [
              { $type: "Text", children: "first" },
              { $type: "Text", tone: "muted", children: "second" },
            ],
          },
          library,
        )}
      </>,
    );
    expect(html).toBe(
      '<section data-title="Hello"><p>first</p><p data-tone="muted">second</p></section>',
    );
  });

  it("passes a component's own `type` prop through without collision", () => {
    const html = renderToStaticMarkup(
      <>
        {renderGenerativeUI(
          { $type: "Button", type: "submit", children: "Go" },
          library,
        )}
      </>,
    );
    expect(html).toBe('<button type="submit">Go</button>');
  });

  it("renders a string child directly", () => {
    const html = renderToStaticMarkup(
      <>{renderGenerativeUI({ $type: "Card", children: "plain" }, library)}</>,
    );
    expect(html).toBe("<section><p></p></section>".replace("<p></p>", "plain"));
  });

  it("renders nothing for an unknown component", () => {
    const html = renderToStaticMarkup(
      <>{renderGenerativeUI({ $type: "Missing" }, library)}</>,
    );
    expect(html).toBe("");
  });

  it("renders nothing for a node without a resolved type", () => {
    const html = renderToStaticMarkup(<>{renderGenerativeUI({}, library)}</>);
    expect(html).toBe("");
  });

  it("passes the status to render and tolerates partial props while streaming", () => {
    const html = renderToStaticMarkup(
      <>
        {renderGenerativeUI({ $type: "Live" }, library, {
          status: "streaming",
        })}
      </>,
    );
    expect(html).toBe('<span data-status="streaming">…</span>');
  });

  it("gates opt-out components until their props are complete", () => {
    const streaming = renderToStaticMarkup(
      <>
        {renderGenerativeUI({ $type: "Card", title: "x" }, library, {
          status: "streaming",
        })}
      </>,
    );
    expect(streaming).toBe("");

    const done = renderToStaticMarkup(
      <>
        {renderGenerativeUI({ $type: "Card", title: "x" }, library, {
          status: "done",
        })}
      </>,
    );
    expect(done).toBe('<section data-title="x"></section>');
  });
});

describe("buildPresentParameters", () => {
  it("produces an object-rooted discriminated union over the library", () => {
    const schema = buildPresentParameters(library) as any;

    expect(schema.type).toBe("object");
    expect(schema.required).toContain("$type");
    expect(schema.properties.$type.enum).toEqual([
      "Card",
      "Text",
      "Button",
      "Live",
    ]);
    expect(schema.properties.children.$ref).toBe("#/$defs/children");

    // one branch per component, discriminated by a const `$type`.
    const consts = schema.oneOf.map((b: any) => b.properties.$type.const);
    expect(consts).toEqual(["Card", "Text", "Button", "Live"]);

    const cardBranch = schema.oneOf[0];
    expect(cardBranch.properties.title).toBeDefined();
    expect(cardBranch.required).toContain("title");

    // a component's own `type` prop lives in props, free of the discriminator.
    const buttonBranch = schema.oneOf[2];
    expect(buttonBranch.properties.type).toBeDefined();
    expect(buttonBranch.properties.$type.const).toBe("Button");

    // children recurses back into a node.
    expect(schema.$defs.children.anyOf).toContainEqual({
      $ref: "#/$defs/node",
    });
  });

  it("keeps the framework-reserved `$type` and `children` even if a component declares them", () => {
    const schema = buildPresentParameters({
      Reserved: {
        description: "Declares reserved keys that must not leak through.",
        properties: z.object({
          $type: z.number(),
          children: z.number(),
          label: z.string(),
        }),
        render: () => null,
      },
    }) as any;

    const branch = schema.oneOf[0];
    // The discriminator wins over the author's `$type`, and the author's
    // `children` is dropped (the root `children` $ref owns that slot).
    expect(branch.properties.$type).toEqual({
      const: "Reserved",
      description: "Declares reserved keys that must not leak through.",
    });
    expect(branch.properties.children).toBeUndefined();
    expect(branch.properties.label).toBeDefined();
    expect(branch.required).not.toContain("children");
    expect(branch.required).not.toContain("$type");
  });

  it("throws when a component's properties is not an object schema", () => {
    expect(() =>
      buildPresentParameters({
        Bad: {
          description: "Non-object props.",
          properties: z.string() as never,
          render: () => null,
        },
      }),
    ).toThrow(/must be an object schema/);
  });
});
