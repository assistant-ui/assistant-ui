import type { Command } from "commander";
import { detectAgentKind, isDirectInvocation } from "setup-agent/cli";
import { typedCommand } from "./agent-gate";

export const AGENT_SETUP_HINT =
  "Recommended for coding agents: run `npx assistant-ui@latest setup` in the background (Claude Code: run_in_background) and read its output. It keeps running as the guided setup's stream, walks you through the install, and opens the user's browser when it needs their input. If `setup` isn't a known command (a cached or pnpm release-age-gated version), run `npx -y --prefer-online assistant-ui@latest setup` instead.";

/** True when a coding agent, or anything else without a terminal, runs the CLI. */
export const isRunByAgent = (
  env: NodeJS.ProcessEnv = process.env,
  stdin: { isTTY?: boolean | undefined } = process.stdin,
  stdout: { isTTY?: boolean | undefined } = process.stdout,
) => !isDirectInvocation(env, stdin, stdout);

const hinted = new WeakSet<Command>();
let printed = false;

/** Ends `command`'s help with the agent setup hint when an agent reads it, so `--help | tail` keeps it. */
export const addAgentSetupHelp = (command: Command) => {
  command.addHelpText("after", () =>
    isRunByAgent() ? `\n${AGENT_SETUP_HINT}` : "",
  );
  return command;
};

/**
 * Ends `command`'s help with the agent setup hint when an agent reads it,
 * and prints the hint once after the command finishes for one, where an
 * agent reading the tail of the output sees it. People at a terminal see the
 * usual help and output.
 */
export const addAgentSetupHint = (
  command: Command,
  { afterAction = true }: { afterAction?: boolean } = {},
) => {
  if (hinted.has(command)) return command;
  hinted.add(command);
  addAgentSetupHelp(command);
  if (afterAction) {
    command.hook("postAction", () => {
      // Other commands run create internally; only the one typed gets the hint.
      // A detected agent got here past the agent gate, from a setup session or
      // with --force, so pointing it at setup again would only send it in circles.
      if (
        printed ||
        typedCommand() !== command.name() ||
        !isRunByAgent() ||
        detectAgentKind() !== undefined
      )
        return;
      printed = true;
      process.stdout.write(`\n${AGENT_SETUP_HINT}\n`);
    });
  }
  return command;
};
