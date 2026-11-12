import { Command, Option } from "commander";
import { createInterface } from "node:readline/promises";
import * as p from "@clack/prompts";
import { CODING_AGENTS, findCommand, runCodingAgent } from "setup-agent/cli";
import type { CodingAgent } from "setup-agent/cli";
import { openBrowser } from "../lib/cloud-auth";
import { isRunByAgent } from "../lib/agent-setup-hint";
import { markSetupSession } from "../lib/agent-gate";
import {
  agentBriefing,
  boxed,
  copyToClipboard,
  parseProducts,
  resolveEndpoints,
  resolveProducts,
  setupPrompt,
  startSetup,
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

const runForAgent = async (options: SetupOptions) => {
  const endpoints = resolveEndpoints(options);
  const products = await resolveProducts(
    parseProducts(options.products),
    endpoints.docsUrl,
  );
  const setup = await startSetup({ endpoints, products });
  // The steps run `init`, `create` and `add` in later shells; this lets them past the agent gate.
  markSetupSession({ setupId: setup.setupId });
  if (options.open) openBrowser(setup.browserUrl);
  process.stdout.write(agentBriefing(setup, options.open));
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
  .option("--no-open", "print the setup link instead of opening the browser")
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
Run by a coding agent, setup opens a guided setup in the user's browser and
prints the steps the agent follows. Run in an interactive terminal, it asks
which coding agent you use and starts it with the setup prompt.`,
  )
  .action(async (options: SetupOptions) => {
    if (isRunByAgent()) await runForAgent(options);
    else await runForPerson(options);
  });
