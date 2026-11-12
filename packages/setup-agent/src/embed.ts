import { agentInstructions } from "./cli";
import type { CheckoutClient } from "./client";
import { connectCheckout } from "./client";
import { openUrl, setupPageUrl, startSetupSession } from "./session";
import type { SetupSession, StartSetupSessionOptions } from "./session";
import { followSetup } from "./stream";
import type { FollowSetupOptions, SetupStream } from "./stream";

/** `value` as one shell word, quoted only when it holds more than plain URL characters. */
const shellWord = (value: string) =>
  /^[A-Za-z0-9._~%/:@=+,-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", `'\\''`)}'`;

export type SetupBriefingOptions = {
  /** How the agent invokes setup commands, before the URL: `npx assistant-ui@latest setup`. */
  command: string;
  /** What the product calls this, for the first line: `assistant-ui setup`. */
  name?: string;
  /** False for `--no-open`. */
  canOpen?: boolean;
};

/**
 * What the agent reads first in the output of a setup command that keeps
 * running: run it in the background, read its lines, answer from here,
 * then the playbook and the setup.
 */
export const setupBriefing = (
  session: SetupSession,
  { command, name = "Setup", canOpen = true }: SetupBriefingOptions,
) => {
  const url = shellWord(session.agentUrl);
  return `${name} is running. This command keeps running: it is the setup's stream.

1. Keep it running in the background until the setup ends. If you started it in the foreground, stop it and resume it in the background (Claude Code: Bash with run_in_background; Codex and other agents: add > "\${TMPDIR:-/tmp}/setup-${session.linkId}.log" 2>&1 & and read that file):
  ${command} ${url} stream
2. Read its new output as it arrives. Each line after this briefing is a JSON array of events.
3. Run every other command in another shell: ${command} ${url} <command>.
4. ${
    canOpen
      ? "Setup opens the user's browser by itself when you ask the user something; do not open it yourself."
      : `Setup will not open a browser (--no-open). Give the user ${session.browserUrl} once, or ask in your own conversation.`
  } On an "input.needed" event, do what its message says; to answer from here, run its "answer" command with the user's reply.

${agentInstructions(session.agentUrl, {
  command,
  startedByAgent: {
    browserUrl: session.browserUrl,
    opened: false,
    streaming: true,
  },
})}
Setup page, if the user asks for it: ${session.browserUrl}

Current setup:
${JSON.stringify({ status: "planning", products: session.products })}
`;
};

export type RunAgentSetupOptions = StartSetupSessionOptions &
  SetupBriefingOptions & {
    /** Opens the setup page; the default browser by default. */
    open?: (url: string) => void;
    write?: (text: string) => void;
    /** Called once the session exists, before the briefing prints. */
    onSession?: (session: SetupSession) => void;
    stream?: Omit<FollowSetupOptions, "browser" | "answerCommand">;
  };

/**
 * `<tool> setup` for a coding agent, in one call: starts a setup session,
 * prints the briefing, then streams the setup and opens the browser only
 * when the setup waits on the user. Resolves with the running stream; the
 * caller stops it (for example on SIGINT) and disposes the client.
 */
export const runAgentSetup = async (
  options: RunAgentSetupOptions,
): Promise<{
  session: SetupSession;
  stream: SetupStream;
  client: CheckoutClient;
}> => {
  const connect = options.connect ?? connectCheckout;
  const session = await startSetupSession({ ...options, connect });
  options.onSession?.(session);
  const write = options.write ?? ((text) => process.stdout.write(text));
  write(setupBriefing(session, options));
  const client = await connect(session.agentUrl);
  const stream = await followSetup(client, {
    ...options.stream,
    answerCommand: `${options.command} ${shellWord(session.agentUrl)} answer`,
    browser: {
      url: (state) =>
        state.id === null
          ? undefined
          : setupPageUrl(options.setupAppUrl, session.linkId, state.id),
      open: options.open ?? ((url) => openUrl(url)),
      canOpen: options.canOpen ?? true,
    },
  });
  return { session, stream, client };
};
