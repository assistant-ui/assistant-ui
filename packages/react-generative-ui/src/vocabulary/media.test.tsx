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

  it("Image renders a numeric size as px", () => {
    const html = render({
      $type: "Image",
      src: "/a.png",
      alt: "alt",
      size: 128,
    });
    expect(html).toContain(
      '<img data-aui="image" data-aui-size="128px" src="/a.png" alt="alt"/>',
    );
  });

  it("Image `alt` is required by the schema (not optional)", () => {
    const schema = mediaVocabulary.Image.properties as unknown as {
      safeParse: (v: unknown) => { success: boolean };
    };
    expect(schema.safeParse({ src: "/a.png" }).success).toBe(false);
    expect(schema.safeParse({ src: "/a.png", alt: "x" }).success).toBe(true);
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
