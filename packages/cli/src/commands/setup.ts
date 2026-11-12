import { Command, Option } from "commander";
import { createInterface } from "node:readline/promises";
import * as p from "@clack/prompts";
import {
  CODING_AGENTS,
  findCommand,
  runCodingAgent,
  runSetupCommand,
} from "setup-agent/cli";
import { runAgentSetup } from "setup-agent/sdk";
import type { CodingAgent } from "setup-agent/cli";
import { isRunByAgent } from "../lib/agent-setup-hint";
import { clearSetupSession, markSetupSession } from "../lib/agent-gate";
import {
  SETUP_COMMAND,
  boxed,
  copyToClipboard,
  parseProducts,
  resolveEndpoints,
  resolveProducts,
  setupPrompt,
} from "../lib/setup-session";

type SetupOptions = {
  products?: string;
  open: boolean;
  docsUrl?: string;
  setupServer?: string;
  setupAppUrl?: string;
};

const OTHER = "other";

/** Picker options: every agent, launchable ones marked when they are not installed, then "Other agent". */
export const agentOptions = (
  agents: readonly CodingAgent[] = CODING_AGENTS,
  installed: (agent: CodingAgent) => boolean = (agent) =>
    agent.launch !== undefined &&
    findCommand(agent.launch.commands) !== undefined,
) => [
  ...agents.map((agent) => ({
    value: agent.kind,
    label: agent.name,
    hint: agent.launch
      ? installed(agent)
        ? "starts here"
        : "not installed"
      : "copy the prompt",
  })),
  { value: OTHER, label: "Other agent", hint: "copy the prompt" },
];

const waitForEnter = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await rl.question("");
    return true;
  } catch {
    return false;
  } finally {
    rl.close();
  }
};

/** Shows the prompt in a box and copies it once the person presses Enter. */
export const handOffPrompt = async (
  prompt: string,
  agentName: string | undefined,
  {
    print = (text: string) => process.stdout.write(text),
    enter = waitForEnter,
    copy = copyToClipboard,
  }: {
    print?: (text: string) => void;
    enter?: () => Promise<boolean>;
    copy?: (text: string) => Promise<boolean>;
  } = {},
) => {
  const target = agentName ?? "your coding agent";
  print(
    `\nPaste this prompt into ${target}:\n\n${boxed(prompt)}\n\nPress Enter to copy the prompt `,
  );
  if (!(await enter())) return;
  if (await copy(prompt)) print(`Copied. Paste it into ${target}.\n`);
  else
    print(
      "Could not reach the clipboard. Select the prompt above and copy it.\n",
    );
};

const runForPerson = async (options: SetupOptions) => {
  const products =
    options.products === undefined
      ? undefined
      : parseProducts(options.products);
  const prompt = setupPrompt(products);
  p.intro("assistant-ui setup");
  p.log.message(
    "Your coding agent does the install. Pick one and it starts here with the setup prompt; answer its questions in your browser.",
  );
  const choice = await p.autocomplete({
    message: "Which coding agent do you use?",
    placeholder: "Type to search",
    maxItems: 8,
    options: agentOptions(),
  });
  if (p.isCancel(choice)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }
  const agent = CODING_AGENTS.find((entry) => entry.kind === choice);
  if (agent?.launch && findCommand(agent.launch.commands) !== undefined) {
    p.outro(`Starting ${agent.name}…`);
    const code = await runCodingAgent(agent, prompt);
    if (code !== undefined) {
      process.exitCode = code;
      return;
    }
  }
  if (agent?.launch) {
    p.log.warn(
      `${agent.name} is not installed. Install it with:\n  ${agent.launch.install}`,
    );
  }
  p.outro("Hand the prompt to your agent.");
  await handOffPrompt(prompt, agent?.name);
};

/** `setup <url> <command> ...`: one setup command, run as `npx setup-agent <url> <command>` would. */
const runSetupStep = async (args: string[], options: SetupOptions) => {
  const endpoints = resolveEndpoints(options);
  await runSetupCommand(args, {
    command: SETUP_COMMAND,
    browser: { setupAppUrl: endpoints.setupAppUrl, canOpen: options.open },
  });
};

/**
 * What the briefing tells the agent about the agent gate. A recorded session
 * covers the setup folder, so the agent gets no --force advice that would let
 * it act on other folders. When setup could not record its session, the gate
 * would stop every step's `init`, `create` and `add`, so the agent is told up
 * front to pass --force to them.
 */
export const gateNote = (sessionRecorded: boolean) =>
  sessionRecorded
    ? "While setup runs, `npx assistant-ui` init, create and add work in the folder setup runs in and the folders inside it."
    : "assistant-ui could not record this setup session in the temp directory, so the agent gate will not recognize it. Add --force to every `npx assistant-ui` init, create or add command this setup asks you to run.";

/** `setup` for an agent: starts the session and keeps running as its stream. */
const runForAgent = async (options: SetupOptions) => {
  const endpoints = resolveEndpoints(options);
  const products = await resolveProducts(
    parseProducts(options.products),
    endpoints.docsUrl,
  );
  // The steps run `init`, `create` and `add` in later shells; the marker lets them past the agent gate.
  let marker: { file: string; setupId: string } | undefined;
  let running: Awaited<ReturnType<typeof runAgentSetup>> | undefined;
  // Installed before the session starts, so a signal during startup also ends it.
  const stop = () => {
    if (marker !== undefined) clearSetupSession(marker.file, marker.setupId);
    if (running === undefined) return process.exit(0);
    const { stream, client } = running;
    void stream.stop().finally(() => {
      client.dispose();
      process.exit(0);
    });
  };
  process.on("SIGHUP", stop);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  running = await runAgentSetup({
    server: endpoints.setupServer,
    setupAppUrl: endpoints.setupAppUrl,
    products,
    command: SETUP_COMMAND,
    name: "assistant-ui setup",
    canOpen: options.open,
    onSession: (session) => {
      const { setupId } = session;
      const file = markSetupSession({ setupId });
      if (file === undefined) return;
      marker = { file, setupId };
      // Ends the session on any exit, including errors; signals go through stop.
      process.once("exit", () => clearSetupSession(file, setupId));
    },
    write: (text) =>
      process.stdout.write(`${text}\n${gateNote(marker !== undefined)}\n`),
  });
  // The stream's heartbeat keeps the process alive until a signal stops it.
};

export const setup = new Command()
  .name("setup")
  .description(
    "set up assistant-ui with your coding agent, guided in your browser",
  )
  .option(
    "--products <slugs>",
    "comma-separated catalog slugs to set up (default: assistant-ui)",
  )
  .argument(
    "[url-and-command...]",
    "a setup command for the agent: <url> <command> [args], such as <url> ask, <url> answer or <url> stream",
  )
  .allowUnknownOption()
  .allowExcessArguments()
  .option(
    "--no-open",
    "never open the browser; the agent asks the user in its own conversation",
  )
  .addOption(
    new Option("--docs-url <url>", "the docs site with the catalog and guides")
      .env("ASSISTANT_UI_DOCS_URL")
      .hideHelp(),
  )
  .addOption(
    new Option("--setup-server <url>", "the setup server the agent joins")
      .env("ASSISTANT_UI_SETUP_SERVER")
      .hideHelp(),
  )
  .addOption(
    new Option("--setup-app-url <url>", "the setup app the browser opens")
      .env("ASSISTANT_UI_SETUP_APP_URL")
      .hideHelp(),
  )
  .addHelpText(
    "after",
    `
Run by a coding agent, setup starts a guided setup, prints the steps the agent
follows and keeps running as the setup's stream; run it in the background. It
opens the user's browser only when the setup needs their input. Run in an
interactive terminal, it asks which coding agent you use and starts it with
the setup prompt.`,
  )
  .action(async (args: string[], options: SetupOptions) => {
    if (args.length > 0) await runSetupStep(args, options);
    else if (isRunByAgent()) await runForAgent(options);
    else await runForPerson(options);
  });
