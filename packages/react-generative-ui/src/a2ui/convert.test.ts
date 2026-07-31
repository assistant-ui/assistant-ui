import { describe, expect, it } from "vitest";
import type { UIElement } from "../ir";
import { convertSurfaceToUISpec } from "./convert";
import { applyA2uiOperations } from "./reducer";
import type { A2uiSurfaceState } from "./types";

const surfaceFrom = (
  components: readonly Record<string, unknown>[],
  dataModel: unknown = {},
): A2uiSurfaceState => ({
  components: new Map(
    components.map((component) => [
      component["id"] as string,
      { ...component },
    ]),
  ),
  dataModel,
});

describe("convertSurfaceToUISpec", () => {
  it("converts an operation-built A2UI surface to the exact canonical UISpec", () => {
    const result = applyA2uiOperations(new Map(), [
      {
        version: "v0.9",
        createSurface: { surfaceId: "main" },
      },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "main",
          components: [
            {
              id: "root",
              component: "Column",
              gap: 2,
              children: [
                "heading",
                "body",
                "caption",
                "image",
                "row",
                "card",
                "divider",
                "button",
                "field",
                "checkbox",
              ],
            },
            {
              id: "heading",
              component: "Text",
              variant: "h1",
              text: { path: "/title" },
            },
            {
              id: "body",
              component: "Text",
              text: { path: "/body" },
            },
            {
              id: "caption",
              component: "Text",
              variant: "caption",
              text: "Fine print",
            },
            {
              id: "image",
              component: "Image",
              url: { path: "/imageUrl" },
              altText: "Preview",
            },
            {
              id: "row",
              component: "Row",
              gap: 1,
              align: "center",
              justify: "between",
              children: ["rowText"],
            },
            {
              id: "rowText",
              component: "Text",
              text: "Inside row",
            },
            {
              id: "card",
              component: "Card",
              title: "Details",
              padding: 3,
            },
            { id: "divider", component: "Divider", flush: true },
            {
              id: "button",
              component: "Button",
              label: "Open",
              action: {
                name: "open",
                context: {
                  ticketId: { path: "/ticketId" },
                  literal: "kept",
                  missing: { path: "/missing" },
                },
              },
            },
            {
              id: "field",
              component: "TextField",
              label: "Email",
              placeholder: "you@example.com",
              text: { path: "/form/email" },
            },
            {
              id: "checkbox",
              component: "CheckBox",
              label: "Accepted",
              value: { path: "/form/accepted" },
            },
          ],
        },
      },
      {
        version: "v0.9",
        updateDataModel: {
          surfaceId: "main",
          data: {
            title: "Welcome",
            body: "**Hello**",
            imageUrl: "https://example.com/image.png",
            ticketId: "ticket-1",
            form: { email: "ada@example.com", accepted: true },
          },
        },
      },
    ]);
    const surface = result.state.get("main");
    expect(surface).toBeDefined();

    const converted = convertSurfaceToUISpec(surface!);

    expect(converted.warnings).toEqual([]);
    expect(converted.spec).toEqual({
      $type: "Col",
      gap: 2,
      children: [
        { $type: "Header", text: "Welcome" },
        { $type: "Markdown", value: "**Hello**" },
        { $type: "Caption", value: "Fine print" },
        {
          $type: "Image",
          src: "https://example.com/image.png",
          alt: "Preview",
        },
        {
          $type: "Row",
          gap: 1,
          align: "center",
          justify: "between",
          children: [{ $type: "Markdown", value: "Inside row" }],
        },
        { $type: "Card", title: "Details", padding: 3 },
        { $type: "Divider", flush: true },
        {
          $type: "Button",
          label: "Open",
          $action: {
            type: "a2ui:action",
            name: "open",
            surfaceId: "main",
            sourceComponentId: "button",
            context: { ticketId: "ticket-1", literal: "kept" },
          },
        },
        {
          $type: "Input",
          label: "Email",
          placeholder: "you@example.com",
          name: "email",
        },
        {
          $type: "Checkbox",
          label: "Accepted",
          name: "accepted",
          defaultChecked: true,
        },
      ],
    });
  });

  it("drops an unresolvable bound prop without throwing", () => {
    const surface = surfaceFrom([
      {
        id: "root",
        component: "Text",
        text: { path: "/missing" },
      },
    ]);

    expect(convertSurfaceToUISpec(surface)).toEqual({
      spec: { $type: "Markdown" },
      warnings: [],
    });
  });

  it("expands template children relative to each bound item", () => {
    const surface = surfaceFrom(
      [
        {
          id: "root",
          component: "Column",
          children: {
            template: { componentId: "item", path: "/items" },
          },
        },
        {
          id: "item",
          component: "Text",
          text: { path: "/name" },
        },
      ],
      { items: [{ name: "one" }, { name: "two" }] },
    );

    expect(convertSurfaceToUISpec(surface)).toEqual({
      spec: {
        $type: "ListView",
        children: [
          {
            $type: "ListViewItem",
            children: { $type: "Markdown", value: "one" },
          },
          {
            $type: "ListViewItem",
            children: { $type: "Markdown", value: "two" },
          },
        ],
      },
      warnings: [],
    });
  });

  it("caps template expansion at 100 items", () => {
    const surface = surfaceFrom(
      [
        {
          id: "root",
          component: "Column",
          children: {
            template: { componentId: "item", path: "/items" },
          },
        },
        {
          id: "item",
          component: "Text",
          text: { path: "/" },
        },
      ],
      { items: Array.from({ length: 101 }, (_, index) => `item-${index}`) },
    );

    const result = convertSurfaceToUISpec(surface);
    expect((result.spec as UIElement).children).toHaveLength(100);
    expect(result.warnings).toContain(
      "A2UI template expansion was capped at 100 items.",
    );
  });

  it("truncates a component cycle", () => {
    const surface = surfaceFrom([
      {
        id: "root",
        component: "Row",
        children: ["root"],
      },
    ]);

    expect(convertSurfaceToUISpec(surface)).toEqual({
      spec: { $type: "Row" },
      warnings: ['A2UI component cycle detected at "root".'],
    });
  });

  it("truncates component resolution at depth 32", () => {
    const components = Array.from({ length: 34 }, (_, index) => ({
      id: index === 0 ? "root" : `node-${index}`,
      component: "Row",
      ...(index < 33
        ? { children: [index === 0 ? "node-1" : `node-${index + 1}`] }
        : {}),
    }));
    const result = convertSurfaceToUISpec(surfaceFrom(components));
    let node = result.spec as UIElement;
    let count = 1;
    while (Array.isArray(node.children) && node.children.length > 0) {
      node = node.children[0] as UIElement;
      count++;
    }

    expect(count).toBe(32);
    expect(result.warnings).toContain("A2UI depth cap of 32 was reached.");
  });

  it("enforces the total emitted node budget", () => {
    const childCount = 5001;
    const components = [
      {
        id: "root",
        component: "Row",
        children: Array.from(
          { length: childCount },
          (_, index) => `child-${index}`,
        ),
      },
      ...Array.from({ length: childCount }, (_, index) => ({
        id: `child-${index}`,
        component: "Divider",
      })),
    ];
    const result = convertSurfaceToUISpec(surfaceFrom(components));

    expect((result.spec as UIElement).children).toHaveLength(4999);
    expect(result.warnings).toContain("A2UI node budget of 5000 was reached.");
  });

  it("skips an unknown component with a warning naming it", () => {
    const result = convertSurfaceToUISpec(
      surfaceFrom([{ id: "root", component: "VideoPlayer" }]),
    );

    expect(result.spec).toBeNull();
    expect(result.warnings).toEqual([
      'Unknown A2UI component "VideoPlayer" was skipped.',
    ]);
  });

  it("returns null with a warning when root is missing", () => {
    expect(
      convertSurfaceToUISpec(
        surfaceFrom([{ id: "other", component: "Divider" }]),
      ),
    ).toEqual({
      spec: null,
      warnings: ['A2UI root component "root" was not found.'],
    });
  });
});
