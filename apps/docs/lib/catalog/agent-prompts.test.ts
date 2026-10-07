import { describe, expect, it } from "vitest";
import { CATALOG_ITEMS } from "./index";
import { getAgentPrompt } from "./agent-prompts";

describe("getAgentPrompt", () => {
  it("has a non-empty prompt for every catalog item", () => {
    for (const item of CATALOG_ITEMS) {
      expect(getAgentPrompt(item.slug)).toMatch(/\S/);
    }
  });

  it("uses the installable Statewire archive and asks for the requested application", () => {
    const prompt = getAgentPrompt("statewire");
    expect(prompt).toContain("user's setup instructions");
    expect(prompt).toContain("/downloads/statewire-tic-tac-toe.zip");
    expect(prompt).toContain("new_sqlite_classes");
    expect(prompt).toContain("not an npm release");
    expect(prompt).toContain(
      "Do not run npm install statewire-durable-objects from the registry",
    );
  });

  it("returns undefined for an unknown slug", () => {
    expect(getAgentPrompt("unknown")).toBeUndefined();
  });
});
