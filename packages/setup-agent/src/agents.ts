import spawn from "cross-spawn";
import { accessSync, constants, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, isAbsolute, join, relative, sep } from "node:path";

/**
 * A coding agent a person can hand a setup to. `launch` is set when the
 * agent has a terminal command that opens an interactive session with a
 * first prompt; the others are handed the prompt to paste.
 */
export type CodingAgent = {
  kind: string;
  name: string;
  launch?: {
    /** Command names to try in order; the first one on PATH runs. */
    commands: readonly string[];
    args: (prompt: string) => string[];
    install: string;
  };
};

/** The coding agents people use most, in the order the picker lists them. */
export const CODING_AGENTS: readonly CodingAgent[] = [
  {
    kind: "claude",
    name: "Claude Code",
    launch: {
      commands: ["claude"],
      args: (prompt) => [prompt],
      install: "npm install -g @anthropic-ai/claude-code",
    },
  },
  {
    kind: "codex",
    name: "Codex",
    launch: {
      commands: ["codex"],
      args: (prompt) => [prompt],
      install: "npm install -g @openai/codex",
    },
  },
  {
    kind: "cursor",
    name: "Cursor",
    launch: {
      commands: ["cursor-agent", "agent"],
      args: (prompt) => [prompt],
      install: "curl https://cursor.com/install -fsS | bash",
    },
  },
  {
    kind: "gemini",
    name: "Gemini CLI",
    launch: {
      commands: ["gemini"],
      args: (prompt) => ["-i", prompt],
      install: "npm install -g @google/gemini-cli",
    },
  },
  {
    kind: "copilot",
    name: "Copilot CLI",
    launch: {
      commands: ["copilot"],
      args: (prompt) => ["-i", prompt],
      install: "npm install -g @github/copilot",
    },
  },
  { kind: "amp", name: "Amp" },
  {
    kind: "opencode",
    name: "OpenCode",
    launch: {
      commands: ["opencode"],
      args: (prompt) => ["--prompt", prompt],
      install: "npm install -g opencode-ai",
    },
  },
  { kind: "cline", name: "Cline" },
  { kind: "aider", name: "Aider" },
  { kind: "goose", name: "Goose" },
  { kind: "warp", name: "Warp" },
  { kind: "windsurf", name: "Windsurf" },
  {
    kind: "kiro",
    name: "Kiro",
    launch: {
      commands: ["kiro-cli"],
      args: (prompt) => ["chat", prompt],
      install: "curl -fsSL https://cli.kiro.dev/install | bash",
    },
  },
  { kind: "junie", name: "Junie" },
  {
    kind: "qwen",
    name: "Qwen Code",
    launch: {
      commands: ["qwen"],
      args: (prompt) => ["-i", prompt],
      install: "npm install -g @qwen-code/qwen-code",
    },
  },
  { kind: "roo", name: "Roo Code" },
  { kind: "zed", name: "Zed" },
  {
    kind: "augment",
    name: "Augment",
    launch: {
      commands: ["auggie"],
      args: (prompt) => [prompt],
      install: "npm install -g @augmentcode/auggie",
    },
  },
  {
    kind: "droid",
    name: "Factory Droid",
    launch: {
      commands: ["droid"],
      args: (prompt) => [prompt],
      install: "curl -fsSL https://app.factory.ai/cli | sh",
    },
  },
  { kind: "crush", name: "Crush" },
];

/** The variables each agent exports to the shells it runs commands in. */
const AGENT_ENV: readonly [kind: string, variable: string][] = [
  ["claude", "CLAUDECODE"],
  ["claude", "CLAUDE_CODE"],
  ["codex", "CODEX_SANDBOX"],
  ["codex", "CODEX_SANDBOX_NETWORK_DISABLED"],
  ["codex", "CODEX_CI"],
  ["codex", "CODEX_THREAD_ID"],
  ["cursor", "CURSOR_AGENT"],
  ["gemini", "GEMINI_CLI"],
  ["qwen", "QWEN_CODE"],
  ["copilot", "COPILOT_AGENT"],
  ["copilot", "COPILOT_CLI"],
  ["opencode", "OPENCODE_CLIENT"],
  ["augment", "AUGMENT_AGENT"],
  ["junie", "JUNIE_DATA"],
];

/** `AI_AGENT` values name the agent first, such as `claude-code_2-1-3_agent` or `github-copilot`. */
const AI_AGENT_PREFIXES: readonly [prefix: string, kind: string][] = [
  ["claude", "claude"],
  ["codex", "codex"],
  ["cursor", "cursor"],
  ["gemini", "gemini"],
  ["github-copilot", "copilot"],
  ["github_copilot", "copilot"],
  ["copilot", "copilot"],
  ["opencode", "opencode"],
  ["augment", "augment"],
  ["auggie", "augment"],
  ["qwen", "qwen"],
  ["amp", "amp"],
  ["goose", "goose"],
  ["junie", "junie"],
  ["droid", "droid"],
  ["factory", "droid"],
  ["kiro", "kiro"],
  ["cline", "cline"],
  ["crush", "crush"],
];

/** The coding agent this process runs under, from the variables each one exports to its shell. */
export const detectAgentKind = (
  env: NodeJS.ProcessEnv = process.env,
): string | undefined => {
  const named = env.AI_AGENT?.trim().toLowerCase();
  if (named) {
    // The name, or the name followed by a separator and a version or role.
    const match = AI_AGENT_PREFIXES.find(
      ([prefix]) =>
        named.startsWith(prefix) &&
        (named.length === prefix.length ||
          /[-_ ./0-9]/.test(named[prefix.length]!)),
    );
    return match?.[1] ?? "other";
  }
  return AGENT_ENV.find(([, variable]) => env[variable])?.[0];
};

/** True when a person typed the command into a terminal rather than an agent running it from its shell. */
export const isDirectInvocation = (
  env: NodeJS.ProcessEnv = process.env,
  stdin: { isTTY?: boolean | undefined } = process.stdin,
  stdout: { isTTY?: boolean | undefined } = process.stdout,
) =>
  detectAgentKind(env) === undefined &&
  stdin.isTTY === true &&
  stdout.isTTY === true;

const isWithin = (parent: string, child: string) => {
  const path = relative(parent, child);
  return (
    path === "" ||
    (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path))
  );
};

const real = (path: string) => {
  try {
    return realpathSync(path);
  } catch {
    return undefined;
  }
};

const hasNodeModules = (path: string) =>
  path
    .split(/[\\/]/)
    .some((segment) => segment.toLowerCase() === "node_modules");

/**
 * True for a path a project could have planted: one inside the working
 * directory, or in any `node_modules` directory (npx and package scripts put
 * `node_modules/.bin` first). Checked on the path as written and with symlinks
 * resolved, so a link from outside the project into it doesn't pass.
 */
const isProjectPath = (path: string, cwd: string, home: string) => {
  const resolved = real(path);
  if (resolved === undefined) return true;
  const root = real(cwd) ?? cwd;
  // Run from the home directory or above it, everything would be "inside".
  const checkInside = !isWithin(root, real(home) ?? home);
  return [path, resolved].some(
    (candidate) =>
      hasNodeModules(candidate) ||
      (checkInside && (isWithin(cwd, candidate) || isWithin(root, candidate))),
  );
};

/**
 * The absolute path of the first of `commands` found on PATH, or `undefined`.
 * Directories a project could control are skipped, so a project can't plant
 * its own `claude` ahead of the user's.
 */
export const findCommand = (
  commands: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  home: string = homedir(),
): string | undefined => {
  // Relative entries (the working directory among them) are never searched.
  const directories = (env.PATH ?? "")
    .split(delimiter)
    .filter((directory) => directory && isAbsolute(directory));
  const extensions =
    process.platform === "win32"
      ? (env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
      : [""];
  for (const command of commands) {
    for (const directory of directories) {
      for (const extension of extensions) {
        const path = join(directory, command + extension);
        try {
          accessSync(path, constants.X_OK);
        } catch {
          continue;
        }
        // The directory and the binary itself, symlinks resolved.
        if (isProjectPath(directory, cwd, home)) continue;
        if (isProjectPath(path, cwd, home)) continue;
        return path;
      }
    }
  }
  return undefined;
};

/**
 * Starts `agent` in this terminal with `prompt` as its first message and
 * resolves with its exit code; `undefined` when its command is not installed.
 */
export const runCodingAgent = (
  agent: CodingAgent,
  prompt: string,
): Promise<number | undefined> => {
  const launch = agent.launch;
  if (!launch) return Promise.resolve(undefined);
  const command = findCommand(launch.commands);
  if (command === undefined) return Promise.resolve(undefined);
  const child = spawn(command, launch.args(prompt), { stdio: "inherit" });
  return new Promise((resolve) => {
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") resolve(undefined);
      else {
        process.stderr.write(`${error.message}\n`);
        resolve(1);
      }
    });
    child.on("exit", (status) => resolve(status ?? 1));
  });
};
