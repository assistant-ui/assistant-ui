import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JSONTree } from "./JSONTree";

describe("JSONTree", () => {
  it("renders object keys with container summaries", () => {
    const html = renderToStaticMarkup(
      <JSONTree value={{ status: 200, items: [1, 2, 3] }} />,
    );
    expect(html).toContain("status");
    expect(html).toContain("200");
    expect(html).toContain("items");
    expect(html).toContain("[3]");
  });

  it("inlines small payloads in compact mode", () => {
    const html = renderToStaticMarkup(
      <JSONTree value={{ query: "Singapore" }} compact openDepth={0} />,
    );
    expect(html).toContain("query");
    expect(html).toContain("Singapore");
    expect(html).not.toContain("{1}");
  });

  it("falls back to a plain preview for primitive values", () => {
    const html = renderToStaticMarkup(<JSONTree value={42} />);
    expect(html).toContain("42");
  });
});
