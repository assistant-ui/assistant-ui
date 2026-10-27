import { describe, expect, it } from "vitest";
import { assistantUi } from "./index";
import { withThemeDefaults } from "./config";

describe("assistant-ui theme configuration", () => {
  it("provides the complete theme and a sidebar without a collapse control", () => {
    const config = withThemeDefaults({ entry: "guide" });
    expect(config.entry).toBe("guide");
    expect(config.theme?.name).toBe("assistant-ui");
    expect(config.sidebar).toMatchObject({ collapsible: false, flat: true });
    expect(config.pageActions).toEqual({
      copyMarkdown: false,
      openDocs: false,
    });
  });

  it("merges theme overrides without losing unrelated defaults", () => {
    const theme = assistantUi({ ui: { layout: { contentWidth: 960 } } });
    expect(theme.ui?.layout?.contentWidth).toBe(960);
    expect(theme.ui?.layout?.sidebarWidth).toBe(260);
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
});
