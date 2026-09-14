import { describe, expect, it, vi } from "vitest";

vi.mock("./agent-skills.generated.json", () => ({
  default: {
    source: "assistant-ui/skills@abc123",
    skills: [
      {
        name: "setup",
        description: "Installs assistant-ui.",
        content: "# Setup",
      },
      { name: "tools", description: "Defines tools.", content: "# Tools" },
    ],
  },
}));

const { AGENT_SKILLS_SOURCE, getSkill, listSkills } =
  await import("./agent-skills");

describe("agent skills loader", () => {
  it("exposes the vendored source revision", () => {
    expect(AGENT_SKILLS_SOURCE).toBe("assistant-ui/skills@abc123");
  });

  it("lists every skill by name and description only", () => {
    expect(listSkills()).toEqual([
      { name: "setup", description: "Installs assistant-ui." },
      { name: "tools", description: "Defines tools." },
    ]);
  });

  it("returns a skill with its content by name", () => {
    expect(getSkill("tools")).toEqual({
      name: "tools",
      description: "Defines tools.",
      content: "# Tools",
    });
  });

  it("returns undefined for an unknown name", () => {
    expect(getSkill("nope")).toBeUndefined();
    expect(getSkill("Tools")).toBeUndefined();
  });
});
