import { execFileSync, spawn } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const LIBRARY_PRIVATE = [
  "Keychains",
  "Application Support",
  "Containers",
  "Group Containers",
  "Cookies",
  "Mail",
  "Messages",
  "Safari",
  "Accounts",
];

/** The fixed instructions every trial gets; only the task and the addresses change. */
export function agentPrompt(task: string, docsDir: string, mockUrl: string) {
  return `You are a coding agent. A developer asked you to build the app below with assistant-ui, a React library for AI chat interfaces.

Work in the current directory, which is empty. Build the app here.

Documentation: the assistant-ui docs are saved in ${docsDir}. Start from ${docsDir}/llms.txt, the index the site serves to agents; every page it links is saved there as markdown. Use these docs to learn assistant-ui. The network is open only for installing things (the npm registry, the assistant-ui and shadcn component registries, GitHub downloads) and for localhost, so read the docs from this folder rather than the web.

Every app must:
- Use Next.js (App Router) with TypeScript and npm. \`npm run build\` must pass, \`npm run start\` must serve the app, and the chat is on the home page \`/\`.
- Use the model server running at ${mockUrl}/v1. It is OpenAI-compatible (Chat Completions and Responses APIs), takes any API key (use "mock"), and serves the model id "mock-1". It is a scripted mock, not a real model: unless the task says otherwise it replies "Echo: <the user's last message>". Keep this exact address; don't use any other model provider.
- Before you finish, build the app and check that the feature works. You may start the app on any free port; stop every server you started before you finish.

The task:
${task}

When you're done, reply with a short summary of what you built, then list anything in the docs that was missing, wrong, outdated or hard to find, with the page you were on.`;
}

export interface AgentRun {
  exitCode: number | null;
  timedOut: boolean;
  seconds: number;
  transcript: string;
}

const which = (name: string) =>
  execFileSync("/usr/bin/which", [name], { encoding: "utf8" }).trim();

const descendants = (root: number) => {
  const table = execFileSync("/bin/ps", ["-axo", "pid=,ppid="], {
    encoding: "utf8",
  });
  const children = new Map<number, number[]>();
  for (const line of table.trim().split("\n")) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    children.set(ppid!, [...(children.get(ppid!) ?? []), pid!]);
  }
  const out: number[] = [];
  const stack = [root];
  while (stack.length) {
    for (const child of children.get(stack.pop()!) ?? []) {
      out.push(child);
      stack.push(child);
    }
  }
  return out;
};

const kill = (pid: number) => {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Already gone.
  }
};

/**
 * Runs Claude Code headless in `projectDir` with the docs folder readable and
 * nothing else of this machine: its shell runs in Claude Code's sandbox with
 * reads of the home directory's private folders denied, writes limited to the
 * run folder, and network limited to package registries and localhost. It
 * gets a scrubbed environment and a PATH with only node, npm, npx and pnpm.
 * Every process it starts is tracked and killed when it ends.
 */
export async function runAgent(opts: {
  prompt: string;
  runDir: string;
  projectDir: string;
  docsDir: string;
  model: string;
  timeoutMs: number;
}): Promise<AgentRun> {
  const { runDir, projectDir, docsDir } = opts;
  const bin = join(runDir, "bin");
  mkdirSync(bin, { recursive: true });
  for (const tool of ["node", "npm", "npx", "pnpm", "corepack"]) {
    try {
      symlinkSync(which(tool), join(bin, tool));
    } catch {
      // Not installed or already linked.
    }
  }
  mkdirSync(join(runDir, "tmp"), { recursive: true });
  writeFileSync(join(runDir, "npmrc"), "fund=false\naudit=false\n");

  const home = homedir();
  // More folders the agent must neither read nor write, such as other work on this machine (comma-separated).
  const privateDirs =
    process.env.AGENT_DOCS_PRIVATE_DIRS?.split(",").filter(Boolean) ?? [];
  const settings = {
    permissions: {
      allow: ["Read", "Edit", "Write", "Glob", "Grep", "Bash"],
      deny: ["WebFetch", "WebSearch"],
      blockReadsOutsideWorkingDirectories: true,
    },
    sandbox: {
      enabled: true,
      failIfUnavailable: true,
      autoAllowBashIfSandboxed: true,
      allowUnsandboxedCommands: false,
      filesystem: {
        // The agent must learn from the docs, not from a checkout of assistant-ui, and must not see secrets.
        denyRead: [
          repoRoot,
          "~/code",
          "~/.nomos",
          "~/.ssh",
          "~/.aws",
          "~/.config",
          "~/.claude",
          "~/.npmrc",
          "~/.netrc",
          "~/Documents",
          "~/Desktop",
          "~/Downloads",
          ...LIBRARY_PRIVATE.map((dir) => `~/Library/${dir}`),
          ...privateDirs,
        ],
        denyWrite: privateDirs,
        allowWrite: [
          runDir,
          // create-next-app, shadcn and the assistant-ui CLI keep a preferences file here.
          ...["create-next-app", "shadcn", "assistant-ui"].map(
            (cli) => `~/Library/Preferences/${cli}-nodejs`,
          ),
        ],
      },
      network: {
        allowedDomains: [
          "registry.npmjs.org",
          "*.npmjs.org",
          "registry.yarnpkg.com",
          "r.assistant-ui.com",
          "ui.shadcn.com",
          "github.com",
          "codeload.github.com",
          "api.github.com",
          "fonts.googleapis.com",
          "fonts.gstatic.com",
          "localhost",
          "127.0.0.1",
        ],
        allowLocalBinding: true,
      },
    },
    autoMemoryEnabled: false,
  };
  const settingsFile = join(runDir, "settings.json");
  writeFileSync(settingsFile, JSON.stringify(settings, null, 2));

  const env: Record<string, string> = {
    HOME: home,
    USER: process.env.USER ?? "",
    LOGNAME: process.env.USER ?? "",
    SHELL: "/bin/zsh",
    TERM: "dumb",
    LANG: "en_US.UTF-8",
    PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`,
    TMPDIR: join(runDir, "tmp"),
    npm_config_cache: join(runDir, "npm-cache"),
    npm_config_userconfig: join(runDir, "npmrc"),
    NEXT_TELEMETRY_DISABLED: "1",
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
  };
  if (process.env.CLAUDE_CONFIG_DIR) {
    env.CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;
  }

  const transcript = join(runDir, "transcript.jsonl");
  const out = openSync(transcript, "w");
  const err = openSync(join(runDir, "agent.stderr.log"), "w");
  const started = Date.now();
  const child = spawn(
    process.env.CLAUDE_BIN ?? which("claude"),
    [
      "-p",
      opts.prompt,
      "--model",
      opts.model,
      "--setting-sources",
      "project",
      "--settings",
      settingsFile,
      "--strict-mcp-config",
      "--disable-slash-commands",
      "--tools",
      "Bash,Read,Write,Edit,Glob,Grep",
      "--add-dir",
      docsDir,
      "--permission-mode",
      "dontAsk",
      "--output-format",
      "stream-json",
      "--verbose",
    ],
    { cwd: projectDir, env, stdio: ["ignore", out, err] },
  );
  writeFileSync(join(runDir, "agent.pid"), `${child.pid}\n`);

  // Track every process the agent starts, so servers it forgot to stop don't outlive the trial.
  const seen = new Set<number>();
  let exited = false;
  const exit = new Promise<number | null>((resolve) =>
    child.once("exit", (code) => {
      exited = true;
      resolve(code);
    }),
  );
  let timedOut = false;
  const deadline = started + opts.timeoutMs;
  while (!exited) {
    for (const pid of descendants(child.pid!)) seen.add(pid);
    if (Date.now() > deadline) {
      timedOut = true;
      kill(child.pid!);
      break;
    }
    await Promise.race([exit, sleep(3_000)]);
  }
  const exitCode = await exit;
  // Only processes still parented by the agent's tree or orphaned, so a reused PID is never hit.
  const table = execFileSync("/bin/ps", ["-axo", "pid=,ppid="], {
    encoding: "utf8",
  });
  for (const line of table.trim().split("\n")) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    if (seen.has(pid!) && (ppid === 1 || seen.has(ppid!))) kill(pid!);
  }
  closeSync(out);
  closeSync(err);
  return {
    exitCode,
    timedOut,
    seconds: Math.round((Date.now() - started) / 1000),
    transcript,
  };
}
