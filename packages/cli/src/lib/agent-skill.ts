import { dlxCommand, type PackageManagerName } from "./create-project";

export const SKILLS_PACKAGE = "assistant-ui/skills";

export function resolveSkillsInstall(params: {
  skills?: boolean;
  stdinIsTTY?: boolean;
}): boolean | undefined {
  const { skills, stdinIsTTY = process.stdin.isTTY } = params;
  if (skills !== undefined) return skills;
  if (!stdinIsTTY) return true;
  return undefined;
}

export function buildSkillsAddCommand(
  pm: PackageManagerName,
  params: { stdinIsTTY?: boolean } = {},
): [string, string[]] {
  const { stdinIsTTY = process.stdin.isTTY } = params;
  const [command, dlxArgs] = dlxCommand(pm);
  const args = [...dlxArgs, "skills", "add", SKILLS_PACKAGE];

  // Without a TTY the skills CLI cannot prompt for agent platforms, so skip its
  // confirmation; with a TTY it owns the platform selection interactively.
  if (!stdinIsTTY) args.push("--yes");

  return [command, args];
}
