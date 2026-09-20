import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { downloadTemplate } from "giget";
import { dlxCommand, resolveGitHubAuthToken } from "./create-project";
import { type PackageManagerName } from "./utils/package-manager";

export const SKILLS_PACKAGE = "assistant-ui/skills";
export const SKILLS_COMMIT = "66befc4468ce0691c9203442d70cbbdcb5562ea1";
export const SKILLS_PLUGIN_SOURCE = `gh:${SKILLS_PACKAGE}/assistant-ui#${SKILLS_COMMIT}`;

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

export function skillsPluginDir(): string {
  const cacheHome =
    process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  return path.join(cacheHome, "assistant-ui", "skills", SKILLS_COMMIT);
}

export async function ensureSkillsPlugin(): Promise<string> {
  const dir = skillsPluginDir();
  if (fs.existsSync(path.join(dir, ".claude-plugin", "plugin.json"))) {
    return dir;
  }

  const parent = path.dirname(dir);
  await fs.promises.mkdir(parent, { recursive: true });
  const staging = await fs.promises.mkdtemp(path.join(parent, ".staging-"));

  // giget logs to console.debug whenever DEBUG is set, which the `debug`
  // package does at module load for an unrelated namespace.
  const origDebug = process.env.DEBUG;
  delete process.env.DEBUG;
  try {
    const authToken = resolveGitHubAuthToken();
    await downloadTemplate(SKILLS_PLUGIN_SOURCE, {
      dir: staging,
      preferOffline: true,
      silent: true,
      ...(authToken ? { auth: authToken } : {}),
    }).catch((error: unknown) => {
      throw new Error(
        "Could not fetch the assistant-ui skills from GitHub. Check your network, or set GITHUB_TOKEN if you are rate limited.",
        { cause: error },
      );
    });
    await fs.promises.rm(dir, { recursive: true, force: true });
    await fs.promises.rename(staging, dir);
  } finally {
    if (origDebug !== undefined) process.env.DEBUG = origDebug;
    await fs.promises.rm(staging, { recursive: true, force: true });
  }

  return dir;
}
