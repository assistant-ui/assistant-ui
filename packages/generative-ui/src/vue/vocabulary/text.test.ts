// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { Spec } from "generative-frame/spec";
import {
  cleanupSpecs,
  renderReactSpec,
  renderVueSpec,
  spec,
} from "../testUtils";

afterEach(cleanupSpecs);

describe("text vocabulary in Vue", () => {
  it.each<[string, Spec["elements"]]>([
    ["a header", { main: { type: "Header", props: { text: "Title" } } }],
    [
      "a sized header with children",
      {
        main: {
          type: "Header",
          props: { text: "Title", size: "sm" },
          children: ["note"],
        },
        note: { type: "Caption", props: { value: "!" } },
      },
    ],
    [
      "text with every token",
      {
        main: {
          type: "Text",
          props: {
            value: "Hi",
            size: "lg",
            weight: "bold",
            color: "secondary",
          },
        },
      },
    ],
    ["a caption", { main: { type: "Caption", props: { value: "Note" } } }],
  ])("renders %s like React", (_case, elements) => {
    const rendered = renderVueSpec(spec(elements)).markup();
    expect(rendered).toBe(renderReactSpec(spec(elements)).markup());
    expect(rendered).toContain('data-aui="');
  });
});
