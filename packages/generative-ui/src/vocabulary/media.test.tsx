import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { mediaVocabulary } from "./media";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, mediaVocabulary)}</>);

describe("mediaVocabulary", () => {
  it("Diagram shows its Mermaid source and caption until a host draws it", () => {
    const html = render({
      $type: "Diagram",
      code: "flowchart LR\n  A[Order] --> B[Ship]",
      title: "Order flow",
    });
    expect(html).toBe(
      '<figure data-aui="diagram"><pre data-aui="diagram-code"><code>flowchart LR\n  A[Order] --&gt; B[Ship]</code></pre><figcaption data-aui="diagram-title">Order flow</figcaption></figure>',
    );
  });

  it("Map lists its places in order, each linking to OpenStreetMap, and skips a place without valid coordinates", () => {
    const html = render({
      $type: "Map",
      route: true,
      places: [
        { label: "Monterey", lat: 36.6002, lng: -121.8947, detail: "Night 1" },
        { label: "Nowhere", lat: 120, lng: 0 },
        { label: "Big Sur", lat: 36.2704, lng: -121.8081 },
      ],
    });
    expect(html).toBe(
      '<ol data-aui="map"><li data-aui="map-place"><a data-aui="map-place-label" href="https://www.openstreetmap.org/?mlat=36.6002&amp;mlon=-121.8947#map=14/36.6002/-121.8947" target="_blank" rel="noopener noreferrer">Monterey</a><div data-aui="map-place-detail">Night 1</div></li><li data-aui="map-place"><a data-aui="map-place-label" href="https://www.openstreetmap.org/?mlat=36.2704&amp;mlon=-121.8081#map=14/36.2704/-121.8081" target="_blank" rel="noopener noreferrer">Big Sur</a></li></ol>',
    );
  });

  it("Image renders an img with src, alt, and size hook", () => {
    const html = render({
      $type: "Image",
      src: "/a.png",
      alt: "alt",
      size: "md",
    });
    expect(html).toContain(
      '<img data-aui="image" data-aui-size="md" src="/a.png" alt="alt"/>',
    );
  });

  it("Image renders a numeric size as an inline max-width style, not a dead data-aui-size attribute", () => {
    const html = render({
      $type: "Image",
      src: "/a.png",
      alt: "alt",
      size: 128,
    });
    expect(html).not.toContain("data-aui-size");
    expect(html).toContain('style="max-width:128px"');
  });

  it("Image renders a numeric size on a round avatar as an inline width/height square", () => {
    const html = render({
      $type: "Image",
      src: "/a.png",
      alt: "avatar",
      size: 64,
      round: true,
    });
    expect(html).not.toContain("data-aui-size");
    expect(html).toContain('style="width:64px;height:64px"');
  });

  it("Image `alt` is required by the schema (not optional)", () => {
    const schema = mediaVocabulary.Image.properties as unknown as {
      safeParse: (v: unknown) => { success: boolean };
    };
    expect(schema.safeParse({ src: "/a.png" }).success).toBe(false);
    expect(schema.safeParse({ src: "/a.png", alt: "x" }).success).toBe(true);
  });

  it("Image omits data-aui-round when round is not set", () => {
    const html = render({ $type: "Image", src: "/a.png", alt: "alt" });
    expect(html).not.toContain("data-aui-round");
  });

  it("Image renders data-aui-round when round is true", () => {
    const html = render({
      $type: "Image",
      src: "/a.png",
      alt: "avatar",
      round: true,
    });
    expect(html).toContain('data-aui-round="true"');
  });

  it("Image with a missing alt still renders (defensive: schema validation is not runtime enforcement)", () => {
    expect(() =>
      render({ $type: "Image", src: "/a.png" } as never),
    ).not.toThrow();
  });

  it("Divider omits data-aui-flush when flush is false", () => {
    expect(render({ $type: "Divider", flush: false })).toBe(
      '<hr data-aui="divider"/>',
    );
  });

  it("Divider renders an hr with a flush hook", () => {
    expect(render({ $type: "Divider", flush: true })).toBe(
      '<hr data-aui="divider" data-aui-flush="true"/>',
    );
  });
});
