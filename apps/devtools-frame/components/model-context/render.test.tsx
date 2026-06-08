import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModelContextView } from "./ModelContextView";

describe("ModelContextView", () => {
  it("renders provider args and backend defaults from already-normalized tools", () => {
    const html = renderToStaticMarkup(
      <ModelContextView
        modelContext={{
          tools: [
            {
              name: "web_search",
              type: "provider",
              providerId: "openai.web_search_preview",
              providerArgs: { searchContextSize: "high" },
              backendDefault: { parameters: true },
            },
          ],
          config: { modelName: "gpt", apiKey: "[redacted]" },
        }}
      />,
    );

    expect(html).toContain("web_search");
    expect(html).toContain("openai.web_search_preview");
    expect(html).toContain("Provider args");
    expect(html).toContain("searchContextSize");
    expect(html).toContain("Backend defaults");
    expect(html).toContain("Config");
  });

  it("shows the empty state when nothing is configured", () => {
    const html = renderToStaticMarkup(
      <ModelContextView modelContext={undefined} />,
    );
    expect(html).toContain("No model context");
  });
});
