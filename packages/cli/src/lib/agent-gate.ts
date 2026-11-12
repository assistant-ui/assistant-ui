import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type Command, Option } from "commander";
import { detectAgentKind } from "setup-agent/cli";

export const AGENT_GATE_MESSAGE =
  "assistant-ui: you're running as a coding agent. Run `npx assistant-ui@latest setup` instead; it opens a guided setup in the user's browser and gives you the steps. `init`/`create`/`add` are the manual paths; pass --force only if the user explicitly asked for them.";

/** Exit code for a command stopped by the gate, apart from failures (1). */
export const AGENT_GATE_EXIT_CODE = 2;

/** How long a setup session lets the agent run the manual commands after its last use. */
export const SETUP_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Where `setup` notes that a setup session is active. It lives in the temp
 * directory, which the agent's shell shares across the commands it runs and
 * which sandboxed agents can write to, and never in the user's project.
 */
export const setupSessionMarkerPath = (dir: string = os.tmpdir()) =>
  path.join(dir, `assistant-ui-setup-${process.getuid?.() ?? "user"}.json`);

/** Records that a setup session started, so the commands its steps run pass the gate. */
export const markSetupSession = (
  session: { setupId: string; cwd?: string },
  file: string = setupSessionMarkerPath(),
) => {
  try {
    fs.writeFileSync(
      file,
      JSON.stringify({
        setupId: session.setupId,
        cwd: session.cwd ?? process.cwd(),
        startedAt: new Date().toISOString(),
      }),
      { mode: 0o600 },
    );
    return true;
  } catch {
    return false;
  }
};

/**
 * True while a setup session is active: its marker was written or used within
 * the TTL. Each use renews it, so a long install keeps passing.
 */
export const isSetupSessionActive = (
  file: string = setupSessionMarkerPath(),
  now: number = Date.now(),
) => {
  try {
    const { mtimeMs } = fs.statSync(file);
    if (now - mtimeMs > SETUP_SESSION_TTL_MS) return false;
    const renewed = new Date(now);
    fs.utimesSync(file, renewed, renewed);
    return true;
  } catch {
    return false;
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

const gated = new WeakSet<Command>();

/**
 * Stops `command` when a coding agent types it outside a setup session and
 * points the agent at `setup`. Commands that run it internally (init runs
 * create, cloud setup runs create) are not stopped.
 */
export const addAgentGate = (command: Command) => {
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
    if (!shouldGateAgent({ force })) return;
    await new Promise<void>((resolve) =>
      process.stderr.write(`${AGENT_GATE_MESSAGE}\n`, () => resolve()),
    );
    process.exit(AGENT_GATE_EXIT_CODE);
  });
  return command;
};
