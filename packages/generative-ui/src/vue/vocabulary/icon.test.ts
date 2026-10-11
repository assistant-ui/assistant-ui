// @vitest-environment jsdom
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
});
