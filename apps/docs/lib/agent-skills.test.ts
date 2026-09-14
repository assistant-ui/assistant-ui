import { describe, expect, it, vi } from "vitest";

vi.mock("./agent-skills.generated.json", () => ({
  default: {
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

const { getSkill, listSkills } = await import("./agent-skills");

describe("agent skills loader", () => {
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

  it("vendors no relative links in any skill description or content", async () => {
    const { default: snapshot } = (await vi.importActual(
      "./agent-skills.generated.json",
    )) as { default: { skills: { description: string; content: string }[] } };
    const targets = snapshot.skills.flatMap(({ description, content }) =>
      [...`${description}\n${content}`.matchAll(/\]\(([^)\s]+)\)/g)].map(
        ([, target]) => target,
      ),
    );
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.filter((t) => !/^(https?:\/\/|#)/.test(t))).toEqual([]);
  });
});
