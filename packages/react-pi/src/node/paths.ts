import { join } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";

// Pi exports neither its path resolver nor its session directory encoder. An
// in-memory session resolves a path exactly as Pi does without touching disk.
export const resolvePiPath = (path: string): string =>
  SessionManager.inMemory(path).getCwd();

export const getPiSessionDirectory = (
  cwd: string,
  agentDir: string,
): string => {
  const name = `--${resolvePiPath(cwd)
    .replace(/^[/\\]/, "")
    .replace(/[/\\:]/g, "-")}--`;
  return join(agentDir, "sessions", name);
};
