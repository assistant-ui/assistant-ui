// @vitest-environment jsdom
import { createApp, h } from "vue";
import { iconVocabulary } from "./icon";
import { afterEach, describe, expect, it } from "vitest";
import type { Spec } from "generative-frame/spec";
import { ICON_NAMES } from "../../ir";
import {
  cleanupSpecs,
  renderReactSpec,
  renderVueSpec,
  spec,
} from "../testUtils";

afterEach(cleanupSpecs);

describe("icon vocabulary in Vue", () => {
  it.each(ICON_NAMES)("renders %s at its default size like React", (name) => {
    const tree = spec({ main: { type: "Icon", props: { name } } });
    expect(renderVueSpec(tree).markup()).toBe(renderReactSpec(tree).markup());
  });

  it.each<[string, Spec["elements"]]>([
    ["unknown", { main: { type: "Icon", props: { name: "not-a-real-icon" } } }],
    ["small", { main: { type: "Icon", props: { name: "star", size: "sm" } } }],
    ["medium", { main: { type: "Icon", props: { name: "star", size: "md" } } }],
    ["large", { main: { type: "Icon", props: { name: "bell", size: "lg" } } }],
  ])("renders a %s icon like React", (_name, elements) => {
    expect(renderVueSpec(spec(elements)).markup()).toBe(
      renderReactSpec(spec(elements)).markup(),
    );
  });

  it.each(["huge", "toString", "__proto__"])(
    "renders the size %s at the medium size",
    (size) => {
      const container = document.createElement("div");
      const app = createApp({
        render: () => h(iconVocabulary.Icon.component, { name: "star", size }),
      });
      app.mount(container);
      expect(container.querySelector("svg")?.getAttribute("width")).toBe("16");
      app.unmount();
    },
  );

  it.each(["constructor", "toString", "__proto__"])(
    "renders nothing for the inherited key %s",
    (name) => {
      const container = document.createElement("div");
      const app = createApp({
        render: () => h(iconVocabulary.Icon.component, { name }),
      });
      expect(() => app.mount(container)).not.toThrow();
      expect(container.innerHTML).toBe("<!---->");
      app.unmount();
    },
  );
});
