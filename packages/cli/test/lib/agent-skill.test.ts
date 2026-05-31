import { describe, it, expect } from "vitest";
import {
  resolveSkillsInstall,
  buildSkillsAddCommand,
  SKILLS_PACKAGE,
} from "../../src/lib/agent-skill";

describe("resolveSkillsInstall", () => {
  it("honors an explicit --skills flag", () => {
    expect(resolveSkillsInstall({ skills: true, stdinIsTTY: true })).toBe(true);
    expect(resolveSkillsInstall({ skills: true, stdinIsTTY: false })).toBe(
      true,
    );
  });

  it("honors an explicit --no-skills flag", () => {
    expect(resolveSkillsInstall({ skills: false, stdinIsTTY: true })).toBe(
      false,
    );
    expect(resolveSkillsInstall({ skills: false, stdinIsTTY: false })).toBe(
      false,
    );
  });

  it("defers to a prompt (undefined) when no flag is set and stdin is a TTY", () => {
    expect(
      resolveSkillsInstall({ skills: undefined, stdinIsTTY: true }),
    ).toBeUndefined();
  });

  it("defaults to true when no flag is set and stdin is not a TTY", () => {
    expect(resolveSkillsInstall({ skills: undefined, stdinIsTTY: false })).toBe(
      true,
    );
  });
});

describe("buildSkillsAddCommand", () => {
  it("delegates to the skills CLI via the package manager's dlx runner", () => {
    expect(buildSkillsAddCommand("pnpm", { stdinIsTTY: true })).toEqual([
      "pnpm",
      ["dlx", "skills", "add", SKILLS_PACKAGE],
    ]);
    expect(buildSkillsAddCommand("npm", { stdinIsTTY: true })).toEqual([
      "npx",
      ["--yes", "skills", "add", SKILLS_PACKAGE],
    ]);
  });

  it("lets the skills CLI prompt for agent platforms when a TTY is available", () => {
    const [, args] = buildSkillsAddCommand("pnpm", { stdinIsTTY: true });
    expect(args).not.toContain("--yes");
  });

  it("passes --yes to the skills CLI when there is no TTY to prompt on", () => {
    const [, args] = buildSkillsAddCommand("pnpm", { stdinIsTTY: false });
    expect(args).toContain("--yes");
    expect(args.at(-1)).toBe("--yes");
  });
});
