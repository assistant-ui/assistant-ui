import { describe, expect, it } from "vitest";
import { parseSearch, serializeSearch } from "./url";

describe("parseSearch", () => {
  it("reads repeated and comma-separated variant params", () => {
    const state = parseSearch(
      "?variant=hero:b&variant=features%3Aall,nav:compact&q=1",
    );
    expect(Object.fromEntries(state.selections)).toEqual({
      hero: "b",
      features: "all",
      nav: "compact",
    });
    expect(state.globalAll).toBe(false);
    expect(state.hideUI).toBe(false);
  });

  it("ignores malformed entries", () => {
    const state = parseSearch("?variant=hero&variant=:b&variant=nav:");
    expect(state.selections.size).toBe(0);
  });

  it("reads global flags", () => {
    expect(parseSearch("?variants=all").globalAll).toBe(true);
    expect(parseSearch("?variants=all,noui").hideUI).toBe(true);
  });
});

describe("serializeSearch", () => {
  it("keeps unrelated params and writes readable variant params", () => {
    const search = serializeSearch("?q=1&variant=old:x&variants=noui", {
      selections: new Map([
        ["hero", "b"],
        ["features", "all"],
      ]),
      globalAll: true,
      hideUI: false,
      clean: false,
    });
    expect(search).toBe(
      "?q=1&variant=hero:b&variant=features:all&variants=all",
    );
  });

  it("encodes unsafe characters but round-trips", () => {
    const search = serializeSearch("", {
      selections: new Map([["my group", "a&b"]]),
      globalAll: false,
      hideUI: true,
      clean: false,
    });
    expect(search).toBe("?variant=my%20group:a%26b&variants=noui");
    expect(parseSearch(search).selections.get("my group")).toBe("a&b");
  });

  it("returns an empty string when nothing remains", () => {
    expect(
      serializeSearch("?variant=a:b", {
        selections: new Map(),
        globalAll: false,
        hideUI: false,
        clean: false,
      }),
    ).toBe("");
  });
});
