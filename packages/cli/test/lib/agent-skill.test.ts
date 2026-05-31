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
    expect(buildSkillsAddCommand("yarn", { stdinIsTTY: true })).toEqual([
      "yarn",
      ["dlx", "skills", "add", SKILLS_PACKAGE],
    ]);
    expect(buildSkillsAddCommand("bun", { stdinIsTTY: true })).toEqual([
      "bunx",
      ["skills", "add", SKILLS_PACKAGE],
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

  it("appends the skills CLI's --yes for every package manager when non-TTY", () => {
    expect(buildSkillsAddCommand("pnpm", { stdinIsTTY: false })).toEqual([
      "pnpm",
      ["dlx", "skills", "add", SKILLS_PACKAGE, "--yes"],
    ]);
    expect(buildSkillsAddCommand("yarn", { stdinIsTTY: false })).toEqual([
      "yarn",
      ["dlx", "skills", "add", SKILLS_PACKAGE, "--yes"],
    ]);
    expect(buildSkillsAddCommand("bun", { stdinIsTTY: false })).toEqual([
      "bunx",
      ["skills", "add", SKILLS_PACKAGE, "--yes"],
    ]);
    // npm carries npx's own --yes (auto-confirm the package download) plus the skills CLI's --yes
    expect(buildSkillsAddCommand("npm", { stdinIsTTY: false })).toEqual([
      "npx",
      ["--yes", "skills", "add", SKILLS_PACKAGE, "--yes"],
    ]);
  });
});
