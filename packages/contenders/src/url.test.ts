import { describe, expect, it } from "vitest";
import { parseSearch, serializeSearch } from "./url";

const flags = { hideUI: false, clean: false, canvas: false };

describe("parseSearch", () => {
  it("reads repeated and comma-separated variant params", () => {
    const state = parseSearch(
      "?variant=hero:b&variant=features%3Acards,nav:compact&q=1",
    );
    expect(Object.fromEntries(state.selections)).toEqual({
      hero: "b",
      features: "cards",
      nav: "compact",
    });
    expect(state.hideUI).toBe(false);
    expect(state.canvas).toBe(false);
  });

  it("ignores malformed entries", () => {
    const state = parseSearch("?variant=hero&variant=:b&variant=nav:");
    expect(state.selections.size).toBe(0);
  });

  it("reads the variants flags", () => {
    expect(parseSearch("?variants=noui").hideUI).toBe(true);
    expect(parseSearch("?variants=clean").clean).toBe(true);
    expect(parseSearch("?variants=canvas,clean")).toMatchObject({
      canvas: true,
      clean: true,
      hideUI: false,
    });
  });
});

describe("serializeSearch", () => {
  it("keeps unrelated params and writes readable variant params", () => {
    const search = serializeSearch("?q=1&variant=old:x&variants=noui", {
      ...flags,
      selections: new Map([
        ["hero", "b"],
        ["features", "cards"],
      ]),
      canvas: true,
    });
    expect(search).toBe(
      "?q=1&variant=hero:b&variant=features:cards&variants=canvas",
    );
  });

  it("encodes unsafe characters but round-trips", () => {
    const search = serializeSearch("", {
      ...flags,
      selections: new Map([["my group", "a&b"]]),
      hideUI: true,
    });
    expect(search).toBe("?variant=my%20group:a%26b&variants=noui");
    expect(parseSearch(search).selections.get("my group")).toBe("a&b");
  });

  it("returns an empty string when nothing remains", () => {
    expect(
      serializeSearch("?variant=a:b", { ...flags, selections: new Map() }),
    ).toBe("");
  });
});
