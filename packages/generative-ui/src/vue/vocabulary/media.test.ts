// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { Spec } from "generative-frame/spec";
import { toSpecCatalog } from "../toSpecCatalog";
import {
  cleanupSpecs,
  renderReactSpec,
  renderVueSpec,
  spec,
} from "../testUtils";

afterEach(cleanupSpecs);

describe("media vocabulary in Vue", () => {
  it("limits vocabulary images to imageOrigins in a Vue spec catalog", () => {
    const restricted = toSpecCatalog(undefined, {
      imageOrigins: ["https://cdn.example.com"],
    });
    const renderImage = (src: string) =>
      renderVueSpec(
        spec({ main: { type: "Image", props: { src, alt: "Photo" } } }),
        {},
        restricted,
      ).markup();

    expect(renderImage("https://other.example.com/photo.png")).toBe("Photo");
    expect(renderImage("https://cdn.example.com/photo.png")).toContain(
      'src="https://cdn.example.com/photo.png"',
    );
  });
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
    [
      "a diagram with a title",
      {
        main: {
          type: "Diagram",
          props: {
            code: "flowchart LR\n  A[Order] --> B[Ship]",
            title: "Order flow",
          },
        },
      },
    ],
    [
      "a diagram without a title",
      {
        main: { type: "Diagram", props: { code: "flowchart LR\n  A --> B" } },
      },
    ],
    [
      "a map with optional details and an invalid place",
      {
        main: {
          type: "Map",
          props: {
            route: true,
            places: [
              {
                label: "Monterey",
                lat: 36.6002,
                lng: -121.8947,
                detail: "Night 1",
              },
              { label: "Nowhere", lat: 120, lng: 0 },
              { label: "Big Sur", lat: 36.2704, lng: -121.8081 },
            ],
          },
        },
      },
    ],
    ["an empty map", { main: { type: "Map", props: { places: [] } } }],
  ])("renders %s like React", (_name, elements) => {
    expect(renderVueSpec(spec(elements)).markup()).toBe(
      renderReactSpec(spec(elements)).markup(),
    );
  });

  it("links valid places in order and skips invalid coordinates", () => {
    const markup = renderVueSpec(
      spec({
        main: {
          type: "Map",
          props: {
            places: [
              { label: "Monterey", lat: 36.6002, lng: -121.8947 },
              { label: "Nowhere", lat: 120, lng: 0 },
              { label: "Big Sur", lat: 36.2704, lng: -121.8081 },
            ],
          },
        },
      }),
    ).markup();
    expect(markup).toContain("https://www.openstreetmap.org/?mlat=36.6002");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).not.toContain("Nowhere");
    expect(markup.indexOf("Monterey")).toBeLessThan(markup.indexOf("Big Sur"));
  });
});
