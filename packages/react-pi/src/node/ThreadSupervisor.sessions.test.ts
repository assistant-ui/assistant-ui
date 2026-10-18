import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { PiThreadSupervisor } from "./ThreadSupervisor";

let root: string;
let cwd: string;
let defaultAgentDir: string;
let agentDir: string;
let defaultSession: SessionManager;
let customSession: SessionManager;
let otherSession: SessionManager;
const supervisors: PiThreadSupervisor[] = [];

const seedSession = (workspace: string, directory: string) => {
  vi.stubEnv("PI_CODING_AGENT_DIR", directory);
  const session = SessionManager.create(workspace);
  session.appendMessage({
    role: "user",
    content: "saved prompt",
    timestamp: 1,
  });
  session.appendMessage({
    role: "assistant",
    content: [{ type: "text", text: "saved reply" }],
    api: "openai-completions",
    provider: "fixture",
    model: "fixture",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "stop",
    timestamp: 2,
  });
  return session;
};

const createSupervisor = (directory?: string) => {
  const supervisor = new PiThreadSupervisor({
    workspacePath: cwd,
    ...(directory ? { agentDir: directory } : {}),
  });
  supervisors.push(supervisor);
  return supervisor;
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "pi-session-directory-"));
  cwd = join(root, "workspace");
  defaultAgentDir = join(root, "default-agent");
  agentDir = join(root, "custom-agent");
  await mkdir(cwd);
  vi.stubEnv("PI_OFFLINE", "1");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network request");
    }),
  );
  defaultSession = seedSession(cwd, defaultAgentDir);
  customSession = seedSession(cwd, agentDir);
  otherSession = seedSession(join(root, "other-workspace"), agentDir);
  vi.stubEnv("PI_CODING_AGENT_DIR", defaultAgentDir);
});

afterEach(async () => {
  for (const supervisor of supervisors.splice(0)) await supervisor.dispose();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await rm(root, { recursive: true, force: true });
});

describe("PiThreadSupervisor session directories", () => {
  it("keeps the SDK default when no agent directory is configured", async () => {
    const threads = await createSupervisor().listThreads();
    expect(threads.map((thread) => thread.id)).toEqual([
      defaultSession.getSessionId(),
    ]);
  });

  it.each(["absolute", "relative", "file-url", "tilde"])(
    "uses a %s agent directory for listing and reopening",
    async (form) => {
      const directory =
        form === "relative"
          ? relative(process.cwd(), agentDir)
          : form === "file-url"
            ? pathToFileURL(agentDir).href
            : form === "tilde"
              ? `~/${relative(homedir(), agentDir)}`
              : agentDir;
      const supervisor = createSupervisor(directory);
      const threads = await supervisor.listThreads();
      expect(threads.map((thread) => thread.id)).toEqual([
        customSession.getSessionId(),
      ]);
      const snapshot = await supervisor.getThread(customSession.getSessionId());
      expect(snapshot.messages).toMatchObject([
        { role: "user", content: "saved prompt" },
        { role: "assistant" },
      ]);
    },
  );

  it("creates sessions beside existing Pi sessions in the configured directory", async () => {
    const snapshot = await createSupervisor(agentDir).createThread();
    expect(dirname(snapshot.metadata.sessionFile!)).toBe(
      dirname(customSession.getSessionFile()!),
    );
  });

  it("reopens a cold session from another workspace in the configured directory", async () => {
    const snapshot = await createSupervisor(agentDir).getThread(
      otherSession.getSessionId(),
    );
    expect(snapshot.metadata.sessionFile).toBe(otherSession.getSessionFile());
  });

  it("does not fall back to sessions from the global agent directory", async () => {
    await expect(
      createSupervisor(agentDir).getThread(defaultSession.getSessionId()),
    ).rejects.toThrow("Unknown Pi thread");
  });

  it("reports an unknown thread when the custom sessions directory does not exist", async () => {
    await expect(
      createSupervisor(join(root, "empty-agent")).getThread("missing"),
    ).rejects.toThrow("Unknown Pi thread");
  });

  it("discovers a workspace directory linked into the custom session root", async () => {
    const linked = seedSession(
      join(root, "linked-workspace"),
      join(root, "external-agent"),
    );
    vi.stubEnv("PI_CODING_AGENT_DIR", defaultAgentDir);
    await symlink(
      dirname(linked.getSessionFile()!),
      join(agentDir, "sessions", "linked"),
      "dir",
    );
    const snapshot = await createSupervisor(agentDir).getThread(
      linked.getSessionId(),
    );
    expect(snapshot.metadata.id).toBe(linked.getSessionId());
  });
});
