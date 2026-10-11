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

describe("fact vocabulary in Vue", () => {
  it.each<[string, Spec["elements"]]>([
    [
      "invalid text values",
      {
        main: {
          type: "Fact",
          props: { label: { unexpected: true }, value: { unexpected: true } },
        },
      },
    ],
    [
      "a label and value",
      { main: { type: "Fact", props: { label: "Status", value: "open" } } },
    ],
    [
      "an upward delta",
      {
        main: {
          type: "Fact",
          props: { label: "Revenue", value: "$12.4k", delta: "+8%" },
        },
      },
    ],
    [
      "a downward delta with inverted tone",
      {
        main: {
          type: "Fact",
          props: {
            label: "Cost",
            value: "$12.4k",
            delta: "-8%",
            upIsGood: false,
          },
        },
      },
    ],
    [
      "a typographic minus",
      {
        main: {
          type: "Fact",
          props: { label: "Latency", value: "120 ms", delta: "−3%" },
        },
      },
    ],
    [
      "a zero delta",
      {
        main: {
          type: "Fact",
          props: { label: "Revenue", value: "$12.4k", delta: "+0.0%" },
        },
      },
    ],
    [
      "an overridden upward trend",
      {
        main: {
          type: "Fact",
          props: {
            label: "Revenue",
            value: "$12.4k",
            delta: "-8%",
            trend: "up",
          },
        },
      },
    ],
    [
      "a flat trend",
      {
        main: {
          type: "Fact",
          props: {
            label: "Revenue",
            value: "$12.4k",
            delta: "0%",
            trend: "flat",
          },
        },
      },
    ],
    [
      "children",
      {
        main: {
          type: "Fact",
          props: { label: "Status", value: "open" },
          children: ["detail"],
        },
        detail: { type: "Caption", props: { value: " now" } },
      },
    ],
  ])("renders %s like React", (_name, elements) => {
    expect(renderVueSpec(spec(elements)).markup()).toBe(
      renderReactSpec(spec(elements)).markup(),
    );
  });
});
