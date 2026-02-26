import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectSkillSourceDirs,
  discoverSkills,
  installSkillsToTargets,
  resolveSelectedTargets,
  resolveTargetPaths,
} from "../../src/commands/skills";

function writeSkill(root: string, skillName: string, body = "# skill\n"): void {
  const skillDir = path.join(root, skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), body);
}

function normalize(entryPath: string): string {
  return fs.realpathSync(entryPath);
}

describe("skills command helpers", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aui-skills-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("resolveSelectedTargets", () => {
    it("defaults to all targets when no options are provided", () => {
      expect(resolveSelectedTargets({})).toEqual([
        "project",
        "codex",
        "claude",
        "cursor",
      ]);
    });

    it("returns explicit targets when selected", () => {
      expect(resolveSelectedTargets({ project: true, codex: true })).toEqual([
        "project",
        "codex",
      ]);
    });
  });

  describe("collectSkillSourceDirs", () => {
    it("includes cli package skills and installed @assistant-ui package skills", () => {
      const cliPackageRoot = path.join(tempDir, "cli-pkg");
      fs.mkdirSync(path.join(cliPackageRoot, "skills"), { recursive: true });
      writeSkill(
        path.join(cliPackageRoot, "skills"),
        "assistant-ui-bug-report",
      );

      const cwd = path.join(tempDir, "project");
      const scopedSkills = path.join(
        cwd,
        "node_modules",
        "@assistant-ui",
        "react",
        "skills",
      );
      fs.mkdirSync(scopedSkills, { recursive: true });
      writeSkill(scopedSkills, "changeset");

      const ignoredSkills = path.join(
        cwd,
        "node_modules",
        "random-pkg",
        "skills",
      );
      fs.mkdirSync(ignoredSkills, { recursive: true });
      writeSkill(ignoredSkills, "ignored");

      const sourceDirs = collectSkillSourceDirs(cwd, cliPackageRoot);
      expect(sourceDirs).toContain(
        normalize(path.join(cliPackageRoot, "skills")),
      );
      expect(sourceDirs).toContain(normalize(scopedSkills));
      expect(sourceDirs).not.toContain(normalize(ignoredSkills));
    });
  });

  describe("discoverSkills", () => {
    it("deduplicates skills by name and keeps the first source", () => {
      const sourceA = path.join(tempDir, "source-a");
      const sourceB = path.join(tempDir, "source-b");
      fs.mkdirSync(sourceA, { recursive: true });
      fs.mkdirSync(sourceB, { recursive: true });

      writeSkill(sourceA, "assistant-ui-bug-report", "# from-a\n");
      writeSkill(sourceB, "assistant-ui-bug-report", "# from-b\n");
      writeSkill(sourceB, "changeset", "# changeset\n");

      const discovered = discoverSkills([sourceA, sourceB]);
      expect(discovered.size).toBe(2);
      expect(discovered.get("assistant-ui-bug-report")).toBe(
        path.join(sourceA, "assistant-ui-bug-report"),
      );
      expect(discovered.get("changeset")).toBe(path.join(sourceB, "changeset"));
    });
  });

  describe("installSkillsToTargets", () => {
    it("copies skills and supports overwrite=false", () => {
      const sourceRoot = path.join(tempDir, "source");
      fs.mkdirSync(sourceRoot, { recursive: true });
      writeSkill(sourceRoot, "assistant-ui-bug-report", "# v1\n");

      const skills = new Map<string, string>([
        [
          "assistant-ui-bug-report",
          path.join(sourceRoot, "assistant-ui-bug-report"),
        ],
      ]);
      const targetRoot = path.join(tempDir, "dest");

      const first = installSkillsToTargets(skills, [targetRoot], {
        overwrite: true,
        dryRun: false,
      });
      expect(first).toEqual({ copied: 1, skipped: 0 });
      expect(
        fs.readFileSync(
          path.join(targetRoot, "assistant-ui-bug-report", "SKILL.md"),
          "utf8",
        ),
      ).toContain("v1");

      fs.writeFileSync(
        path.join(sourceRoot, "assistant-ui-bug-report", "SKILL.md"),
        "# v2\n",
      );

      const second = installSkillsToTargets(skills, [targetRoot], {
        overwrite: false,
        dryRun: false,
      });
      expect(second).toEqual({ copied: 0, skipped: 1 });
      expect(
        fs.readFileSync(
          path.join(targetRoot, "assistant-ui-bug-report", "SKILL.md"),
          "utf8",
        ),
      ).toContain("v1");
    });

    it("skips when source and destination are the same path", () => {
      const sourceRoot = path.join(tempDir, "source");
      fs.mkdirSync(sourceRoot, { recursive: true });
      writeSkill(sourceRoot, "assistant-ui-bug-report", "# original\n");

      const sourceSkillDir = path.join(sourceRoot, "assistant-ui-bug-report");
      const skills = new Map<string, string>([
        ["assistant-ui-bug-report", sourceSkillDir],
      ]);

      const result = installSkillsToTargets(skills, [sourceRoot], {
        overwrite: true,
        dryRun: false,
      });

      expect(result).toEqual({ copied: 0, skipped: 1 });
      expect(fs.existsSync(path.join(sourceSkillDir, "SKILL.md"))).toBe(true);
      expect(
        fs.readFileSync(path.join(sourceSkillDir, "SKILL.md"), "utf8"),
      ).toBe("# original\n");
    });
  });

  describe("resolveTargetPaths", () => {
    it("maps targets to expected directories", () => {
      const projectRoot = path.join(tempDir, "project");
      const homeRoot = path.join(tempDir, "home");
      const paths = resolveTargetPaths(
        projectRoot,
        ["project", "codex", "claude", "cursor"],
        homeRoot,
      );

      expect(paths).toEqual([
        path.join(projectRoot, "skills"),
        path.join(homeRoot, ".codex", "skills"),
        path.join(homeRoot, ".claude", "skills"),
        path.join(homeRoot, ".cursor", "skills"),
      ]);
    });
  });
});
