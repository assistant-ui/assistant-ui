// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { ThemeSnapshot } from "@assistant-ui/remote-components-protocol";
import { ThemeApplier } from "./theme.js";

const theme = (inherited: Record<string, string>): ThemeSnapshot => ({
  inherited,
  vars: {},
  fonts: [],
  lang: "",
  rootFontSize: "",
});

describe("ThemeApplier", () => {
  it("mirrors the tunnelled direction on <html dir>, so :dir() and [dir] selectors match", () => {
    const applier = new ThemeApplier(document);
    applier.apply(theme({ direction: "rtl" }));
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.style.getPropertyValue("direction")).toBe(
      "rtl",
    );
    applier.apply(theme({ direction: "ltr" }));
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    applier.apply(theme({}));
    expect(document.documentElement.hasAttribute("dir")).toBe(false);
  });
});
