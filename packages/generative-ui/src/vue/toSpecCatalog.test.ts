// @vitest-environment jsdom
import { defineComponent, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { cleanupSpecs, renderVueSpec, spec } from "./testUtils";
import { toSpecCatalog } from "./toSpecCatalog";

afterEach(cleanupSpecs);

describe("toSpecCatalog for Vue", () => {
  it("keeps spec events wired when imageOrigins is set", async () => {
    const capture = vi.fn();
    const setup = toSpecCatalog(undefined, {
      imageOrigins: [],
      actions: { capture: { description: "Captures a press." } },
    });
    const rendered = renderVueSpec(
      spec({
        main: {
          type: "Button",
          props: { label: "Go" },
          on: { press: { action: "capture", params: {} } },
        },
      }),
      { capture },
      setup,
    );

    rendered.container.querySelector("button")?.click();
    await nextTick();
    expect(capture).toHaveBeenCalledOnce();
  });

  it("forwards props, events and imageOrigins through the wrapper", async () => {
    const capture = vi.fn();
    const Gallery = defineComponent({
      props: ["label", "imageOrigins"],
      emits: ["press"],
      setup(props, { emit }) {
        return () =>
          h(
            "button",
            { onClick: () => emit("press") },
            `${String(props.label)} ${(props.imageOrigins as readonly string[]).join(",")}`,
          );
      },
    });
    const setup = toSpecCatalog(
      {
        Gallery: {
          component: Gallery,
          description: "A gallery.",
          properties: z.object({ label: z.string() }),
          events: ["press"],
        },
      },
      {
        imageOrigins: ["https://cdn.example.com"],
        actions: { capture: { description: "Captures a press." } },
      },
    );
    const rendered = renderVueSpec(
      spec({
        main: {
          type: "Gallery",
          props: { label: "Photos" },
          on: { press: { action: "capture", params: {} } },
        },
      }),
      { capture },
      setup,
    );

    const button = rendered.container.querySelector("button");
    expect(button?.textContent).toBe("Photos https://cdn.example.com");
    button?.click();
    await nextTick();
    expect(capture).toHaveBeenCalledOnce();
  });

  it("keeps imageOrigins off components that do not declare it", () => {
    const markup = renderVueSpec(
      spec({ main: { type: "Card", props: { title: "Hello" } } }),
      {},
      toSpecCatalog(undefined, { imageOrigins: ["https://cdn.example.com"] }),
    ).markup();

    expect(markup).toContain("Hello");
    expect(markup.toLowerCase()).not.toContain("imageorigins");
  });

  it("keeps a component named __proto__", () => {
    const { catalog, components } = toSpecCatalog({
      ["__proto__"]: {
        description: "A component with an unusual name.",
        properties: z.object({}),
        component: defineComponent({ setup: () => () => h("p", "proto") }),
      },
    });
    expect(Object.hasOwn(components, "__proto__")).toBe(true);
    expect(catalog.component("__proto__")).toMatchObject({
      description: "A component with an unusual name.",
    });
  });
});
