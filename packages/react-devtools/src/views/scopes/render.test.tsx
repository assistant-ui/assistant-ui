import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScopesView } from "./ScopesView";

describe("ScopesView", () => {
  it("renders scope names, source, query, and methods", () => {
    const html = renderToStaticMarkup(
      <ScopesView
        scopes={[
          { name: "threads", source: "root", query: {}, methods: ["getState"] },
          {
            name: "composer",
            source: "thread",
            query: { type: "main" },
            methods: ["send", "setText"],
          },
        ]}
      />,
    );

    expect(html).toContain("threads");
    expect(html).toContain("root");
    expect(html).toContain("composer");
    expect(html).toContain("send");
    expect(html).toContain("setText");
    // the query renders as escaped JSON ({&quot;type&quot;:&quot;main&quot;})
    expect(html).toContain("type");
    expect(html).toContain("main");
  });

  it("shows an empty state when no scopes are reported", () => {
    const html = renderToStaticMarkup(<ScopesView scopes={undefined} />);
    expect(html).toContain("No scopes reported");
  });
});
