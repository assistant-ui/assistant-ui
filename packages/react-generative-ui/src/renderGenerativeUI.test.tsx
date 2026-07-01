import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { isValidElement, type ReactElement } from "react";
import { parsePartialJsonObject } from "assistant-stream/utils";
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

  it("uses stable $key for array items and keeps the positional fallback", () => {
    const out = renderGenerativeUI(
      [
        { $type: "Text", $key: "1:Text", children: "first" },
        { $type: "Text", children: "second" },
        "plain",
        { $type: "Text", $key: { id: "bad" }, children: "bad key" },
      ],
      library,
    );

    expect(Array.isArray(out)).toBe(true);
    const elements = out as ReactElement[];
    expect(elements.every(isValidElement)).toBe(true);
    expect(elements.map((element) => element.key)).toEqual([
      "model:1:Text",
      "1:Text",
      "2:#text",
      "3:Text",
    ]);
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

  it("holds back a node whose `$type` is still streaming", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      for (const argsText of ['{"$type": "', '{"$type": "Tex']) {
        const html = renderToStaticMarkup(
          <>
            {renderGenerativeUI(parsePartialJsonObject(argsText), library, {
              status: "streaming",
            })}
          </>,
        );
        expect(html).toBe("");
      }
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it("renders completed siblings while a nested `$type` streams", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const args = parsePartialJsonObject(
        '{"$type": "Live", "label": "hi", "children": [{"$type": "Liv',
      );
      const html = renderToStaticMarkup(
        <>{renderGenerativeUI(args, library, { status: "streaming" })}</>,
      );
      expect(html).toBe('<span data-status="streaming">hi</span>');
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it("renders nothing for a node without a resolved type", () => {
    const html = renderToStaticMarkup(<>{renderGenerativeUI({}, library)}</>);
    expect(html).toBe("");
  });

  it("bounds deeply nested trees instead of overflowing the stack", () => {
    let node: any = { $type: "Text", children: "deep" };
    for (let i = 0; i < 5000; i++) node = { $type: "Card", children: node };
    expect(() =>
      renderToStaticMarkup(<>{renderGenerativeUI(node, library)}</>),
    ).not.toThrow();
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
  it("produces a flat object schema with no top-level oneOf/anyOf", () => {
    const schema = buildPresentParameters(library) as any;

    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(["$type"]);
    // Tool/function-call schemas reject these at the top level.
    expect(schema.oneOf).toBeUndefined();
    expect(schema.anyOf).toBeUndefined();

    expect(schema.properties.$type.enum).toEqual([
      "Card",
      "Text",
      "Button",
      "Live",
    ]);
    // each component's description rides along on the $type enum.
    expect(schema.properties.$type.description).toContain("Card");
    expect(schema.properties.$key).toEqual({
      description:
        "Stable identity for this UI node. Use it for list items that may reorder.",
      anyOf: [{ type: "string" }, { type: "number" }],
    });
    expect(schema.properties.children.$ref).toBe("#/$defs/children");

    // every component's props are merged into the one flat property bag.
    expect(schema.properties.title).toBeDefined(); // Card
    expect(schema.properties.tone).toBeDefined(); // Text
    expect(schema.properties.type).toBeDefined(); // Button's own `type` prop
    expect(schema.properties.label).toBeDefined(); // Live

    // children recurses back into a node.
    expect(schema.$defs.children.anyOf).toContainEqual({
      $ref: "#/$defs/node",
    });
    expect(schema.$defs.node.type).toBe("object");
    expect(schema.$defs.node.oneOf).toBeUndefined();
  });

  it("drops author-declared `$type`/`$key`/`children` and keeps the framework fields", () => {
    const schema = buildPresentParameters({
      Reserved: {
        description: "Declares reserved keys that must not leak through.",
        properties: z.object({
          $type: z.number(),
          $key: z.boolean(),
          children: z.number(),
          label: z.string(),
        }),
        render: () => null,
      },
    }) as any;

    // The discriminator is the framework enum, not the author's `$type`; the
    // author's `$key`/`children` are dropped in favor of framework fields.
    expect(schema.properties.$type.enum).toEqual(["Reserved"]);
    expect(schema.properties.$key).toEqual({
      description:
        "Stable identity for this UI node. Use it for list items that may reorder.",
      anyOf: [{ type: "string" }, { type: "number" }],
    });
    expect(schema.properties.children.$ref).toBe("#/$defs/children");
    expect(schema.properties.label).toBeDefined();
    expect(schema.required).toEqual(["$type"]);
  });

  it("names every component that declares the same prop in the dev warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      buildPresentParameters({
        Select: {
          description: "Selects an option.",
          properties: z.object({ value: z.string() }),
          render: () => null,
        },
        DatePicker: {
          description: "Picks a date.",
          properties: z.object({ value: z.string() }),
          render: () => null,
        },
        Combobox: {
          description: "Chooses from filtered options.",
          properties: z.object({ value: z.string() }),
          render: () => null,
        },
      });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        '[@assistant-ui/react-generative-ui] Prop "value" is declared by "Select", "DatePicker", and "Combobox"; keeping "Select"\'s schema. Rename or align the prop type to avoid an ambiguous schema.',
      );
    } finally {
      warn.mockRestore();
    }
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
