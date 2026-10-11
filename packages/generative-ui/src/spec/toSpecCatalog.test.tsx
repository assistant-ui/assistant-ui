import { validateSpec } from "generative-frame/spec";
import { SpecRenderer } from "generative-frame/spec/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defaultGenerativeUILibrary } from "../vocabulary";
import { interactiveVocabulary } from "../vocabulary/interactive";
import { toSpecCatalog } from "./toSpecCatalog";

describe("toSpecCatalog", () => {
  const { catalog, components } = toSpecCatalog();

  it("declares every default component with its slots and events", () => {
    expect(Object.keys(catalog.components)).toEqual(
      Object.keys(defaultGenerativeUILibrary),
    );
    expect(Object.keys(components)).toEqual(
      Object.keys(defaultGenerativeUILibrary),
    );
    expect(catalog.component("Button")).toMatchObject({
      slots: ["default"],
      events: ["press"],
    });
    for (const name of ["Select", "RadioGroup", "CheckboxGroup"]) {
      expect(catalog.component(name)).toMatchObject({
        slots: ["default"],
        events: ["change"],
      });
    }
    expect(catalog.component("Input")).toMatchObject({ events: ["submit"] });
    expect(catalog.component("Input")?.slots).toBeUndefined();
    expect(catalog.component("Form")).toMatchObject({
      slots: ["default"],
      events: ["submit"],
    });
    expect(catalog.component("Card")).toMatchObject({
      slots: ["default"],
      events: ["confirm", "cancel"],
    });
    expect(catalog.component("Text")).toMatchObject({ slots: ["default"] });
    expect(catalog.component("Image")?.slots).toBeUndefined();
    expect(catalog.component("Image")?.events).toBeUndefined();
  });

  it("describes events instead of `_action` in the model guidance", () => {
    const prompt = catalog.prompt();
    expect(prompt).not.toContain("_action");
    expect(prompt).toContain("Emits `press` on click");
    expect(JSON.stringify(catalog.propsSchema("Card"))).not.toContain(
      "_action",
    );
    expect(catalog.propsSchema("Card")).toMatchObject({
      properties: {
        confirm: { properties: { label: { type: "string" } } },
      },
    });
  });

  it("validates props against the vocabulary schemas", () => {
    expect(catalog.validateProps("Button", { label: "Go" })).toEqual([]);
    expect(catalog.validateProps("Button", { label: 3 })).not.toEqual([]);
    expect(
      catalog.validateProps("Text", { value: { $state: "/greeting" } }),
    ).toEqual([]);
  });

  it("keeps a custom component's description and gives it the default slot", () => {
    const custom = toSpecCatalog({
      Weather: {
        description: "Current weather for a city.",
        properties: z.object({ city: z.string() }),
        render: ({ city }) => <p>{city}</p>,
      },
      Button: {
        description: "An app button with its own props.",
        properties: z.object({ caption: z.string() }),
        render: ({ caption }) => <button type="button">{caption}</button>,
      },
    });
    expect(custom.catalog.component("Weather")).toEqual({
      description: "Current weather for a city.",
      props: expect.anything(),
      slots: ["default"],
    });
    expect(custom.catalog.component("Button")).toMatchObject({
      description: "An app button with its own props.",
      slots: ["default"],
    });
    expect(custom.catalog.component("Button")?.events).toBeUndefined();
  });

  it("passes a custom component's bound prop through unchanged", () => {
    const custom = toSpecCatalog({
      Rating: {
        description: "A star rating.",
        properties: z.object({ defaultValue: z.number().optional() }),
        render: ({ defaultValue }) => <output>{defaultValue}</output>,
      },
    });
    const html = renderToStaticMarkup(
      <SpecRenderer
        catalog={custom.catalog}
        components={custom.components}
        spec={{
          root: "rating",
          elements: {
            rating: {
              type: "Rating",
              props: { defaultValue: { $bindState: "/stars" } },
            },
          },
          state: { stars: 4 },
        }}
      />,
    );
    expect(html).toContain("<output>4</output>");
  });

  it("keeps a default component's events when its schema is extended", () => {
    const { Button } = interactiveVocabulary;
    const extended = toSpecCatalog({
      Button: {
        ...Button,
        properties: Button.properties.extend({ tone: z.string().optional() }),
      },
    });
    expect(extended.catalog.component("Button")).toMatchObject({
      slots: ["default"],
      events: ["press"],
      description: expect.stringContaining("Emits `press`"),
    });
  });

  it("declares custom events and slots for validation and model guidance", () => {
    const { catalog: custom } = toSpecCatalog({
      Rating: {
        description: "A rating with a footer.",
        properties: z.object({ value: z.number() }),
        events: ["rate"],
        slots: ["default", "footer"],
        render: () => null,
      },
      Text: {
        description: "Text.",
        properties: z.object({}),
        render: () => null,
      },
    });
    expect(custom.component("Rating")).toMatchObject({
      events: ["rate"],
      slots: ["default", "footer"],
    });
    expect(
      validateSpec(
        {
          root: "rating",
          elements: {
            rating: {
              type: "Rating",
              props: { value: 4 },
              slots: { footer: ["note"] },
              on: {
                rate: {
                  action: "setState",
                  params: { path: "/rating", value: 4 },
                },
              },
            },
            note: { type: "Text" },
          },
        },
        custom,
      ).ok,
    ).toBe(true);
    expect(custom.prompt()).toContain("children: `children`, `slots.footer`");
    expect(custom.prompt()).toContain("events: `rate`");
  });

  it("rejects children when a custom entry declares no slots", () => {
    const { catalog: custom } = toSpecCatalog({
      Empty: {
        description: "No children.",
        properties: z.object({}),
        slots: [],
        render: () => null,
      },
    });
    expect(custom.component("Empty")?.slots).toEqual([]);
    expect(custom.prompt()).toContain("children: none");
    expect(
      validateSpec(
        {
          root: "empty",
          elements: { empty: { type: "Empty", children: ["missing"] } },
        },
        custom,
      ).issues.map(({ code }) => code),
    ).toContain("children-not-allowed");
  });

  it("uses declared events and slots over a vocabulary shape", () => {
    const { catalog: custom } = toSpecCatalog({
      Button: {
        ...interactiveVocabulary.Button,
        description: "Rates a selection.",
        events: ["rate"],
        slots: ["footer"],
      },
    });
    expect(custom.component("Button")).toMatchObject({
      events: ["rate"],
      slots: ["footer"],
    });
    expect(custom.prompt()).toContain("children: `slots.footer`");
    expect(custom.prompt()).toContain("events: `rate`");
    expect(custom.prompt()).toContain("Rates a selection.");
    expect(custom.prompt()).not.toContain("Emits `press`");
    const { catalog: slotsOnly } = toSpecCatalog({
      Button: { ...interactiveVocabulary.Button, slots: [] },
    });
    expect(slotsOnly.component("Button")).toMatchObject({ slots: [] });
    expect(slotsOnly.component("Button")?.events).toBeUndefined();
    expect(
      validateSpec(
        {
          root: "button",
          elements: {
            button: {
              type: "Button",
              props: { label: "Rate" },
              children: ["missing"],
              on: {
                press: { action: "setState", params: { path: "/rating" } },
              },
            },
          },
        },
        custom,
      ).issues.map(({ code }) => code),
    ).toEqual(
      expect.arrayContaining(["children-not-allowed", "unknown-event"]),
    );
  });

  it("adds host actions next to the built-in setState", () => {
    const { catalog: withActions } = toSpecCatalog(defaultGenerativeUILibrary, {
      actions: { refresh: { description: "Reloads the data." } },
    });
    expect(withActions.action("refresh")).toEqual({
      description: "Reloads the data.",
    });
    expect(withActions.action("setState")).toBeDefined();
    expect(withActions.prompt()).toContain("refresh");
  });

  it("renders a spec with the vocabulary components", () => {
    const html = renderToStaticMarkup(
      <SpecRenderer
        catalog={catalog}
        components={components}
        spec={{
          root: "card",
          elements: {
            card: {
              type: "Card",
              props: { title: "Plan" },
              children: ["intro", "go"],
            },
            intro: { type: "Text", props: { value: { $state: "/greeting" } } },
            go: { type: "Button", props: { label: "Start" } },
          },
          state: { greeting: "Two steps." },
        }}
      />,
    );
    expect(html).toContain('data-aui="card"');
    expect(html).toContain("Plan");
    expect(html).toContain("Two steps.");
    expect(html).toContain("Start");
    expect(html).not.toContain("data-gf-spec-placeholder");
  });
});
