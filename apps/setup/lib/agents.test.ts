import { describe, expect, it } from "vitest";
import { CODING_AGENTS } from "setup-agent/cli";
import { agentKindName } from "./agents";

describe("agentKindName", () => {
  it("names every agent kind setup-agent detects", () => {
    for (const agent of CODING_AGENTS) {
      expect(agentKindName(agent.kind)).toBe(agent.name);
    }
  });

  it("has no name for an unknown or missing kind", () => {
    expect(agentKindName("nope")).toBeUndefined();
    expect(agentKindName(null)).toBeUndefined();
    expect(agentKindName(undefined)).toBeUndefined();
  });
});
