import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToolDetailPane } from "./ModelContextView";

describe("ToolDetailPane", () => {
  it("renders provider args and backend defaults from an already-normalized tool", () => {
    const html = renderToStaticMarkup(
      <ToolDetailPane
        tool={{
          name: "web_search",
          type: "provider",
          providerId: "openai.web_search_preview",
          providerArgs: { searchContextSize: "high" },
          backendDefault: { parameters: true },
        }}
      />,
    );

    expect(html).toContain("openai.web_search_preview");
    expect(html).toContain("Provider args");
    expect(html).toContain("searchContextSize");
    expect(html).toContain("Backend defaults");
  });
});
