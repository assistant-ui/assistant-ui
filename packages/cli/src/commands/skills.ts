import { Command } from "commander";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/utils/logger";

const KNOWN_AUI_UNSCOPED_PACKAGES = [
  "assistant-cloud",
  "assistant-stream",
  "assistant-ui",
  "create-assistant-ui",
  "mcp-app-studio",
  "safe-content-frame",
  "tw-glass",
  "tw-shimmer",
] as const;

export type SkillTarget = "project" | "codex" | "claude" | "cursor";

function isDirectoryOrSymlink(entryPath: string): boolean {
  try {
    const stat = fs.lstatSync(entryPath);
    return stat.isDirectory() || stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function resolveCliPackageRoot(currentFileUrl: string): string {
  const currentFilePath = fileURLToPath(currentFileUrl);
  return path.resolve(path.dirname(currentFilePath), "..", "..");
}

function asNormalizedPath(entryPath: string): string {
  try {
    return fs.realpathSync(entryPath);
  } catch {
    return path.resolve(entryPath);
  }
}

function isSamePath(leftPath: string, rightPath: string): boolean {
  return asNormalizedPath(leftPath) === asNormalizedPath(rightPath);
}

function addSkillsDirIfPresent(
  paths: Set<string>,
  candidatePath: string,
): void {
  if (!isDirectoryOrSymlink(candidatePath)) return;
  paths.add(asNormalizedPath(candidatePath));
}

export function collectSkillSourceDirs(
  cwd: string,
  cliPackageRoot: string = resolveCliPackageRoot(import.meta.url),
): string[] {
  const sourcePaths = new Set<string>();

  addSkillsDirIfPresent(sourcePaths, path.join(cliPackageRoot, "skills"));

  const nodeModulesPath = path.join(cwd, "node_modules");
  if (!isDirectoryOrSymlink(nodeModulesPath)) {
    return [...sourcePaths];
  }

  const scopedRoot = path.join(nodeModulesPath, "@assistant-ui");
  if (isDirectoryOrSymlink(scopedRoot)) {
    for (const entry of fs.readdirSync(scopedRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const skillsDir = path.join(scopedRoot, entry.name, "skills");
      addSkillsDirIfPresent(sourcePaths, skillsDir);
    }
  }

  for (const packageName of KNOWN_AUI_UNSCOPED_PACKAGES) {
    const skillsDir = path.join(nodeModulesPath, packageName, "skills");
    addSkillsDirIfPresent(sourcePaths, skillsDir);
  }

  return [...sourcePaths];
}

export function discoverSkills(sourceDirs: string[]): Map<string, string> {
  const skillSources = new Map<string, string>();

  for (const sourceDir of sourceDirs) {
    if (!isDirectoryOrSymlink(sourceDir)) continue;

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

      const skillDir = path.join(sourceDir, entry.name);
      const skillFile = path.join(skillDir, "SKILL.md");
      if (!fs.existsSync(skillFile)) continue;
      if (skillSources.has(entry.name)) continue;

      skillSources.set(entry.name, skillDir);
    }
  }

  return skillSources;
}

export function resolveTargetPaths(
  cwd: string,
  targets: SkillTarget[],
  homeDir: string = os.homedir(),
): string[] {
  return targets.map((target) => {
    if (target === "project") return path.join(cwd, "skills");
    if (target === "codex") return path.join(homeDir, ".codex", "skills");
    if (target === "claude") return path.join(homeDir, ".claude", "skills");
    return path.join(homeDir, ".cursor", "skills");
  });
}

export function resolveSelectedTargets(opts: {
  all?: boolean;
  project?: boolean;
  codex?: boolean;
  claude?: boolean;
  cursor?: boolean;
}): SkillTarget[] {
  if (opts.all) return ["project", "codex", "claude", "cursor"];

  const targets: SkillTarget[] = [];
  if (opts.project) targets.push("project");
  if (opts.codex) targets.push("codex");
  if (opts.claude) targets.push("claude");
  if (opts.cursor) targets.push("cursor");

  if (targets.length === 0) {
    return ["project", "codex", "claude", "cursor"];
  }

  return targets;
}

export function installSkillsToTargets(
  skills: Map<string, string>,
  targetPaths: string[],
  options: { overwrite: boolean; dryRun: boolean },
): { copied: number; skipped: number } {
  let copied = 0;
  let skipped = 0;

  for (const targetPath of targetPaths) {
    if (!options.dryRun) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    for (const [skillName, sourceDir] of skills) {
      const destinationDir = path.join(targetPath, skillName);
      if (isSamePath(sourceDir, destinationDir)) {
        skipped += 1;
        continue;
      }

      const exists = fs.existsSync(destinationDir);
      if (exists && !options.overwrite) {
        skipped += 1;
        continue;
      }

      if (!options.dryRun) {
        fs.rmSync(destinationDir, { recursive: true, force: true });
        fs.cpSync(sourceDir, destinationDir, { recursive: true });
      }

      copied += 1;
    }
  }

  return { copied, skipped };
}

export const skills = new Command()
  .name("skills")
  .description("install assistant-ui skills into agent-visible skill folders")
  .option("--all", "install to project and all known agent skill folders")
  .option("--project", "install to ./skills in the current working directory")
  .option("--codex", "install to ~/.codex/skills")
  .option("--claude", "install to ~/.claude/skills")
  .option("--cursor", "install to ~/.cursor/skills")
  .option(
    "-c, --cwd <cwd>",
    "working directory used for discovery",
    process.cwd(),
  )
  .option("--no-overwrite", "do not replace existing skills in target folders")
  .option("--dry-run", "print what would be installed without writing files")
  .action((opts) => {
    const targets = resolveSelectedTargets(opts);
    const sourceDirs = collectSkillSourceDirs(opts.cwd);
    const discoveredSkills = discoverSkills(sourceDirs);

    if (discoveredSkills.size === 0) {
      logger.error(
        "No assistant-ui skills were found. Install an assistant-ui package first.",
      );
      process.exit(1);
    }

    const targetPaths = resolveTargetPaths(opts.cwd, targets);
    logger.info(`Found ${discoveredSkills.size} skill(s).`);
    logger.info(`Targets: ${targetPaths.join(", ")}`);
    logger.break();

    const result = installSkillsToTargets(discoveredSkills, targetPaths, {
      overwrite: opts.overwrite,
      dryRun: Boolean(opts.dryRun),
    });

    const mode = opts.dryRun
      ? "Dry run complete"
      : "Skill installation complete";
    logger.success(
      `${mode}: copied ${result.copied}, skipped ${result.skipped}.`,
    );
  });
