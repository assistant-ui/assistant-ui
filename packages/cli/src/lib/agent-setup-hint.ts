import type { Command } from "commander";
import { detectAgentKind, isDirectInvocation } from "setup-agent/cli";
import { isManualRunAllowed, typedCommand } from "./agent-gate";

export const AGENT_SETUP_HINT =
  "Recommended for coding agents: run `npx assistant-ui@latest setup` in the background (Claude Code: run_in_background) and read its output. It keeps running as the guided setup's stream, walks you through the install, and opens the user's browser when it needs their input. If `setup` isn't a known command (a cached or pnpm release-age-gated version), run `npx -y --prefer-online assistant-ui@latest setup` instead.";

/** Repeats the hint in one line at the end of the output, for an agent that reads only the tail. */
export const AGENT_SETUP_POINTER =
  "Recommended for coding agents: `npx assistant-ui@latest setup` (see the note at the start of this output).";

/** True when a coding agent, or anything else without a terminal, runs the CLI. */
export const isRunByAgent = (
  env: NodeJS.ProcessEnv = process.env,
  stdin: { isTTY?: boolean | undefined } = process.stdin,
  stdout: { isTTY?: boolean | undefined } = process.stdout,
) => !isDirectInvocation(env, stdin, stdout);

const hinted = new WeakSet<Command>();
let printed = false;
let pointerDue: Command | undefined;

/** Ends `command`'s help with the agent setup hint when an agent reads it, so `--help | tail` keeps it. */
export const addAgentSetupHelp = (command: Command) => {
  command.addHelpText("after", () =>
    isRunByAgent() ? `\n${AGENT_SETUP_HINT}` : "",
  );
  return command;
};

/**
 * Whether the run of `command` gets the hint: it is the command typed, there
 * is no terminal, and no coding agent is detected. A detected agent was
 * stopped by the agent gate or is past it on purpose (a setup session or
 * --force), and so is one inside a setup session it was not detected in;
 * pointing either at setup again would only send it in circles.
 */
const shouldHint = (command: Command) =>
  typedCommand() === command.name() &&
  isRunByAgent() &&
  detectAgentKind() === undefined &&
  !isManualRunAllowed(command);

/**
 * Ends `command`'s help with the agent setup hint when an agent reads it, and
 * prints the hint once before the command starts its work for a run without
 * a terminal, so a coding agent the gate does not detect reads it before the
 * command scaffolds anything. The command then runs as usual (CI and scripts
 * have no terminal either) and ends with a one-line pointer for an agent that
 * reads only the tail. People at a terminal see the usual help and output.
 */
export const addAgentSetupHint = (command: Command) => {
  if (hinted.has(command)) return command;
  hinted.add(command);
  addAgentSetupHelp(command);
  command.hook("preAction", (thisCommand) => {
    if (printed || !shouldHint(thisCommand)) return;
    printed = true;
    pointerDue = thisCommand;
    process.stdout.write(`${AGENT_SETUP_HINT}\n\n`);
  });
  command.hook("postAction", (thisCommand) => {
    if (pointerDue !== thisCommand) return;
    pointerDue = undefined;
    process.stdout.write(`\n${AGENT_SETUP_POINTER}\n`);
  });
  return command;
};
