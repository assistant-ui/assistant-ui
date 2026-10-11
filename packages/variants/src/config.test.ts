import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SHORTCUT, shortcutLabel } from "./config";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shortcutLabel", () => {
  it("names the modifiers with plus signs off Apple platforms", () => {
    vi.stubGlobal("navigator", { platform: "Win32" });
    expect(shortcutLabel(DEFAULT_SHORTCUT)).toBe("Alt+V");
    expect(shortcutLabel({ code: "KeyK", ctrl: true, shift: true })).toBe(
      "Ctrl+Shift+K",
    );
  });

  it("uses the Mac modifier symbols on Apple platforms", () => {
    vi.stubGlobal("navigator", { platform: "MacIntel" });
    expect(shortcutLabel(DEFAULT_SHORTCUT)).toBe("⌥V");
    expect(shortcutLabel({ code: "KeyK", meta: true, shift: true })).toBe(
      "⇧⌘K",
    );
  });

  it("keeps the aria-keyshortcuts value platform independent", () => {
    vi.stubGlobal("navigator", { platform: "MacIntel" });
    expect(shortcutLabel(DEFAULT_SHORTCUT, true)).toBe("Alt+V");
  });
});
