import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const resolvePiPath = (path: string): string => {
  if (path.startsWith("file://")) return fileURLToPath(path);
  if (path === "~") return homedir();
  if (
    path.startsWith("~/") ||
    (process.platform === "win32" && path.startsWith("~\\"))
  ) {
    return resolve(join(homedir(), path.slice(2)));
  }
  return resolve(path);
};

export const getPiSessionDirectory = (
  cwd: string,
  agentDir: string,
): string => {
  // Pi's workspace directory encoder is not exported from its package entry.
  const name = `--${resolvePiPath(cwd)
    .replace(/^[/\\]/, "")
    .replace(/[/\\:]/g, "-")}--`;
  return join(agentDir, "sessions", name);
};
