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

describe("media vocabulary in Vue", () => {
  it.each<[string, Spec["elements"]]>([
    [
      "a token sized image",
      {
        main: {
          type: "Image",
          props: { src: "/a.png", alt: "alt", size: "md" },
        },
      },
    ],
    [
      "a numeric image",
      {
        main: {
          type: "Image",
          props: { src: "/a.png", alt: "alt", size: 128 },
        },
      },
    ],
    [
      "a round numeric avatar",
      {
        main: {
          type: "Image",
          props: { src: "/a.png", alt: "avatar", size: 64, round: true },
        },
      },
    ],
    [
      "an image without a size or round flag",
      { main: { type: "Image", props: { src: "/a.png", alt: "alt" } } },
    ],
    [
      "a round image",
      {
        main: {
          type: "Image",
          props: { src: "/a.png", alt: "avatar", round: true },
        },
      },
    ],
    [
      "an image missing alt",
      { main: { type: "Image", props: { src: "/a.png" } } },
    ],
    [
      "a divider without flush",
      { main: { type: "Divider", props: { flush: false } } },
    ],
    ["a flush divider", { main: { type: "Divider", props: { flush: true } } }],
  ])("renders %s like React", (_name, elements) => {
    expect(renderVueSpec(spec(elements)).markup()).toBe(
      renderReactSpec(spec(elements)).markup(),
    );
  });
});
