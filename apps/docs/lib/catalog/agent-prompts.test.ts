import { describe, expect, it } from "vitest";
import { CATALOG_ITEMS } from "./index";
import { getAgentPrompt } from "./agent-prompts";

describe("getAgentPrompt", () => {
  it("has a non-empty prompt for every catalog item", () => {
    for (const item of CATALOG_ITEMS) {
      expect(getAgentPrompt(item.slug)).toMatch(/\S/);
    }
  });

  it("returns undefined for an unknown slug", () => {
    expect(getAgentPrompt("unknown")).toBeUndefined();
  });
});
