import { defineDocs } from "@farming-labs/docs/config";
import { describe, expect, it } from "vitest";
import { assistantUi, assistantUiDefaults } from "./index";
import { withThemeDefaults } from "./config";

describe("assistant-ui theme configuration", () => {
  it("keeps the framework page chrome off for createDocsLayout", () => {
    const config = withThemeDefaults({ entry: "guide" });
    expect(config.entry).toBe("guide");
    expect(config.theme?.name).toBe("assistant-ui");
    expect(config.sidebar).toMatchObject({ collapsible: false, flat: true });
    expect(config.pageActions).toMatchObject({
      copyMarkdown: false,
      openDocs: false,
      viewMarkdown: false,
      connectMcp: false,
      toc: false,
      pager: false,
    });
  });

  it("merges theme overrides without losing unrelated defaults", () => {
    const theme = assistantUi({ ui: { layout: { contentWidth: 960 } } });
    expect(theme.ui?.layout?.contentWidth).toBe(960);
    expect(theme.ui?.layout?.sidebarWidth).toBe(260);
    expect(theme.ui?.layout?.header).toEqual({
      height: 48,
      placement: "top",
      sticky: true,
    });
    expect(assistantUi().ui?.layout?.contentWidth).toBe(848);
  });

  it("preserves consumer configuration and explicit disabled features", () => {
    const config = withThemeDefaults({
      entry: "guide",
      sidebar: false,
      lastUpdated: true,
      github: "https://github.com/example/project",
      nav: { title: "Example", url: "/" },
    });
    expect(config.sidebar).toBe(false);
    expect(config.lastUpdated).toBe(true);
    expect(config.github).toBe("https://github.com/example/project");
    expect(config.nav?.title).toBe("Example");
  });

  it("renders the site chrome through the shared layout", () => {
    const { ui } = assistantUi();
    expect(ui?.layout?.header?.placement).toBe("top");
    expect(ui?.layout?.header?.height).toBe(48);
    expect(ui?.layout?.skipLink).toBe(true);
    expect(ui?.page?.generatedTitle).toBe(true);
  });

  it("turns on the page features from the theme alone", () => {
    const config = defineDocs({ entry: "guide", theme: assistantUi() });
    expect(config.sidebar).toEqual({
      collapsible: false,
      flat: true,
      folderIndexBehavior: "link",
    });
    expect(config.breadcrumb).toEqual({ enabled: false });
    expect(config.lastUpdated).toBe(false);
    expect(config.pageActions).toEqual({
      position: "title",
      variant: "menu",
      pager: true,
      copyMarkdown: { enabled: true },
      viewMarkdown: true,
      descriptions: true,
      openDocs: {
        enabled: true,
        providers: [
          "claude",
          {
            id: "codex",
            urlTemplate: "https://chatgpt.com/codex/",
            description: "Open Codex in ChatGPT",
          },
        ],
      },
      connectMcp: true,
      toc: true,
      askAi: false,
    });
    expect(assistantUi().configDefaults).toEqual(assistantUiDefaults);
  });

  it("lets the site override a theme default", () => {
    const config = defineDocs({
      entry: "guide",
      theme: assistantUi(),
      breadcrumb: true,
      pageActions: { connectMcp: { endpoint: "/api/docs/mcp" } },
    });
    expect(config.breadcrumb).toBe(true);
    expect(config.pageActions).toMatchObject({
      variant: "menu",
      connectMcp: { endpoint: "/api/docs/mcp" },
    });
  });
});
