import type { Command } from "commander";
import { isDirectInvocation } from "setup-agent/cli";

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

/**
 * Opens `command`'s help with the agent setup hint when an agent reads it,
 * and prints the hint once before the command runs for one. People at a
 * terminal see the usual help and output.
 */
export const addAgentSetupHint = (
  command: Command,
  { beforeAction = true }: { beforeAction?: boolean } = {},
) => {
  if (hinted.has(command)) return command;
  hinted.add(command);
  command.addHelpText("before", () =>
    isRunByAgent() ? `${AGENT_SETUP_HINT}\n` : "",
  );
  if (beforeAction) {
    command.hook("preAction", () => {
      // Other commands run create internally; only the one typed gets the hint.
      const typed = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
      if (printed || typed !== command.name() || !isRunByAgent()) return;
      printed = true;
      process.stdout.write(`${AGENT_SETUP_HINT}\n\n`);
    });
  }
  return command;
};
