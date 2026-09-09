import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlatformOnlyLLM, PlatformTabsLLM } from "./mdx.llm";

function Tab({ children }: { value: string; children: ReactNode }) {
  return <>{children}</>;
}

const platformTabs = [
  createElement(Tab, { value: "React", key: "react" }, "Web instructions"),
  createElement(
    Tab,
    { value: "React Native", key: "rn" },
    "Native instructions",
  ),
  createElement(
    Tab,
    { value: "React Ink", key: "ink" },
    "Terminal instructions",
  ),
];

describe("platform markdown components", () => {
  it("renders the requested platform tab", () => {
    const html = renderToStaticMarkup(
      PlatformTabsLLM(
        { children: platformTabs },
        { flavor: "base", platform: "rn" },
      ),
    );

    expect(html).toContain("React Native");
    expect(html).toContain("Native instructions");
    expect(html).not.toContain("Web instructions");
    expect(html).not.toContain("Terminal instructions");
  });

  it("keeps React as the default platform", () => {
    const html = renderToStaticMarkup(
      PlatformTabsLLM({ children: platformTabs }),
    );

    expect(html).toContain("Web instructions");
    expect(html).not.toContain("Native instructions");
  });

  it("omits a platform group when the requested tab is missing", () => {
    const html = renderToStaticMarkup(
      PlatformTabsLLM(
        {
          children: createElement(Tab, { value: "React" }, "Web instructions"),
        },
        { flavor: "base", platform: "ink" },
      ),
    );

    expect(html).toBe("");
  });

  it("filters platform-only content against the requested platform", () => {
    const props = {
      children: "Native-only details",
      platforms: ["rn"] as const,
    };

    expect(
      renderToStaticMarkup(
        PlatformOnlyLLM(props, { flavor: "base", platform: "rn" }),
      ),
    ).toContain("Native-only details");
    expect(
      renderToStaticMarkup(
        PlatformOnlyLLM(props, { flavor: "base", platform: "react" }),
      ),
    ).toBe("");
  });
});
