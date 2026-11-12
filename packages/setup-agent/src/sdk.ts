/**
 * `<tool> setup` for coding agents, for a CLI to embed. `runAgentSetup` is
 * the whole command; route `<tool> setup <url> <step> ...` to
 * `runSetupCommand` from `setup-agent/cli`. Node only.
 */
import { randomInt } from "node:crypto";
import { detectAgentKind } from "./agents";
import { agentInstructions } from "./cli";
import { connectCheckout } from "./client";
import type { CheckoutClient } from "./client";
import type { Checkout } from "./protocol";
import { followSetup, setupPageUrl, shellWord } from "./stream";
import type { FollowSetupOptions } from "./stream";

/** A random id in the alphabet and length the setup page uses for its own. */
const createSetupId = () =>
  Array.from(
    { length: 12 },
    () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
        randomInt(62)
      ]!,
  ).join("");

export type SetupSession = {
  linkId: string;
  setupId: string;
  /** The URL every setup command takes. */
  agentUrl: string;
  /** The page the user follows the setup on. */
  browserUrl: string;
  products: Checkout.ProductSeed[];
};

export type RunAgentSetupOptions = {
  /** The setup server, such as https://checkout.assistant-ui.com. */
  server: string;
  /** The setup app the browser opens, such as https://setup.assistant-ui.com. */
  setupAppUrl: string;
  products: Checkout.ProductSeed[];
  /** How the agent invokes setup commands, before the URL: `npx assistant-ui@latest setup`. */
  command: string;
  /** What the product calls this, for the briefing's first line. */
  name?: string;
  /** False for `--no-open`: the agent asks the user itself. */
  canOpen?: boolean;
  /** Opens the setup page; the default browser by default. */
  open?: (url: string) => void;
  /** Called once the session exists, before the briefing prints. */
  onSession?: (session: SetupSession) => void;
  write?: (text: string) => void;
  env?: NodeJS.ProcessEnv;
  connect?: (url: string) => Promise<CheckoutClient>;
  stream?: Pick<FollowSetupOptions, "print" | "agent">;
};

/** What the agent reads first in the output of a setup command that keeps running. */
const setupBriefing = (
  session: SetupSession,
  {
    command,
    name = "Setup",
    canOpen = true,
  }: Pick<RunAgentSetupOptions, "command" | "name" | "canOpen">,
) => {
  const url = shellWord(session.agentUrl);
  return `${name} is running. This command keeps running: it is the setup's stream.

1. Keep it running in the background until the setup ends. If you started it in the foreground, stop it and resume it in the background (Claude Code: Bash with run_in_background; Codex and other agents: add > "\${TMPDIR:-/tmp}/setup-${session.linkId}.log" 2>&1 & and read that file):
  ${command} ${url} stream${canOpen ? "" : " --no-open"}
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
    streaming: true,
    opened: canOpen,
  },
})}
Setup page, if the user asks for it: ${session.browserUrl}

Current setup:
${JSON.stringify({ status: "planning", products: session.products })}
`;
};

/**
 * `<tool> setup` for a coding agent, in one call: opens a new link on the
 * setup server, creates a setup there and starts planning, prints the
 * briefing, then streams the setup and opens the browser only when it waits
 * on the user. Resolves with the running stream; the caller stops it (on
 * SIGINT, say) and disposes the client.
 */
export const runAgentSetup = async (options: RunAgentSetupOptions) => {
  const connect = options.connect ?? connectCheckout;
  const linkId = createSetupId();
  const setupId = createSetupId();
  const agentUrl = `${options.server.replace(/\/$/, "")}/${linkId}`;
  const client = await connect(agentUrl);
  try {
    const kind = detectAgentKind(options.env);
    await client.commands["checkout/create"]({
      id: setupId,
      products: options.products,
    });
    await client.commands["checkout/begin-plan"]();
    // The agent shows as connected once the stream says hello with the cwd.
    await client.commands["agent/intro"]({
      ...(kind !== undefined && { kind }),
    });
    const session: SetupSession = {
      linkId,
      setupId,
      agentUrl,
      browserUrl: setupPageUrl(options.setupAppUrl, linkId, setupId),
      products: options.products,
    };
    options.onSession?.(session);
    (options.write ?? ((text) => process.stdout.write(text)))(
      setupBriefing(session, options),
    );
    const stream = await followSetup(client, {
      ...options.stream,
      agent: { ...(kind !== undefined && { kind }), ...options.stream?.agent },
      browser: {
        setupAppUrl: options.setupAppUrl,
        linkId,
        answerCommand: `${options.command} ${shellWord(agentUrl)} answer`,
        ...(options.open && { open: options.open }),
        ...(options.canOpen !== undefined && { canOpen: options.canOpen }),
      },
    });
    return { session, stream, client };
  } catch (error) {
    client.dispose();
    throw error;
  }
};
