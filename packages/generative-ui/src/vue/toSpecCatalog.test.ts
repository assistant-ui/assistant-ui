import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toSpecCatalog } from "./toSpecCatalog";

describe("toSpecCatalog for Vue", () => {
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
