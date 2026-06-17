import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { McpView } from "./McpView";

describe("McpView rendering", () => {
  it("renders server connection state and a discovered tool", () => {
    const html = renderToStaticMarkup(
      <McpView
        value={{
          isHydrated: true,
          servers: [
            {
              id: "s1",
              kind: "connector",
              name: "GitHub",
              connectionState: "connected",
              lastError: null,
              authorizationUrl: null,
              tools: [{ name: "list_repos", description: "list repos" }],
            },
          ],
        }}
      />,
    );
    expect(html).toContain("GitHub");
    expect(html).toContain("connected");
    expect(html).toContain("list_repos");
  });

  it("falls back to raw JSON for non-manager values", () => {
    const html = renderToStaticMarkup(<McpView value={42} />);
    expect(html).toContain("42");
  });
});
