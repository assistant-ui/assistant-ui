import { describe, expect, it } from "vitest";
import type { UIElement } from "../ir";
import { convertSurfaceToUISpec } from "./convert";
import { applyA2uiOperations } from "./reducer";
import { surfaceToOperations } from "./snapshot";
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
  it("replays a surface with bindings, templates, and custom components", () => {
    const initial = applyA2uiOperations(new Map(), [
      {
        version: "v0.9",
        createSurface: { surfaceId: "replay", catalogId: "basic" },
      },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "replay",
          components: [
            {
              id: "root",
              component: "Column",
              children: ["items", "custom"],
            },
            {
              id: "items",
              component: "List",
              children: {
                template: { componentId: "item", path: "/items" },
              },
            },
            {
              id: "item",
              component: "Text",
              text: { path: "/name" },
            },
            {
              id: "custom",
              component: "StatusPill",
              label: { path: "/status" },
            },
          ],
        },
      },
      {
        version: "v0.9",
        updateDataModel: {
          surfaceId: "replay",
          contents: {
            status: "ready",
            items: [{ name: "one" }, { name: "two" }],
          },
        },
      },
    ]);
    const surface = initial.state.get("replay");
    expect(surface).toBeDefined();

    const operations = surfaceToOperations(surface!);
    const replayed = applyA2uiOperations(
      new Map(),
      JSON.parse(JSON.stringify(operations)),
    );
    const replayedSurface = replayed.state.get("replay");

    expect(operations).toEqual([
      {
        version: "v0.9",
        createSurface: { surfaceId: "replay", catalogId: "basic" },
      },
      expect.objectContaining({
        version: "v0.9",
        updateComponents: expect.objectContaining({ surfaceId: "replay" }),
      }),
      {
        version: "v0.9",
        updateDataModel: expect.objectContaining({
          surfaceId: "replay",
          path: "/",
        }),
      },
    ]);
    expect(replayed.warnings).toEqual([]);
    expect(replayedSurface).toMatchObject({
      catalogId: "basic",
      dataModel: surface!.dataModel,
    });
    expect([...replayedSurface!.components.entries()]).toEqual([
      ...surface!.components.entries(),
    ]);
    expect(convertSurfaceToUISpec(replayedSurface!)).toEqual(
      convertSurfaceToUISpec(surface!),
    );
  });

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

  it("maps basic catalog icons, lists, choice pickers, and date inputs", () => {
    const surface = surfaceFrom(
      [
        {
          id: "root",
          component: "Column",
          children: ["icon", "list", "horizontal", "select", "radio", "date"],
        },
        { id: "icon", component: "Icon", name: "calendar", size: "lg" },
        {
          id: "list",
          component: "List",
          children: ["list-item"],
        },
        { id: "list-item", component: "Text", text: "Vertical item" },
        {
          id: "horizontal",
          component: "List",
          direction: "horizontal",
          align: "center",
          children: ["horizontal-item"],
        },
        {
          id: "horizontal-item",
          component: "Text",
          text: "Horizontal item",
        },
        {
          id: "select",
          component: "ChoicePicker",
          label: "Delivery",
          placeholder: "Choose delivery",
          variant: "multipleSelection",
          value: { path: "/form/delivery" },
          options: [
            { label: { path: "/labels/express" }, value: "express" },
            { label: "Standard", value: "standard" },
          ],
        },
        {
          id: "radio",
          component: "ChoicePicker",
          label: "Plan",
          variant: "mutuallyExclusive",
          value: { path: "/form/plan" },
          options: [
            { label: "Free", value: "free" },
            { label: "Pro", value: "pro" },
          ],
        },
        {
          id: "date",
          component: "DateTimeInput",
          label: "Start date",
          value: { path: "/form/startDate" },
          min: "2026-01-01",
          max: "2026-12-31",
        },
      ],
      {
        labels: { express: "Express" },
        form: {
          delivery: ["express"],
          plan: "pro",
          startDate: "2026-06-01",
        },
      },
    );

    expect(convertSurfaceToUISpec(surface)).toEqual({
      spec: {
        $type: "Col",
        children: [
          { $type: "Icon", name: "calendar", size: "lg" },
          {
            $type: "ListView",
            children: [
              {
                $type: "ListViewItem",
                children: { $type: "Markdown", value: "Vertical item" },
              },
            ],
          },
          {
            $type: "Row",
            align: "center",
            children: [{ $type: "Markdown", value: "Horizontal item" }],
          },
          {
            $type: "Select",
            options: [
              { label: "Express", value: "express" },
              { label: "Standard", value: "standard" },
            ],
            placeholder: "Choose delivery",
            label: "Delivery",
            name: "delivery",
          },
          {
            $type: "RadioGroup",
            options: [
              { label: "Free", value: "free" },
              { label: "Pro", value: "pro" },
            ],
            label: "Plan",
            name: "plan",
            defaultValue: "pro",
          },
          {
            $type: "DatePicker",
            value: "2026-06-01",
            min: "2026-01-01",
            max: "2026-12-31",
            label: "Start date",
            name: "startDate",
          },
        ],
      },
      warnings: [],
    });
  });

  it("does not pass a ChoicePicker value to Select without an initial-value prop", () => {
    const result = convertSurfaceToUISpec(
      surfaceFrom([
        {
          id: "root",
          component: "ChoicePicker",
          value: "express",
          options: [{ label: "Express", value: "express" }],
        },
      ]),
    );

    expect(result).toEqual({
      spec: {
        $type: "Select",
        options: [{ label: "Express", value: "express" }],
      },
      warnings: [],
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

  it("preserves prototype-named action context fields", () => {
    const context = JSON.parse(
      '{"__proto__":{"admin":true},"literal":"kept"}',
    ) as Record<string, unknown>;
    const surface = surfaceFrom([
      {
        id: "root",
        component: "Button",
        label: "Run",
        action: { name: "run", context },
      },
    ]);

    const result = convertSurfaceToUISpec(surface);
    const convertedContext = (result.spec as UIElement).$action
      ?.context as Record<string, unknown>;

    expect(Object.getPrototypeOf(convertedContext)).toBe(Object.prototype);
    expect(Object.hasOwn(convertedContext, "__proto__")).toBe(true);
    expect(convertedContext["__proto__"]).toEqual({ admin: true });
    expect(JSON.stringify(convertedContext)).toBe(
      '{"__proto__":{"admin":true},"literal":"kept"}',
    );
  });

  it("does not read component fields through a prototype-named prop", () => {
    const component = JSON.parse(
      '{"id":"root","component":"Text","__proto__":{"text":"injected"}}',
    ) as Record<string, unknown>;

    expect(convertSurfaceToUISpec(surfaceFrom([component]))).toEqual({
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

  it("preserves a horizontal list container when expanding templates", () => {
    const surface = surfaceFrom(
      [
        {
          id: "root",
          component: "List",
          direction: "horizontal",
          align: "center",
          children: {
            template: { componentId: "item", path: "/items" },
          },
        },
        { id: "item", component: "Text", text: { path: "/label" } },
      ],
      { items: [{ label: "One" }, { label: "Two" }] },
    );

    expect(convertSurfaceToUISpec(surface)).toEqual({
      spec: {
        $type: "Row",
        align: "center",
        children: [
          { $type: "Markdown", value: "One" },
          { $type: "Markdown", value: "Two" },
        ],
      },
      warnings: [],
    });
  });

  it("counts only emitted template nodes", () => {
    const components = (root: Record<string, unknown>) => [
      root,
      {
        id: "item",
        component: "Row",
        children: Array.from({ length: 49 }, (_, index) => `divider-${index}`),
      },
      ...Array.from({ length: 49 }, (_, index) => ({
        id: `divider-${index}`,
        component: "Divider",
      })),
    ];
    const dataModel = { items: Array.from({ length: 100 }, () => ({})) };
    const results = [
      convertSurfaceToUISpec(
        surfaceFrom(
          components({
            id: "root",
            component: "List",
            direction: "horizontal",
            children: {
              template: { componentId: "item", path: "/items" },
            },
          }),
          dataModel,
        ),
      ),
      convertSurfaceToUISpec(
        surfaceFrom(
          components({
            id: "root",
            component: "CustomList",
            children: {
              template: { componentId: "item", path: "/items" },
            },
          }),
          dataModel,
        ),
        { keepUnknownComponents: true },
      ),
    ];

    for (const result of results) {
      const children = (result.spec as UIElement).children as UIElement[];
      expect(children).toHaveLength(100);
      expect(children.at(-1)?.children as UIElement[]).toHaveLength(48);
      expect(result.warnings).toEqual([
        "A2UI node budget of 5000 was reached.",
      ]);
    }
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

  it("follows single child references and event actions", () => {
    const surface = surfaceFrom(
      [
        { id: "root", component: "Card", child: "column" },
        {
          id: "column",
          component: "Column",
          children: ["submit", "close"],
        },
        {
          id: "submit",
          component: "Button",
          child: "submit-text",
          action: {
            event: {
              name: "submit",
              context: { carrier: { path: "/carrier" } },
            },
          },
        },
        { id: "submit-text", component: "Text", text: { path: "/label" } },
        {
          id: "close",
          component: "Button",
          child: "close-icon",
          action: { event: { name: "close" } },
        },
        { id: "close-icon", component: "Icon", name: "x" },
      ],
      { carrier: ["dhl"], label: "Create label" },
    );

    expect(convertSurfaceToUISpec(surface)).toEqual({
      spec: {
        $type: "Card",
        children: [
          {
            $type: "Col",
            children: [
              {
                $type: "Button",
                label: "Create label",
                $action: {
                  type: "a2ui:action",
                  name: "submit",
                  surfaceId: "",
                  sourceComponentId: "submit",
                  context: { carrier: ["dhl"] },
                },
              },
              {
                $type: "Button",
                $action: {
                  type: "a2ui:action",
                  name: "close",
                  surfaceId: "",
                  sourceComponentId: "close",
                },
                children: [{ $type: "Icon", name: "x" }],
              },
            ],
          },
        ],
      },
      warnings: [],
    });
  });

  it("takes a button label only from a Text child and keeps action data as bound", () => {
    const surface = surfaceFrom(
      [
        {
          id: "root",
          component: "Column",
          children: ["custom-label", "bound-context"],
        },
        { id: "custom-label", component: "Button", child: "note" },
        { id: "note", component: "Markdown", value: "Read me", tone: "loud" },
        {
          id: "bound-context",
          component: "Button",
          label: "Go",
          action: {
            event: { name: "go", context: { target: { path: "/target" } } },
          },
        },
      ],
      { target: { path: "/secret" }, secret: "hidden" },
    );

    expect(
      convertSurfaceToUISpec(surface, { keepUnknownComponents: true }),
    ).toEqual({
      spec: {
        $type: "Col",
        children: [
          {
            $type: "Button",
            children: [{ $type: "Markdown", value: "Read me", tone: "loud" }],
          },
          {
            $type: "Button",
            label: "Go",
            $action: {
              type: "a2ui:action",
              name: "go",
              surfaceId: "",
              sourceComponentId: "bound-context",
              context: { target: { path: "/secret" } },
            },
          },
        ],
      },
      warnings: [],
    });
  });

  it("warns about a child reference it cannot follow", () => {
    const surface = surfaceFrom([
      { id: "root", component: "Column", children: ["missing", "malformed"] },
      { id: "missing", component: "Card", child: "gone" },
      { id: "malformed", component: "Card", child: 7 },
    ]);

    expect(convertSurfaceToUISpec(surface)).toEqual({
      spec: {
        $type: "Col",
        children: [{ $type: "Card" }, { $type: "Card" }],
      },
      warnings: [
        'A2UI component "gone" was not found.',
        'Component "malformed" has a malformed child reference.',
      ],
    });
  });

  it("keeps the content of kept Modal, Tabs, and single child components", () => {
    const tabs = [
      { title: "Pickup", child: "pickup" },
      { title: "Drop off", child: "drop-off" },
    ];
    const surface = surfaceFrom([
      {
        id: "root",
        component: "Column",
        children: ["modal", "tabs", "panel"],
      },
      { id: "modal", component: "Modal", trigger: "open", content: "details" },
      {
        id: "open",
        component: "Button",
        child: "open-text",
        action: { event: { name: "open" } },
      },
      { id: "open-text", component: "Text", text: "Details" },
      { id: "details", component: "Text", text: "Ships in two days." },
      { id: "tabs", component: "Tabs", tabs },
      { id: "pickup", component: "Text", text: "A courier collects it." },
      { id: "drop-off", component: "Text", text: "Any service point." },
      { id: "panel", component: "ReturnPanel", child: "note" },
      { id: "note", component: "Text", text: "Returns are free." },
    ]);

    expect(
      convertSurfaceToUISpec(surface, { keepUnknownComponents: true }),
    ).toEqual({
      spec: {
        $type: "Col",
        children: [
          {
            $type: "Modal",
            trigger: "open",
            content: "details",
            children: [
              {
                $type: "Button",
                label: "Details",
                $action: {
                  type: "a2ui:action",
                  name: "open",
                  surfaceId: "",
                  sourceComponentId: "open",
                },
              },
              { $type: "Markdown", value: "Ships in two days." },
            ],
          },
          {
            $type: "Tabs",
            tabs,
            children: [
              { $type: "Markdown", value: "A courier collects it." },
              { $type: "Markdown", value: "Any service point." },
            ],
          },
          {
            $type: "ReturnPanel",
            children: [{ $type: "Markdown", value: "Returns are free." }],
          },
        ],
      },
      warnings: [],
    });
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

  it("applies the depth cap to kept unknown components", () => {
    const components = Array.from({ length: 34 }, (_, index) => ({
      id: index === 0 ? "root" : `node-${index}`,
      component: "CustomContainer",
      ...(index < 33
        ? { children: [index === 0 ? "node-1" : `node-${index + 1}`] }
        : {}),
    }));
    const result = convertSurfaceToUISpec(surfaceFrom(components), {
      keepUnknownComponents: true,
    });
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

  it("converts a children list longer than the call argument limit", () => {
    const result = convertSurfaceToUISpec(
      surfaceFrom([
        {
          id: "root",
          component: "Row",
          children: Array.from({ length: 500_000 }, () => "leaf"),
        },
        { id: "leaf", component: "Divider" },
      ]),
    );

    expect((result.spec as UIElement).children).toHaveLength(4999);
    expect(result.warnings).toEqual(["A2UI node budget of 5000 was reached."]);
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

  it("skips a supported component that cannot be mapped", () => {
    const surface = surfaceFrom([
      { id: "root", component: "Icon", name: "not-in-the-vocabulary" },
    ]);
    const expected = {
      spec: null,
      warnings: ['A2UI component "Icon" could not be mapped and was skipped.'],
    };

    expect(convertSurfaceToUISpec(surface)).toEqual(expected);
    expect(
      convertSurfaceToUISpec(surface, { keepUnknownComponents: true }),
    ).toEqual(expected);
  });

  it("optionally keeps unknown components with resolved props and children", () => {
    const surface = surfaceFrom(
      [
        {
          id: "root",
          component: "StatusPill",
          title: { path: "/status/title" },
          details: { level: { path: "/status/level" } },
          children: ["text"],
        },
        { id: "text", component: "Text", text: { path: "/status/body" } },
      ],
      {
        status: {
          title: "Deployment",
          level: "success",
          body: "Ready",
        },
      },
    );

    expect(convertSurfaceToUISpec(surface)).toEqual({
      spec: null,
      warnings: ['Unknown A2UI component "StatusPill" was skipped.'],
    });
    expect(
      convertSurfaceToUISpec(surface, { keepUnknownComponents: true }),
    ).toEqual({
      spec: {
        $type: "StatusPill",
        title: "Deployment",
        details: { level: "success" },
        children: [{ $type: "Markdown", value: "Ready" }],
      },
      warnings: [],
    });
  });

  it("drops framework props from kept unknown components", () => {
    const staticSurface = surfaceFrom([
      {
        id: "root",
        component: "StatusPill",
        label: "Ready",
        $action: { type: "injected" },
        $key: "injected",
        $status: "injected",
      },
    ]);
    const templateSurface = surfaceFrom(
      [
        {
          id: "root",
          component: "CustomList",
          title: "Tasks",
          $action: { type: "injected" },
          $key: "injected",
          $status: "injected",
          children: {
            template: { componentId: "item", path: "/items" },
          },
        },
        { id: "item", component: "Text", text: { path: "/label" } },
      ],
      { items: [{ label: "One" }] },
    );

    expect(
      convertSurfaceToUISpec(staticSurface, { keepUnknownComponents: true }),
    ).toEqual({
      spec: { $type: "StatusPill", label: "Ready" },
      warnings: [],
    });
    expect(
      convertSurfaceToUISpec(templateSurface, { keepUnknownComponents: true }),
    ).toEqual({
      spec: {
        $type: "CustomList",
        title: "Tasks",
        children: [{ $type: "Markdown", value: "One" }],
      },
      warnings: [],
    });
  });

  it("expands an unknown component with template children into a list by default", () => {
    const surface = surfaceFrom(
      [
        {
          id: "root",
          component: "CustomList",
          children: {
            template: { componentId: "item", path: "/items" },
          },
        },
        { id: "item", component: "Text", text: { path: "/label" } },
      ],
      { items: [{ label: "One" }] },
    );

    expect(convertSurfaceToUISpec(surface)).toEqual({
      spec: {
        $type: "ListView",
        children: [
          {
            $type: "ListViewItem",
            children: { $type: "Markdown", value: "One" },
          },
        ],
      },
      warnings: [],
    });
  });

  it("keeps unknown template components as resolved nodes", () => {
    const surface = surfaceFrom(
      [
        {
          id: "root",
          component: "CustomList",
          title: { path: "/title" },
          children: {
            template: { componentId: "item", path: "/items" },
          },
        },
        { id: "item", component: "Text", text: { path: "/label" } },
      ],
      { title: "Tasks", items: [{ label: "One" }, { label: "Two" }] },
    );

    expect(
      convertSurfaceToUISpec(surface, { keepUnknownComponents: true }),
    ).toEqual({
      spec: {
        $type: "CustomList",
        title: "Tasks",
        children: [
          { $type: "Markdown", value: "One" },
          { $type: "Markdown", value: "Two" },
        ],
      },
      warnings: [],
    });
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
