import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { buildPresentParameters } from "../buildPresentParameters";
import { iconVocabulary } from "./icon";
import { ICON_NAMES } from "../ir";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, iconVocabulary)}</>);

describe("iconVocabulary", () => {
  it("a known name renders an svg with the data-aui hooks and default size", () => {
    const html = render({ $type: "Icon", name: "check" });
    expect(html).toContain('data-aui="icon"');
    expect(html).toContain('data-aui-name="check"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('width="16"');
    expect(html).toContain('height="16"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("every built-in name renders without throwing and without a data-aui-size attribute when size is omitted", () => {
    for (const name of ICON_NAMES) {
      const html = render({ $type: "Icon", name });
      expect(html, name).toContain("<svg");
      expect(html, name).not.toContain("data-aui-size=");
    }
  });

  it("maps size tokens to pixel dimensions", () => {
    expect(render({ $type: "Icon", name: "star", size: "sm" })).toContain(
      'width="14"',
    );
    expect(render({ $type: "Icon", name: "star", size: "md" })).toContain(
      'width="16"',
    );
    expect(render({ $type: "Icon", name: "star", size: "lg" })).toContain(
      'width="20"',
    );
  });

  it("emits the size token as a data-aui-size hook when given", () => {
    expect(render({ $type: "Icon", name: "bell", size: "lg" })).toContain(
      'data-aui-size="lg"',
    );
  });

  it("an unknown name renders nothing rather than throwing", () => {
    expect(() =>
      render({ $type: "Icon", name: "not-a-real-icon" }),
    ).not.toThrow();
    expect(render({ $type: "Icon", name: "not-a-real-icon" })).toBe("");
  });

  it("exposes the closed name enum in buildPresentParameters", () => {
    const schema = buildPresentParameters(iconVocabulary) as Record<
      string,
      unknown
    >;
    const properties = schema["properties"] as Record<string, unknown>;
    const nameProp = properties["name"] as { enum?: unknown[] };
    expect(nameProp.enum).toEqual([...ICON_NAMES]);
  });
});
