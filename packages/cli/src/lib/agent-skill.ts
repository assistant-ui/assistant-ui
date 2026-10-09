import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { withStagedDownload } from "./utils/download";
import { dlxCommand, type PackageManagerName } from "./utils/package-manager";

export const SKILLS_PACKAGE = "assistant-ui/skills";
export const SKILLS_COMMIT = "139674dc888ee076982b6726e8e6f5d0fe0b5f67";
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
  const marker = path.join(dir, ".claude-plugin", "plugin.json");
  if (fs.existsSync(marker)) return dir;

  const parent = path.dirname(dir);
  await fs.promises.mkdir(parent, { recursive: true });
  const staging = await fs.promises.mkdtemp(path.join(parent, ".staging-"));
  // Node emits no "exit" when a signal kills the process, so the staging
  // directory is removed on the signal and the signal re-raised. The
  // listeners stay armed until the removal runs, which a download that
  // outlives the timeout defers past the caller's own exit.
  const removeStaging = () => {
    process.removeListener("exit", removeStaging);
    process.removeListener("SIGINT", removeStagingOnSignal);
    process.removeListener("SIGTERM", removeStagingOnSignal);
    fs.rmSync(staging, { recursive: true, force: true });
  };
  const removeStagingOnSignal = (signal: NodeJS.Signals) => {
    removeStaging();
    process.kill(process.pid, signal);
  };
  process.once("exit", removeStaging);
  process.once("SIGINT", removeStagingOnSignal);
  process.once("SIGTERM", removeStagingOnSignal);

  await withStagedDownload(
    SKILLS_PLUGIN_SOURCE,
    { dir: staging, preferOffline: true, silent: true },
    "Download timed out.",
    removeStaging,
    async (download) => {
      await download.catch((error: unknown) => {
        throw new Error(
          "Could not fetch the assistant-ui skills from GitHub. Check your network, or set GITHUB_TOKEN if you are rate limited.",
          { cause: error },
        );
      });
      await publish(staging, dir, marker);
    },
  );

  return dir;
}

// A rename fails when the target directory exists and is not empty. A
// concurrent invocation that published the same commit meanwhile wins and
// the staged copy is dropped; a directory without the marker is a stale
// partial cache and is replaced.
async function publish(
  staging: string,
  dir: string,
  marker: string,
  retry = true,
): Promise<void> {
  try {
    await fs.promises.rename(staging, dir);
  } catch (error) {
    if (fs.existsSync(marker)) return;
    if (!retry) throw error;
    await fs.promises.rm(dir, { recursive: true, force: true });
    await publish(staging, dir, marker, false);
  }
}
