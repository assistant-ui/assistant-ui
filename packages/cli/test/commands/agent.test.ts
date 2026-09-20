import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  launch: vi.fn(),
  ensureSkillsPlugin: vi.fn(),
  skillsPluginDir: vi.fn(),
}));

vi.mock("@assistant-ui/agent-launcher", () => ({
  launch: mocks.launch,
}));

vi.mock("../../src/lib/agent-skill", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/agent-skill")>()),
  ensureSkillsPlugin: mocks.ensureSkillsPlugin,
  skillsPluginDir: mocks.skillsPluginDir,
}));

import { agent } from "../../src/commands/agent";

describe("agent command", () => {
  it("launches Claude Code with the fetched skills plugin and the joined prompt", async () => {
    mocks.ensureSkillsPlugin.mockResolvedValue("/cache/skills/abc");

    await agent.parseAsync(["node", "agent", "add", "a", "chat"], {
      from: "node",
    });

    expect(mocks.ensureSkillsPlugin).toHaveBeenCalledTimes(1);
    expect(mocks.launch).toHaveBeenCalledWith({
      pluginDir: "/cache/skills/abc",
      skillName: "assistant-ui",
      prompt: "add a chat",
      dry: false,
    });
  });

  it("prints the command from the cache path without fetching under --dry", async () => {
    mocks.skillsPluginDir.mockReturnValue("/cache/skills/abc");

    await agent.parseAsync(["node", "agent", "--dry", "hello"], {
      from: "node",
    });

    expect(mocks.ensureSkillsPlugin).not.toHaveBeenCalled();
    expect(mocks.launch).toHaveBeenCalledWith({
      pluginDir: "/cache/skills/abc",
      skillName: "assistant-ui",
      prompt: "hello",
      dry: true,
    });
  });
});
