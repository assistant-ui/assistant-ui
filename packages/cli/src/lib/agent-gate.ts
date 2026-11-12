import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type Command, Option } from "commander";
import { detectAgentKind } from "setup-agent/cli";

export const AGENT_GATE_MESSAGE =
  "assistant-ui: you're running as a coding agent. Run `npx assistant-ui@latest setup` instead; it opens a guided setup in the user's browser and gives you the steps. A setup session covers the folder setup runs in and the folders inside it. `init`/`create`/`add` are the manual paths; pass --force only if the user explicitly asked for them. If you are a person and your terminal inherited a coding agent's environment, pass --force or set ASSISTANT_UI_ALLOW_AGENT=1.";

/** Exit code for a command stopped by the gate, apart from failures (1). */
export const AGENT_GATE_EXIT_CODE = 2;

/** How long a setup session lets the agent run the manual commands, counted from when setup started it. */
export const SETUP_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * The real path of `dir`, also for a folder that does not exist yet (such as
 * the one `create` is about to make): the nearest existing parent is resolved
 * and the rest appended.
 */
const realPath = (dir: string): string => {
  const resolved = path.resolve(dir);
  try {
    return fs.realpathSync(resolved);
  } catch {
    const parent = path.dirname(resolved);
    if (parent === resolved) return resolved;
    return path.join(realPath(parent), path.basename(resolved));
  }
};

/** True when `dir` is the folder `root` or a folder inside it. */
export const isInsideFolder = (dir: string, root: string) => {
  const relative = path.relative(realPath(root), realPath(dir));
  if (relative === "") return true;
  if (path.isAbsolute(relative)) return false;
  return relative.split(path.sep)[0] !== "..";
};

/**
 * Where `setup` notes that a setup session is active for the project folder
 * `project`. One file per OS user and project, so setups in different
 * projects never replace each other's marker. It lives in the temp directory,
 * which the agent's shell shares across the commands it runs and which
 * sandboxed agents can write to, and never in the user's project.
 */
export const setupSessionMarkerPath = (
  project: string,
  dir: string = os.tmpdir(),
) => {
  const key = createHash("sha256")
    .update(realPath(project))
    .digest("hex")
    .slice(0, 16);
  return path.join(
    dir,
    `assistant-ui-setup-${process.getuid?.() ?? "user"}-${key}.json`,
  );
};

type SetupSessionMarker = {
  setupId: string;
  cwd: string;
  startedAt: number;
};

/**
 * Records that a setup session started in `cwd`, so the commands its steps
 * run there pass the gate. Returns the marker's path, or undefined when it
 * could not be written.
 */
export const markSetupSession = (
  session: { setupId: string; cwd?: string; now?: number },
  dir: string = os.tmpdir(),
) => {
  const cwd = realPath(session.cwd ?? process.cwd());
  const file = setupSessionMarkerPath(cwd, dir);
  const marker: SetupSessionMarker = {
    setupId: session.setupId,
    cwd,
    startedAt: session.now ?? Date.now(),
  };
  try {
    fs.writeFileSync(file, JSON.stringify(marker), { mode: 0o600 });
    return file;
  } catch {
    return undefined;
  }
};

const readMarker = (file: string): SetupSessionMarker | undefined => {
  try {
    const marker = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<
      Record<keyof SetupSessionMarker, unknown>
    >;
    if (
      typeof marker.setupId !== "string" ||
      typeof marker.cwd !== "string" ||
      typeof marker.startedAt !== "number"
    )
      return undefined;
    return marker as SetupSessionMarker;
  } catch {
    return undefined;
  }
};

/**
 * Removes a setup session's marker when it still belongs to `setupId`; setup
 * calls it when it exits. A newer setup in the same project keeps its marker.
 */
export const clearSetupSession = (file: string, setupId: string) => {
  if (readMarker(file)?.setupId !== setupId) return;
  try {
    fs.rmSync(file, { force: true });
  } catch {
    // Already gone or not ours to remove; the TTL ends it either way.
  }
};

/**
 * True while a setup session is active for the folder `target` (the folder
 * the gated command acts on) or a parent of it: setup wrote its marker there
 * less than the TTL ago and has not exited. The lifetime is fixed when setup
 * starts; using the session does not extend it.
 */
export const isSetupSessionActive = ({
  target = process.cwd(),
  now = Date.now(),
  dir = os.tmpdir(),
}: { target?: string; now?: number; dir?: string } = {}) => {
  let folder = realPath(target);
  for (;;) {
    const marker = readMarker(setupSessionMarkerPath(folder, dir));
    if (
      marker !== undefined &&
      marker.cwd === folder &&
      now - marker.startedAt >= 0 &&
      now - marker.startedAt <= SETUP_SESSION_TTL_MS &&
      isInsideFolder(target, marker.cwd)
    )
      return true;
    const parent = path.dirname(folder);
    if (parent === folder) return false;
    folder = parent;
  }
};

const isSet = (value: string | undefined) =>
  value !== undefined && !["", "0", "false"].includes(value.toLowerCase());

export type AgentGateInput = {
  env?: NodeJS.ProcessEnv;
  force?: boolean;
  setupSessionActive?: () => boolean;
};

/**
 * Whether to stop a manual command: only under a coding agent, outside a
 * setup session, and without `--force` or `ASSISTANT_UI_ALLOW_AGENT`.
 * People and CI without agent markers always pass.
 */
export const shouldGateAgent = ({
  env = process.env,
  force = false,
  setupSessionActive = isSetupSessionActive,
}: AgentGateInput = {}) =>
  detectAgentKind(env) !== undefined &&
  !force &&
  !isSet(env.ASSISTANT_UI_ALLOW_AGENT) &&
  !setupSessionActive();

/** The command name typed on the command line, not one another command runs internally. */
export const typedCommand = (argv: readonly string[] = process.argv) =>
  argv.slice(2).find((arg) => !arg.startsWith("-"));

/**
 * The folder a gated command acts on: its `--cwd` (or the current folder),
 * joined with its project directory argument when it takes one.
 */
const gateTarget = (
  command: Command,
  { projectArgument = false }: { projectArgument?: boolean } = {},
) => {
  const { cwd } = command.opts() as { cwd?: unknown };
  const base =
    typeof cwd === "string"
      ? path.resolve(process.cwd(), cwd)
      : path.resolve(process.cwd());
  const project: unknown = projectArgument ? command.args[0] : undefined;
  return typeof project === "string" && project !== ""
    ? path.resolve(base, project)
    : base;
};

const gated = new WeakSet<Command>();

/**
 * Stops `command` when a coding agent types it outside a setup session for
 * the folder it acts on, and points the agent at `setup`. Commands that run
 * it internally (init runs create, cloud setup runs create) are not stopped.
 * Pass `projectArgument` when the command's first argument is the project
 * directory it acts on.
 */
export const addAgentGate = (
  command: Command,
  options: { projectArgument?: boolean } = {},
) => {
  if (gated.has(command)) return command;
  gated.add(command);
  command.addOption(
    new Option(
      "--force",
      "run even when a coding agent is detected outside a setup session",
    ).hideHelp(),
  );
  command.hook("preAction", async (thisCommand) => {
    if (typedCommand() !== command.name()) return;
    const force = thisCommand.opts().force === true;
    const target = gateTarget(thisCommand, options);
    if (
      !shouldGateAgent({
        force,
        setupSessionActive: () => isSetupSessionActive({ target }),
      })
    )
      return;
    await new Promise<void>((resolve) =>
      process.stderr.write(`${AGENT_GATE_MESSAGE}\n`, () => resolve()),
    );
    process.exit(AGENT_GATE_EXIT_CODE);
  });
  return command;
};
