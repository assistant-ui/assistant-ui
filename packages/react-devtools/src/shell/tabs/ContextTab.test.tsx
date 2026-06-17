import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContextTab } from "../../shell/tabs/ContextTab";

describe("ContextTab", () => {
  it("renders a master-detail layout with navigable context slices", () => {
    const html = renderToStaticMarkup(
      <ContextTab
        apiId={1}
        data={{
          id: 1,
          state: { tools: { search: ["SearchUI"] } },
          logs: [],
          modelContext: {
            system: "You are helpful.",
            tools: [
              {
                name: "search",
                type: "function",
                description: "Search the web",
              },
            ],
          },
        }}
        clearEvents={() => {}}
        theme="light"
        selection="ctx:tool:search"
        setSelection={() => {}}
      />,
    );

    expect(html).toContain("System prompt");
    expect(html).toContain("search");
    expect(html).toContain("Search the web");
    expect(html).toContain("Tool UI mappings");
  });
});
