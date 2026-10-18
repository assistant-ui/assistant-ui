import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { getPiSessionDirectory } from "./paths";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "pi-session-path-"));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

it.each([
  ["a plain path", (dir: string) => dir],
  ["a trailing separator", (dir: string) => `${dir}/`],
  [
    "a repeated separator",
    (dir: string) => dir.replace("/workspace", "//workspace"),
  ],
  [
    "a file URL with a trailing separator",
    (dir: string) => `${pathToFileURL(dir).href}/`,
  ],
])("matches Pi's session directory for %s", (_, spell) => {
  const agentDir = join(root, "agent");
  const workspace = spell(join(root, "workspace"));
  vi.stubEnv("PI_CODING_AGENT_DIR", agentDir);
  expect(getPiSessionDirectory(workspace, agentDir)).toBe(
    SessionManager.create(workspace).getSessionDir(),
  );
});
