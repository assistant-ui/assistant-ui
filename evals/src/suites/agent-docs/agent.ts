import { execFileSync, spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  openSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** Where the agent finds the docs, by arm: the same task prompt otherwise. */
export type DocsMode = "local" | "web" | "bundled";

export const BUNDLED_DOCS_DIR = ".assistant-ui-docs";

const docsParagraph = (mode: DocsMode, docsDir: string) =>
  mode === "web"
    ? `Documentation: the assistant-ui docs are on the web at ${docsDir}. Start from ${docsDir}/llms.txt, the index the site serves to agents; append \`.md\` to any docs page URL for its markdown, and fetch pages with curl. Use these docs to learn assistant-ui. The network is open only for those docs, for installing things (the npm registry, the assistant-ui and shadcn component registries, GitHub downloads) and for localhost.`
    : mode === "bundled"
      ? `Documentation: the assistant-ui docs are saved in this folder under ${BUNDLED_DOCS_DIR}/, and AGENTS.md indexes them. Use these docs to learn assistant-ui. The network is open only for installing things (the npm registry, the assistant-ui and shadcn component registries, GitHub downloads) and for localhost, so read the docs from this folder rather than the web.`
      : `Documentation: the assistant-ui docs are saved in ${docsDir}. Start from ${docsDir}/llms.txt, the index the site serves to agents; every page it links is saved there as markdown. Use these docs to learn assistant-ui. The network is open only for installing things (the npm registry, the assistant-ui and shadcn component registries, GitHub downloads) and for localhost, so read the docs from this folder rather than the web.`;

/** The fixed instructions every trial gets; only the task, the docs' location and the addresses change. `docsDir` is the docs site's URL in web mode. */
export function agentPrompt(
  task: string,
  docsDir: string,
  mockUrl: string,
  mode: DocsMode = "local",
  appPort = 3000,
) {
  return `You are a coding agent. A developer asked you to build the app below with assistant-ui, a React library for AI chat interfaces.

Work in the current directory${mode === "bundled" ? ", which holds only the docs" : ", which is empty"}. Build the app here.

${docsParagraph(mode, docsDir)}

Every app must:
- Use Next.js (App Router) with TypeScript and npm. \`npm run build\` must pass, \`npm run start\` must serve the app, and the chat is on the home page \`/\`.
- Use the model server running at ${mockUrl}/v1. It is OpenAI-compatible (Chat Completions and Responses APIs), takes any API key (use "mock"), and serves the model id "mock-1". It is a scripted mock, not a real model: unless the task says otherwise it replies "Echo: <the user's last message>". Keep this exact address; don't use any other model provider.
- Before you finish, build the app and check that the feature works. To try it, start it on port ${appPort}. You don't need to stop the servers you start: everything you leave running is stopped when you finish.
- The hosts above are already open to the shell, and no other can be added: don't pass \`allowed_domains\` to a shell command, which is refused here. No browser can start here either: check the app with the build and with curl against the running server; the harness opens it in Chrome after you finish.

The task:
${task}

When you're done, reply with a short summary of what you built, then list anything in the docs that was missing, wrong, outdated or hard to find, with the page you were on.`;
}

export interface AgentRun {
  exitCode: number | null;
  timedOut: boolean;
  seconds: number;
  transcript: string;
  auth: AgentAuth;
}

/** What Claude Code signs in with: a Claude plan token, an API key, or the machine's own `claude` login. */
export type AgentAuth =
  | "CLAUDE_CODE_OAUTH_TOKEN"
  | "ANTHROPIC_API_KEY"
  | "stored login";

/**
 * A plan token (`claude setup-token`) wins over an API key, and either over the machine's own login.
 * Claude Code's own order is the other way round (`-p` takes `ANTHROPIC_API_KEY` first), so only the
 * chosen variable is passed on.
 */
export function agentAuth(source: NodeJS.ProcessEnv = process.env): {
  auth: AgentAuth;
  env: Record<string, string>;
} {
  for (const name of [
    "CLAUDE_CODE_OAUTH_TOKEN",
    "ANTHROPIC_API_KEY",
  ] as const) {
    const value = source[name];
    if (value) return { auth: name, env: { [name]: value } };
  }
  return { auth: "stored login", env: {} };
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

/** lsof lives in /usr/sbin on macOS and /usr/bin on most Linux systems; the cleanup needs it. */
const lsof = () => {
  const found = ["/usr/sbin/lsof", "/usr/bin/lsof"].find((path) =>
    existsSync(path),
  );
  if (!found) {
    throw new Error(
      "agent-docs needs lsof to stop the servers an agent leaves running; install it.",
    );
  }
  return found;
};

/**
 * The file tools are fenced by `blockWritesOutsideWorkingDirectories` (Claude Code 2.1.314) and
 * `blockFileToolReadsOutsideWorkingDirectories` (read only from --settings, as here; checked on
 * 2.1.332); an older CLI ignores the keys and would let Read, Write and Edit reach anywhere.
 */
const requireWriteFence = (claude: string) => {
  const version = /(\d+)\.(\d+)\.(\d+)/.exec(
    execFileSync(claude, ["--version"], { encoding: "utf8" }),
  );
  const [major, minor, patch] = (version?.slice(1) ?? []).map(Number);
  const ok =
    major !== undefined &&
    minor !== undefined &&
    patch !== undefined &&
    (major > 2 ||
      (major === 2 && (minor > 1 || (minor === 1 && patch >= 332))));
  if (!ok) {
    throw new Error(
      `agent-docs needs Claude Code 2.1.332 or later for its file-tool fence; found ${version?.[0] ?? "an unknown version"}.`,
    );
  }
};

/** Processes whose working directory is `dir` or inside it. */
const runningIn = (lsofBin: string, dir: string) => {
  let listing = "";
  try {
    listing = execFileSync(lsofBin, ["-d", "cwd", "-Fpn"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    // lsof exits 1 when it can't inspect some processes but still prints the rest.
    const { stdout } = error as { stdout?: string };
    if (stdout === undefined) throw error;
    listing = stdout;
  }
  const pids: number[] = [];
  let pid = 0;
  for (const line of listing.split("\n")) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    else if (
      line.startsWith("n") &&
      (line.slice(1) === dir || line.slice(1).startsWith(`${dir}/`)) &&
      pid !== process.pid
    ) {
      pids.push(pid);
    }
  }
  return pids;
};

/**
 * The folders the agent's shell may read so the tools on its PATH run, even from the home directory
 * (an nvm or fnm install): node's own folder, and the npm package a script tool such as npm or
 * corepack lives in. Never an install root, which can be `~/.local` with keyrings and history beside
 * it, and never the home directory or one of its parents.
 */
export function toolchainReads(realPaths: string[], home: string) {
  const folder = (path: string) => {
    for (let dir = dirname(path); dir !== dirname(dir); dir = dirname(dir)) {
      if (basename(dirname(dir)) === "node_modules") return dir;
    }
    return dirname(path);
  };
  const holdsHome = (dir: string) =>
    home === dir || home.startsWith(dir.endsWith("/") ? dir : `${dir}/`);
  return [...new Set(realPaths.map(folder))].filter((dir) => !holdsHome(dir));
}

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
  /** A docs folder outside the project to make readable; none when the docs are on the web or in the project. */
  docsDir?: string | undefined;
  model: string;
  timeoutMs: number;
  /**
   * A docs site the agent reads with its shell, such as the live one. Only the shell's network is
   * fenced to it: WebFetch isn't sandboxed and a bypassed permission prompt can't limit its hosts,
   * so the agent gets no WebFetch.
   */
  webDocs?: string | undefined;
  /** More hosts its shell may reach. */
  extraDomains?: string[] | undefined;
  /** More environment variables for the agent and its shell. */
  extraEnv?: Record<string, string> | undefined;
}): Promise<AgentRun> {
  const { projectDir, docsDir } = opts;
  // Absolute, so the cleanup can match it against the working folders lsof reports.
  const runDir = resolve(opts.runDir);
  const claude = process.env.CLAUDE_BIN ?? which("claude");
  requireWriteFence(claude);
  // Before any work, so a machine without it fails at once rather than after the agent ran.
  const lsofBin = lsof();
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
  const webHost = opts.webDocs ? new URL(opts.webDocs).hostname : undefined;
  const toolchain = toolchainReads(
    ["node", "npm", "npx", "corepack"].flatMap((tool) => {
      try {
        return [realpathSync(which(tool))];
      } catch {
        return [];
      }
    }),
    home,
  );
  // create-next-app, shadcn and the assistant-ui CLI keep a preferences file here.
  const cliPrefs = ["create-next-app", "shadcn", "assistant-ui"].map((cli) =>
    process.platform === "darwin"
      ? `~/Library/Preferences/${cli}-nodejs`
      : `~/.config/${cli}-nodejs`,
  );
  // Short, so the sandbox keeps it as the shell's $TMPDIR.
  const tmp = mkdtempSync("/tmp/aui-ad-");
  // More folders the agent must neither read nor write, such as other work on this machine (comma-separated).
  const privateDirs =
    process.env.AGENT_DOCS_PRIVATE_DIRS?.split(",").filter(Boolean) ?? [];
  const settings = {
    permissions: {
      allow: ["Read", "Edit", "Write", "Glob", "Grep", "Bash"],
      // The file tools run outside the sandbox, so they are fenced here: no reads or writes outside the
      // working folders, and no writes into the docs, which every trial of the run shares. The shell's
      // fence is the sandbox alone: blockReadsOutsideWorkingDirectories also bound shell commands and
      // refused about half the trials' ordinary ones (`cd <docs>; cat x.md`, a path under $TMPDIR, a
      // command with several parts), where the sandbox's denyRead already keeps the shell out.
      deny: [
        "WebFetch",
        "WebSearch",
        ...(docsDir ? [`Edit(/${docsDir}/**)`, `Write(/${docsDir}/**)`] : []),
      ],
      blockFileToolReadsOutsideWorkingDirectories: true,
      blockWritesOutsideWorkingDirectories: true,
    },
    sandbox: {
      enabled: true,
      failIfUnavailable: true,
      autoAllowBashIfSandboxed: true,
      allowUnsandboxedCommands: false,
      filesystem: {
        // The agent must learn from the docs, not from a checkout of assistant-ui, and must not see secrets:
        // nothing in the home directory is readable except the CLI preference files it needs.
        denyRead: ["~/", repoRoot, ...privateDirs],
        allowRead: [
          runDir,
          ...(docsDir ? [docsDir] : []),
          ...cliPrefs,
          ...toolchain,
        ],
        denyWrite: privateDirs,
        allowWrite: [runDir, ...cliPrefs],
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
          ...(webHost ? [webHost] : []),
          ...(opts.extraDomains ?? []),
        ],
        allowLocalBinding: true,
        strictAllowlist: true,
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
    SHELL: process.platform === "darwin" ? "/bin/zsh" : "/bin/bash",
    TERM: "dumb",
    LANG: "en_US.UTF-8",
    PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`,
    TMPDIR: join(runDir, "tmp"),
    npm_config_cache: join(runDir, "npm-cache"),
    npm_config_userconfig: join(runDir, "npmrc"),
    // The scrub below drops `npm_config_userconfig` from the shell, so its settings come this way too.
    npm_config_fund: "false",
    npm_config_audit: "false",
    NEXT_TELEMETRY_DISABLED: "1",
    // Its own temp folder, so trials running side by side never share scratch files.
    CLAUDE_CODE_TMPDIR: tmp,
    // If the agent runs `assistant-ui setup`, it must not open a browser on this machine.
    SETUP_AGENT_BROWSER: "/usr/bin/true",
    ...opts.extraEnv,
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
    // Claude Code keeps the credential for its own calls; the agent's shell and the servers it starts
    // never see it. Set on every run, so each way of signing in runs the same agent.
    CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: "1",
  };
  if (process.env.CLAUDE_CONFIG_DIR) {
    env.CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;
  }
  // Only the chosen sign-in reaches Claude Code.
  const signIn = agentAuth();
  delete env.CLAUDE_CODE_OAUTH_TOKEN;
  delete env.ANTHROPIC_API_KEY;
  Object.assign(env, signIn.env);

  const transcript = join(runDir, "transcript.jsonl");
  const out = openSync(transcript, "w");
  const err = openSync(join(runDir, "agent.stderr.log"), "w");
  const started = Date.now();
  const child = spawn(
    claude,
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
      ...(docsDir ? ["--add-dir", docsDir] : []),
      "--permission-mode",
      // The sandbox, not the permission prompt, is the boundary: every command runs inside it.
      "bypassPermissions",
      "--output-format",
      "stream-json",
      "--verbose",
    ],
    // Its own process group, so everything it starts can be stopped together at the end.
    { cwd: projectDir, env, stdio: ["ignore", out, err], detached: true },
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
  // `claude -p` stays up while background tasks it started still run, and wakes for each one that ends,
  // so once the agent has answered it gets a short grace period and is then stopped.
  let answeredAt: number | undefined;
  while (!exited) {
    for (const pid of descendants(child.pid!)) seen.add(pid);
    if (
      answeredAt === undefined &&
      readFileSync(transcript, "utf8").includes('"type":"result"')
    ) {
      answeredAt = Date.now();
    }
    if (answeredAt !== undefined && Date.now() > answeredAt + 30_000) {
      kill(child.pid!);
      break;
    }
    if (Date.now() > deadline) {
      timedOut = true;
      kill(child.pid!);
      break;
    }
    await Promise.race([exit, sleep(3_000)]);
  }
  const exitCode = await exit;
  // The agent's process group first, then anything that left it: tracked descendants still parented
  // by the agent's tree or orphaned, so a reused PID is never hit.
  kill(-child.pid!);
  const table = execFileSync("/bin/ps", ["-axo", "pid=,ppid="], {
    encoding: "utf8",
  });
  for (const line of table.trim().split("\n")) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    if (seen.has(pid!) && (ppid === 1 || seen.has(ppid!))) kill(pid!);
  }
  // Servers the agent started in the background often leave its process tree at once, so also
  // stop anything still running from inside the trial folder.
  for (const pid of runningIn(lsofBin, runDir)) kill(pid);
  closeSync(out);
  closeSync(err);
  rmSync(tmp, { recursive: true, force: true });
  return {
    exitCode,
    timedOut,
    seconds: Math.round((Date.now() - started) / 1000),
    transcript,
    auth: signIn.auth,
  };
}
