import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { mediaVocabulary } from "./media";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, mediaVocabulary)}</>);

describe("mediaVocabulary", () => {
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
