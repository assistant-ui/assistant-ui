import {
  CODING_AGENTS,
  detectAgentKind,
  isDirectInvocation,
  runCodingAgent,
} from "./agents";
import type { CodingAgent } from "./agents";
import { connectCheckout } from "./client";
import type { CheckoutClient } from "./client";
import { INPUT_PRESETS, isPresetId, presetInput } from "./presets";
import { createHash, randomBytes } from "node:crypto";
import { constants } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  unlink,
} from "node:fs/promises";
import { homedir, tmpdir, userInfo } from "node:os";
import { createInterface } from "node:readline/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  OPTION_ICONS,
  currentPlan,
  isAgentPresent,
  isClosed,
  isLoopbackHostname,
  isOptionIcon,
  isValidModelAnswer,
  parseEntryPointOptions,
  stepProgress,
} from "./protocol";
import type { Checkout } from "./protocol";
import { answerNeed } from "./needs";
import { answerFields, followSetup, shellWord } from "./stream";

export { diffEvents } from "./stream";

const DEFAULT_COMMAND = "npx setup-agent";

/**
 * How long "wait <input-id>", "wait plan" and "--wait" block before handing
 * control back with a "waiting" result, in seconds. Agent shells kill a
 * command after a limit of their own (two minutes by default in Claude
 * Code); a wait that returns first lets the agent run it again instead of
 * reading the kill as the end of the setup.
 */
const DEFAULT_WAIT_SECONDS = 100;

export const HELP = `setup-agent <url> [command]

Commands (the url always comes first):
  status                            Print the setup as JSON.
  stream [--setup-app-url <url>] [--no-open]
                                    Follow the setup: one JSON array of events per line. With --setup-app-url, open the setup page when the setup waits on the user.
  answer <input-id> <answer> [--note <text>] [--dismiss]
  answer plan approve | answer plan revise --feedback <text> | answer finish close
                                    Answer for the user what they told you in your own conversation, as an "input.needed" event's "answer" shows.
  log <text>                        Send a message to the user: a reply, something no question or step conveys, or one wrap-up when finished.
  ack <message-id>                  Acknowledge a user message.
  ask <prompt> [--placeholder <text>] [--optional] [--step <step-id>] [--wait]
                                    Ask the user for a line of text.
  ask [prompt] --preset <framework|llm-provider> [--only <id,id>] [--choices <id=description,...>] [--default <id>] [--optional] [--step <step-id>] [--wait]
                                    Ask a standard question. --only restricts the options and leaves out --choices (one id locks it in); --default preselects one.
                                    "framework" answers "<framework>:<language>"; "llm-provider" answers JSON with provider, model and reasoningEffort; the key itself arrives through "env".
  ask <prompt> --choices <id,id,...> --icons <id=icon,...> [--single] [--default <id>] [--optional] [--step <step-id>] [--wait]
                                    Ask the user to pick from your own options; they may also type their own answer.
                                    The user checks any number of options and the answer is a JSON array of option ids (their own text is one entry).
                                    --single is for options that exclude each other (one framework, one model, yes or no); the answer is then one id.
                                    --icons is required and names an icon for every option, from: ${OPTION_ICONS.join(", ")}.
  ask <prompt> --entry-points '<JSON array>' [--default <id>] [--optional] [--step <step-id>] [--wait]
                                    Ask where users should access the assistant. Each of 1–3 options has id, label, description and entryPoint {formFactor: modal|sidebar|full-page, placement, trigger, recommended?}. Answers one option id.
  wait start                        Block until the user clicks Begin plan in their browser; after a finished or cancelled setup, until the next one begins.
  wait <input-id> [--timeout <seconds>]
                                    Block until the user answers or dismisses an input. A multi-select answer prints as an array.
  plan (<markdown> | --file <path>) [--wait] [--timeout <seconds>]
                                    Propose the plan for the user to approve. --wait blocks until they decide.
  wait plan [--timeout <seconds>]   Block until the user approves the plan or asks for changes.
                                    wait <input-id>, wait plan and every --wait give up after ${DEFAULT_WAIT_SECONDS}s (--timeout, 0 for no limit) and print
                                    {"ok":false,"status":"waiting","next":"<command>"}: run "next" again to keep waiting.
  env <input-id> <ENV_VAR> [--file <path>]
                                    Write the API key behind an answered llm-provider input to an env file (default .env.local) as ENV_VAR=<key>, without printing it.
  add-step <title> [--detail <text>] [--product <slug>] [--active]
                                    Declare a step of the install (after the plan is approved). Prints its id.
  step <step-id> <status> [--note <text>]
                                    Set a step to pending|active|done|skipped|blocked.
  done [--summary <text>] [--preview <url>]
                                    Mark every remaining step done and propose closing; the user closes it.
`;

/** Characters a setup URL may hold: an origin and a path, nothing a shell or a reader treats as more than an address. */
const SETUP_URL_PATTERN =
  /^https?:\/\/[A-Za-z0-9.-]+(?::[0-9]+)?(?:\/[A-Za-z0-9._~%/-]*)?$|^http:\/\/\[::1\](?::[0-9]+)?(?:\/[A-Za-z0-9._~%/-]*)?$/;

/**
 * The normalized setup URL, or an error saying why it is refused. A setup URL
 * is printed into shell commands and the coding agent's prompt, and the API
 * key travels over it, so it must be https (http only on this machine), carry
 * no credentials, query or fragment, and hold only address characters.
 */
export const parseSetupUrl = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`"${value}" is not a URL`);
  }
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && isLoopbackHostname(url.hostname))
  ) {
    throw new Error("the setup URL must use https (http only on localhost)");
  }
  if (url.username !== "" || url.password !== "") {
    throw new Error("the setup URL must not carry credentials");
  }
  if (
    url.search !== "" ||
    url.hash !== "" ||
    value.includes("?") ||
    value.includes("#")
  ) {
    throw new Error("the setup URL must not have a query or fragment");
  }
  const href = url.href.replace(/\/$/, "");
  if (!SETUP_URL_PATTERN.test(href)) {
    throw new Error("the setup URL has characters a setup URL does not use");
  }
  return href;
};

export type AgentInstructionsOptions = {
  /** How the agent invokes the setup commands, before the URL; `npx setup-agent` by default. */
  command?: string;
  /**
   * The agent started this setup with `assistant-ui setup`, which already
   * began planning; there is no Begin plan click to wait for.
   */
  startedByAgent?: {
    browserUrl: string;
    /** False when the browser was not opened for the user; the agent then hands them the link. */
    opened?: boolean;
    /**
     * The command that printed this briefing is the stream: it keeps running
     * and opens the browser only when the setup waits on the user.
     */
    streaming?: boolean;
  };
};

const EVENT_LIST = `"planning.started", "input.answered" ({inputId, answer, note?}; answer is an array for a choice question not asked with --single), "input.dismissed", "plan.approved", "plan.changes-requested" ({feedback}), "message.created" ({messageId, text}), "finished", "cancelled", "setup.created" ({products})`;

const beginPlanHandoff = (cmd: string, url: string) =>
  `Before planning, check the current setup status. If it is "waiting", tell the user in your own conversation: "I'm connected. Go back to your browser and click Begin plan. You can watch my progress, answer questions, and steer me there." Then run:
  ${cmd} ${url} wait start
Keep the stream running while you wait. Do not inspect the project, fetch guides, ask setup questions, or propose a plan until this command returns {"ok":true}. If it returns {"ok":false,"status":"cancelled"}, the user ended this setup before planning: do not plan, tell the user you are connected and waiting for their next setup, and run "wait start" again. Only the user in the browser should start planning; never invoke the browser's start command yourself. "planning.started" also arrives on the stream. If the status is already "planning" or "installing", resume that phase without asking the user to begin again. If it is "done" or "cancelled", that setup is over: tell the user you are connected and waiting for their next setup, and run "wait start", which returns once the next one begins.`;

const agentStartedHandoff = ({
  browserUrl,
  opened = true,
  streaming = false,
}: NonNullable<AgentInstructionsOptions["startedByAgent"]>) =>
  streaming
    ? `You started this setup, and it is already planning: there is no Begin plan click to wait for. Check "status" before planning: if it is "planning" or "installing", go on with that phase. If the status is "done" or "cancelled", that setup is over: tell the user you are connected and waiting for their next setup, and run "wait start", which returns once the next one begins.`
    : `You started this setup, and it is already planning: there is no Begin plan click to wait for. The browser asks the user to connect to you first; it shows your working directory once your stream is running. Check "status" before planning: if it is "planning" or "installing", go on with that phase. Tell the user in your own conversation, once: ${
        opened
          ? `"I opened the assistant-ui setup in your browser. I'll ask my questions there, and you can watch my progress and steer me from that page. If it didn't open, go to ${browserUrl} ."`
          : `"Open ${browserUrl} to follow the assistant-ui setup. I'll ask my questions there, and you can watch my progress and steer me from that page."`
      } If the status is "done" or "cancelled", that setup is over: tell the user you are connected and waiting for their next setup, and run "wait start", which returns once the next one begins.`;

const streamSection = (
  cmd: string,
  url: string,
  streaming: boolean,
  noOpen: boolean,
) =>
  streaming
    ? `The command that printed this is the stream. Keep it running in the background until the setup ends: the browser shows you as connected only while it runs. New output does not wake you: read its new lines between your other commands. Each new line is a JSON array of events: ${EVENT_LIST}, plus:
- "browser.opened" ({id, message}): setup opened the setup page in the user's browser for a question. Tell the user once, in your own conversation, that it waits there, and keep working in the same turn.
- "input.needed" ({id, message, question, options?, answer}): the user may not see the browser right now. Do what its message says: run "wait <id>" for their answer in the browser, or ask the user in your own conversation with that question and options, then run its "answer" command with their reply. Answered either way, the setup goes on.
If this command stops, start it again in the background with
  ${cmd} ${url} stream${noOpen ? " --no-open" : ""}
The URL is the user's link to you from their browser, not one setup: it outlives this one, and their next setup arrives on the same stream.`
    : `First, start a persistent Monitor on
  ${cmd} ${url} stream
and keep it running: the browser shows you as connected only while it runs, and it is how answers reach you. The URL is the user's link to you from their browser, not one setup: it outlives this one, and their next setup arrives on the same stream. Each line is a JSON array of events: ${EVENT_LIST}.`;

/** Why the agent must not end its turn mid-setup, and how it waits instead. */
const keepGoing = (cmd: string, url: string) =>
  `Run the setup to the end in one go. Do not count on the stream or the browser to wake you: if you end your turn before the install is done, the setup can stay paused until the user types to you, even after they answer in the browser. So never end your turn to wait for an answer, and do not stop after telling the user something. To get an answer, block on it:
  ${cmd} ${url} wait <input-id>
("plan --wait" and "ask --wait" block the same way). A wait that prints {"ok":false,"status":"waiting"} has not failed and the setup is not stuck: run its "next" command, right away. "next" only waits; never repeat an "ask" or "plan" to keep waiting, since that asks or submits again. End your turn only to ask the user in your own conversation (an "input.needed" you relay, or a value only they can give), and go on as soon as they reply; or once the install is done and proposed with "done".`;

export const agentInstructions = (
  setupUrl: string,
  options: AgentInstructionsOptions = {},
) => {
  const url = shellWord(setupUrl);
  const cmd = options.command ?? DEFAULT_COMMAND;
  const started = options.startedByAgent;
  const streaming = started?.streaming === true;
  return `You are the coding agent for a setup ${started ? (streaming ? (started.opened === false ? "you started; setup opens no browser (--no-open), so the user follows it on the setup page if they open it, or answers you in your own conversation" : "you started; the user follows it in their browser, which setup opens when you ask the user something") : "you opened in the user's browser") : "the user opened in their browser"}. The browser shows this setup live; every command below updates it. The user watches the browser, not this terminal: once setup begins, send questions through "ask" so the user can answer in their browser.

${streamSection(cmd, url, streaming, started?.opened === false)}

${keepGoing(cmd, url)}

The user can message you at any time, including while a question is waiting. Read "message.created" events, acknowledge each with "${cmd} ${url} ack <message-id>", and reply using "log" with what you will do. Pending messages are replayed when the stream starts and listed in "status". A message is not an answer or plan approval; keep those decisions explicit.

"log" is a message to the user, and the user reads every one: send it only to reply to their message, to tell them something no question or step conveys (a blocker, a deviation from the plan, a decision you made for them), or once as a wrap-up when the install is finished. Findings go in the plan, progress in step notes, questions in "ask"; do not narrate.

${started ? agentStartedHandoff(started) : beginPlanHandoff(cmd, url)}

The remaining phases are plan, then install.

1. Plan. Investigate only; change nothing yet. If the current directory is not an app to install into (a monorepo root, an empty folder, a library), ask where to install first:
  ${cmd} ${url} ask "Which project should I install into?" --placeholder "An absolute path to the app" --wait
Read the project: its app framework and package manager, the agent framework and model provider it already uses, where components live, any existing chat route. Fetch each product's "guide" URL from the setup below; it is the install reference. Ask for what the project does not decide, using the standard questions so the browser can render them well:
  ${cmd} ${url} ask --preset framework
  ${cmd} ${url} ask --preset llm-provider
The setup's products are starting names and guide references. If the setup lists no products, first ask the user what to set up with a choice question whose options are slugs from https://www.assistant-ui.com/catalog.md, then fetch https://www.assistant-ui.com/install.md?items=<slugs> as the guide. Explore each product's setup instructions, then discover and plan any other relevant products or dependencies the app needs. Read /catalog.md on the guide URL’s origin to find related products and fetch their setup guides. The starting list does not restrict the implementation or require adding another product to the list. Include relevant additions in the plan for approval.
When the setup puts an assistant in the app, ask how users should access it after discovering the actual app and before proposing the plan. Skip this question when no product's guide installs an assistant (a standalone library or service setup, for example). Use an entry-point question with only 1–3 sensible alternatives. Describe the actual app's pages, workflow and component placement, not generic placeholder copy. Recommend one clear fit when there is one; two options may use the same form factor in different places. Each option needs a stable id, label, contextual description and entryPoint {"formFactor":"modal"|"sidebar"|"full-page","placement":"where it appears","trigger":"how users open it or navigate to it","recommended":true?}. Write the JSON array for this app and send it with:
  ${cmd} ${url} ask "Where should users access the assistant?" --entry-points '<JSON array>' --wait
Mark a clear fit with "recommended":true rather than --default, so the user makes the pick. When you ask it, do not submit the plan before the user picks an entry point. Respect the selected placement and trigger in the plan and implementation. Do not ask for a new-versus-existing app setting; discover the app from its files and ask only for an install path when needed.
Skip a preset the code already answers (a chat route on the AI SDK, a provider key in .env.local) and log why. Ask everything at once, keep investigating, and then run "wait <input-id>" for each open question before you write the plan; do not end your turn while they are open. A framework answer is "<framework>:<language>", for example "ai-sdk:typescript". A model answer is JSON {"provider","model","reasoningEffort"?}. An answer may carry a "note" from the user; follow it. A choice answer that matches none of the options is the user's own text.
Then write the plan as markdown and submit it:
  ${cmd} ${url} plan --file <path> --wait
Use these headings, each with bullets: "## What I found" (facts as \`- **Label:** value\`: app framework, package manager, agent framework, model provider and model, where components live), "## What I will install" (packages and files, one per bullet), "## Steps" (a numbered list, one line each), and "## Open questions" only if any remain. Keep it under 30 lines; no preamble. "plan --wait" prints {"decision":"approve"} or {"decision":"revise","feedback":"..."}; when it prints {"ok":false,"status":"waiting"}, the plan is submitted and still with the user, so keep waiting with "wait plan" and do not submit it again. On revise, address the feedback (ask again if you need to) and submit a new plan; repeat until approved. Do not change the project before approval: the setup refuses steps until then.

2. Install. Declare the steps from your plan up front, in order:
  ${cmd} ${url} add-step "<title>" --detail "<one line>"
which prints the step id. Then work through them: "step <id> active" before, "step <id> done --note '<one line on what you did>'" after; "skipped" when the step is already satisfied, "blocked" when you cannot continue, saying why in --note. Add steps as the work reveals them. Ask when you need another decision or value (--choices for a pick, plain for text; --optional when you can proceed without an answer; --wait only when the answer is the very next thing you need). A choice question is multi-select: the user checks any number of your options, and the answer is an array of the ids they checked, plus their own text as an entry when they typed one. Pass --single only when the options exclude each other (one framework, one model, yes or no); the answer is then one id. Every option must carry an icon, given as --icons "<id>=<icon>,..." with the closest name from this pack: ${OPTION_ICONS.join(", ")}. A question without an icon for each option is refused. Open inputs the user has not answered are listed under "inputs" in "status"; check them before asking again.
The API key behind a model answer is not in the answer and you never see it: pick the variable name the provider's SDK reads (OPENAI_API_KEY, ANTHROPIC_API_KEY, ...) and run
  ${cmd} ${url} env <input-id> <ENV_VAR> --file .env.local
which writes ENV_VAR=<key> into that file. Use the answer's model in the chat route and map reasoningEffort onto the provider's setting when it is set. If "env" says the key was never deposited (the model question was answered from your conversation), ask the user to add the key to that file themselves. Never invent a key or a model name.

When every product is installed and verified, run
  ${cmd} ${url} done --summary "<one or two lines on what you installed and how to try it>" --preview http://localhost:<port>
Before that, start the project's dev server in the background when the project has one, check that the page you changed loads, and pass the address as --preview (the page itself when it is not the root); leave the server running so the user can try the result. Omit --preview when there is nothing to open. This proposes closing the setup; only the user closes it. Do not stop the stream or exit: stay idle on it, because the user may follow up with a "message.created" event. Handle it, then run "done" again. The stream prints "finished" once the user closes the setup, and "cancelled" if they end it early. Keep the stream running after either: the user's next setup starts on this same URL and arrives as "setup.created" with its products. Run
  ${cmd} ${url} wait start
which returns once that setup begins, then run "status" for its products, guides and instructions and go through plan and install again. A "setup.created" event while you are still working means the user replaced this setup: drop what you were doing and start over the same way.
`;
};

export const INSTRUCTIONS = agentInstructions;

type Parsed = { positional: string[]; flags: Map<string, string | true> };

const parseArgs = (argv: readonly string[]): Parsed => {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(name, next);
      i++;
    } else {
      flags.set(name, true);
    }
  }
  return { positional, flags };
};

export {
  CODING_AGENTS,
  detectAgentKind,
  findCommand,
  isDirectInvocation,
  runCodingAgent,
} from "./agents";
export type { CodingAgent } from "./agents";

const flagText = (flags: Parsed["flags"], name: string) => {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
};

const fail = (message: string): never => {
  process.stderr.write(`setup-agent: ${message}\n`);
  return process.exit(1);
};

const print = (value: unknown) => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
};

/** The agents `setup-agent <url>` can start itself, for a person who ran it in a terminal. */
const LAUNCHERS = CODING_AGENTS.filter(
  (
    agent,
  ): agent is CodingAgent & { launch: NonNullable<CodingAgent["launch"]> } =>
    agent.launch !== undefined,
);

const chooseLauncher = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    process.stdout.write(
      "This command is meant for a coding agent, and none is running here.\nStart one to do the install:\n",
    );
    LAUNCHERS.forEach((launcher, index) => {
      process.stdout.write(`  ${index + 1}. ${launcher.name}\n`);
    });
    while (true) {
      const answer = (
        await rl.question("Choose [1]: ").catch(() => process.exit(1))
      ).trim();
      if (answer === "") return LAUNCHERS[0]!;
      const byNumber = LAUNCHERS[Number(answer) - 1];
      if (byNumber) return byNumber;
      const byName = LAUNCHERS.find(
        (launcher) =>
          launcher.kind === answer.toLowerCase() ||
          launcher.name.toLowerCase() === answer.toLowerCase(),
      );
      if (byName) return byName;
      process.stdout.write("Enter a number from the list.\n");
    }
  } finally {
    rl.close();
  }
};

const launchAgent = async (url: string) => {
  const launcher = await chooseLauncher();
  const prompt = `Run \`npx setup-agent ${shellWord(url)}\` and follow the instructions it prints.`;
  process.stdout.write(`\nStarting ${launcher.name}...\n\n`);
  const code = await runCodingAgent(launcher, prompt);
  if (code === undefined) {
    process.stderr.write(
      `${launcher.name} is not installed. Install it with:\n  ${launcher.launch.install}\nthen run this command again.\n`,
    );
  }
  // Exit once stdout and stderr have drained.
  process.exitCode = code ?? 1;
};

const requireState = (client: CheckoutClient): Checkout.State =>
  client.state ?? fail("the setup has no state");

const summary = (state: Checkout.State) => {
  const plan = currentPlan(state);
  return {
    status: state.status,
    agentConnected: isAgentPresent(state),
    products: state.products,
    instructions: state.instructions,
    plan:
      plan === undefined
        ? null
        : {
            revision: plan.revision,
            status: plan.status,
            ...(plan.feedback !== undefined && { feedback: plan.feedback }),
          },
    progress: stepProgress(state),
    steps: state.steps,
    inputs: state.inputs,
    log: state.log.slice(-20),
    pendingMessages: state.log.filter(
      (entry) => entry.role === "user" && entry.acknowledgedAt === undefined,
    ),
  };
};

const STEP_STATUSES: readonly Checkout.StepStatus[] = [
  "pending",
  "active",
  "done",
  "skipped",
  "blocked",
];

/** Resolves once a setup is planning or installing, or once the one being waited on is cancelled; a setup already closed when the wait begins is over, so the wait is for the next one. */
export const waitForStart = (
  client: Pick<CheckoutClient, "state" | "subscribe">,
) =>
  new Promise<Checkout.Status>((resolve) => {
    let previous: Checkout.Status | undefined;
    const check = () => {
      const state = client.state;
      if (state === undefined) return;
      const started =
        state.status === "planning" || state.status === "installing";
      const ended = isClosed(state) && previous === "waiting";
      previous = state.status;
      if (!started && !ended) return;
      unsubscribe();
      resolve(state.status);
    };
    const unsubscribe = client.subscribe(check);
    check();
  });

const waitForInput = (client: CheckoutClient, inputId: string) =>
  new Promise<Checkout.Input>((resolve) => {
    const check = () => {
      const state = client.state;
      const input = state?.inputs.find((candidate) => candidate.id === inputId);
      if (!input) return;
      if (input.status !== "open" || state?.status === "cancelled") {
        unsubscribe();
        resolve(input);
      }
    };
    const unsubscribe = client.subscribe(check);
    check();
  });

const waitForPlan = (client: CheckoutClient, revision: number) =>
  new Promise<Checkout.Plan | undefined>((resolve) => {
    const check = () => {
      const state = client.state;
      const plan = state?.plans.find(
        (candidate) => candidate.revision === revision,
      );
      if (
        plan === undefined ||
        plan.status !== "proposed" ||
        state?.status === "cancelled"
      ) {
        unsubscribe();
        resolve(plan);
      }
    };
    const unsubscribe = client.subscribe(check);
    check();
  });

/** The seconds `--timeout` asks a wait to block for; 0 is no limit. */
const waitSeconds = (flags: Parsed["flags"], fallback: number) => {
  const value = flagText(flags, "timeout");
  if (value === undefined) return fallback;
  const seconds = Number(value);
  if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(seconds)) {
    return fail("--timeout takes a number of seconds, 0 for no limit");
  }
  return seconds;
};

const TIMED_OUT = Symbol("timed out");

/** `promise`, or `TIMED_OUT` once `seconds` pass first; 0 waits as long as it takes. */
const within = async <T>(
  promise: Promise<T>,
  seconds: number,
): Promise<T | typeof TIMED_OUT> => {
  if (seconds === 0) return promise;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), seconds * 1000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

/** What a wait prints when the user has not decided yet: the command to run again, now. */
const stillWaiting = (target: string, next: string) => ({
  ok: false,
  status: "waiting",
  waitingFor: target,
  next,
  message: `The user has not answered yet. Run "next" now to keep waiting (it only waits; do not repeat the command you ran, which would ask or submit again), or go on with other work and run it when you need the answer. Do not end your turn: nothing resumes you until you run it.`,
});

const decided = (plan: Checkout.Plan | undefined, state: Checkout.State) => {
  if (state.status === "cancelled") return { ok: false, status: "cancelled" };
  if (plan === undefined) return fail("the plan disappeared");
  return plan.status === "approved"
    ? { ok: true, decision: "approve", revision: plan.revision }
    : {
        ok: true,
        decision: "revise",
        revision: plan.revision,
        feedback: plan.feedback ?? "",
      };
};

const splitList = (value: string | undefined) =>
  value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const askSeed = (
  rest: readonly string[],
  flags: Parsed["flags"],
): Checkout.InputSeed & { stepId?: string } => {
  const stepId = flagText(flags, "step");
  const optional = flags.has("optional");
  const fallback = flagText(flags, "default");
  if (flags.has("entry-points")) {
    if (
      [
        "preset",
        "product",
        "choices",
        "icons",
        "multiple",
        "single",
        "only",
        "placeholder",
      ].some((flag) => flags.has(flag))
    )
      return fail(
        "--entry-points cannot be combined with other input kinds, --multiple, --single or --only",
      );
    const json = flagText(flags, "entry-points");
    let value: unknown;
    try {
      value = JSON.parse(json ?? "");
    } catch {
      return fail("--entry-points needs a JSON array of options");
    }
    const options = parseEntryPointOptions(value);
    if (!options)
      return fail(
        "--entry-points needs 1–3 unique options with id, label, description and entryPoint {formFactor, placement, trigger, recommended?}; at most one is recommended",
      );
    if (
      fallback !== undefined &&
      !options.some((option) => option.id === fallback)
    )
      return fail(`no option "${fallback}" to default to`);
    const prompt =
      rest[0] ?? fail("usage: ask <prompt> --entry-points '<JSON array>'");
    if (prompt.trim() === "")
      return fail("an entry-point prompt cannot be empty");
    return {
      kind: "entry-point",
      prompt,
      options,
      ...(fallback !== undefined && { default: fallback }),
      optional,
      ...(stepId !== undefined && { stepId }),
    };
  }
  const preset = flagText(flags, "preset");
  if (preset !== undefined) {
    if (!isPresetId(preset)) {
      return fail(
        `unknown preset "${preset}"; use ${Object.keys(INPUT_PRESETS).join(" or ")}`,
      );
    }
    const only = splitList(flagText(flags, "only"));
    const found = splitList(flagText(flags, "choices"))?.map((entry) => {
      const [id = "", ...description] = entry.split("=");
      return description.length === 0
        ? { id }
        : { id, description: description.join("=") };
    });
    try {
      const seed = presetInput(preset, {
        ...(only !== undefined && { only }),
        ...(found !== undefined && { found }),
        ...(fallback !== undefined && { default: fallback }),
        optional,
        ...(stepId !== undefined && { stepId }),
      });
      return rest[0] === undefined ? seed : { ...seed, prompt: rest[0] };
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  }
  const prompt = rest[0] ?? fail("usage: ask <prompt>");
  const product = flagText(flags, "product");
  if (product !== undefined) {
    return {
      kind: "product",
      prompt,
      product,
      optional,
      ...(stepId !== undefined && { stepId }),
    };
  }
  const choices = splitList(flagText(flags, "choices"));
  if (choices !== undefined) {
    if (flags.has("single") && flags.has("multiple"))
      return fail("--single and --multiple exclude each other");
    const icons = new Map<string, string>();
    for (const entry of splitList(flagText(flags, "icons")) ?? []) {
      const [id = "", icon = ""] = entry.split("=", 2);
      if (!choices.includes(id))
        return fail(`no choice "${id}" to put an icon on`);
      if (!isOptionIcon(icon)) {
        return fail(
          `unknown icon "${icon}"; pick one of ${OPTION_ICONS.join(", ")}`,
        );
      }
      icons.set(id, icon);
    }
    const missing = choices.filter((id) => !icons.has(id));
    if (missing.length > 0) {
      return fail(
        `every option needs an icon; ${missing.map((id) => `"${id}"`).join(", ")} ${missing.length === 1 ? "has" : "have"} none. Pass --icons "${choices.map((id) => `${id}=<icon>`).join(",")}" with icons from: ${OPTION_ICONS.join(", ")}`,
      );
    }
    return {
      kind: "choice",
      prompt,
      options: choices.map((id) => ({ id, label: id, icon: icons.get(id)! })),
      ...(!flags.has("single") && { multiple: true }),
      ...(fallback !== undefined && { default: fallback }),
      optional,
      ...(stepId !== undefined && { stepId }),
    };
  }
  const placeholder = flagText(flags, "placeholder");
  return {
    prompt,
    ...(placeholder !== undefined && { placeholder }),
    optional,
    ...(stepId !== undefined && { stepId }),
  };
};

const assertEnvKey = (key: string) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    throw new Error(`"${key}" is not an environment variable name`);
  }
};

/** Sets `key=value` in dotenv text, replacing an existing line for the key. */
export const upsertEnvLine = (content: string, key: string, value: string) => {
  assertEnvKey(key);
  // A line break or other control character would end the line and let the
  // value write lines of its own.
  const isLineBreaking = (code: number) =>
    code < 0x20 ||
    (code >= 0x7f && code <= 0x9f) ||
    code === 0x2028 ||
    code === 0x2029;
  if ([...value].some((char) => isLineBreaking(char.charCodeAt(0)))) {
    throw new Error(`the value for ${key} must be a single line`);
  }
  const line = `${key}=${value}`;
  const lines = content === "" ? [] : content.replace(/\n$/, "").split("\n");
  const index = lines.findIndex(
    (entry) =>
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(entry)?.[1] === key,
  );
  if (index === -1) lines.push(line);
  else lines[index] = line;
  return `${lines.join("\n")}\n`;
};

/**
 * Write the secret `take` returns to `file` under `key`, leaving the file
 * owner-only. The file is opened before `take` runs, because taking the
 * secret consumes it and an unwritable destination must fail while it is
 * still deposited; it is read after, so lines written meanwhile survive.
 */
export const writeEnvSecret = async (
  file: string,
  key: string,
  take: () => Promise<string>,
  projectRoot = process.cwd(),
) => {
  assertEnvKey(key);
  try {
    if ((await lstat(file)).isSymbolicLink()) {
      throw new Error(
        `${file} is a symbolic link; pass --file with its target to write there`,
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const projectRelative = relative(projectRoot, file);
  if (
    projectRelative !== ".." &&
    !projectRelative.startsWith(`..${sep}`) &&
    !isAbsolute(projectRelative)
  ) {
    const root = await realpath(projectRoot);
    const parent = await realpath(dirname(file));
    const parentRelative = relative(root, parent);
    if (
      parentRelative === ".." ||
      parentRelative.startsWith(`..${sep}`) ||
      isAbsolute(parentRelative)
    ) {
      throw new Error(`${file} has a parent directory outside the project`);
    }
  }
  const handle = await open(
    file,
    constants.O_RDWR |
      constants.O_APPEND |
      constants.O_CREAT |
      constants.O_NOFOLLOW,
    0o600,
  ).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ELOOP")
      throw new Error(
        `${file} is a symbolic link; pass --file with its target to write there`,
      );
    throw error;
  });
  try {
    await handle.chmod(0o600);
    const value = await take();
    const current = await handle.readFile("utf8");
    // Built before truncating, so a refused value leaves the file intact.
    const next = upsertEnvLine(current, key, value);
    await handle.truncate(0);
    await handle.writeFile(next);
  } finally {
    await handle.close();
  }
};

const redeemKeyDirectories = () => {
  const stateHome =
    process.platform === "win32"
      ? process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local")
      : process.env.XDG_STATE_HOME || join(homedir(), ".local", "state");
  return [
    join(stateHome, "setup-agent"),
    join(
      tmpdir(),
      `setup-agent-${process.platform === "win32" ? userInfo().username : process.getuid!()}`,
    ),
  ];
};

const checkRedeemKeyDirectory = async (directory: string) => {
  if (!isAbsolute(directory)) {
    throw new Error("state home must be an absolute path");
  }
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(
      `redeem key directory must not be a symbolic link: ${directory}`,
    );
  }
  if (process.platform !== "win32") {
    if (info.uid !== process.getuid!()) {
      throw new Error(
        `redeem key directory must be owned by the user: ${directory}`,
      );
    }
    if ((info.mode & 0o077) !== 0) await chmod(directory, 0o700);
  }
};

const prepareRedeemKeyDirectory = async (directory: string) => {
  if (isAbsolute(directory)) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  }
  await checkRedeemKeyDirectory(directory);
};

const saveRedeemKey = async (hash: string, key: string) => {
  let lastError: unknown;
  for (const directory of redeemKeyDirectories()) {
    const file = join(directory, `${hash}.key`);
    let created = false;
    try {
      await prepareRedeemKeyDirectory(directory);
      const handle = await open(
        file,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600,
      );
      created = true;
      try {
        await handle.writeFile(key);
      } finally {
        await handle.close();
      }
      return file;
    } catch (error) {
      if (created) await unlink(file).catch(() => {});
      lastError = error;
    }
  }
  throw lastError;
};

const readRedeemKey = async (hash: string) => {
  if (!/^[0-9a-f]{64}$/.test(hash)) return undefined;
  for (const directory of redeemKeyDirectories()) {
    try {
      await checkRedeemKeyDirectory(directory);
      const file = join(directory, `${hash}.key`);
      const handle = await open(
        file,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        const info = await handle.stat();
        if (
          !info.isFile() ||
          (process.platform !== "win32" && (info.mode & 0o077) !== 0)
        ) {
          throw new Error("redeem key file must be private and regular");
        }
        const key = await handle.readFile("utf8");
        if (createHash("sha256").update(key).digest("hex") === hash) {
          return { key, file };
        }
      } finally {
        await handle.close();
      }
    } catch {
      continue;
    }
  }
  return undefined;
};

const answered = (input: Checkout.Input) => ({
  ok: true,
  inputId: input.id,
  status: input.status,
  ...(input.answer !== undefined && answerFields(input, input.answer)),
});

export type RunSetupCommandOptions = {
  /** How the agent invokes these commands, before the URL; `npx setup-agent` by default. */
  command?: string;
  /** Lets "stream" open the setup page when the setup waits on the user, as `--setup-app-url` does. */
  browser?: { setupAppUrl: string; canOpen?: boolean };
};

const runStream = async (
  client: CheckoutClient,
  url: string,
  flags: Parsed["flags"],
  options: RunSetupCommandOptions,
) => {
  const setupAppUrl =
    options.browser?.setupAppUrl ?? flagText(flags, "setup-app-url");
  const linkId = new URL(url).pathname.split("/").filter(Boolean).at(-1);
  const stream = await followSetup(client, {
    ...(setupAppUrl !== undefined &&
      linkId !== undefined && {
        browser: {
          setupAppUrl: parseSetupUrl(setupAppUrl),
          linkId,
          answerCommand: `${options.command ?? DEFAULT_COMMAND} ${shellWord(url)} answer`,
          canOpen: (options.browser?.canOpen ?? true) && !flags.has("no-open"),
        },
      }),
  });
  const stop = () => {
    void stream.stop().finally(() => {
      client.dispose();
      process.exit(0);
    });
  };
  process.on("SIGHUP", stop);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  await new Promise(() => {});
};

export const main = (argv: readonly string[]) => runSetupCommand(argv);

/**
 * Runs one setup command (`<url> <command> ...`) the way `npx setup-agent`
 * does, for a CLI that embeds setup as its own command.
 */
export const runSetupCommand = async (
  argv: readonly string[],
  options: RunSetupCommandOptions = {},
) => {
  const { positional, flags } = parseArgs(argv);
  const [first, command = "intro", ...rest] = positional;
  if (flags.has("help") || flags.has("h") || first === undefined) {
    process.stdout.write(HELP);
    return process.exit(first === undefined ? 1 : 0);
  }
  let url: string;
  try {
    url = parseSetupUrl(first);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
  if (command === "intro" && isDirectInvocation()) return launchAgent(url);

  const client = await connectCheckout(url).catch((error: unknown) =>
    fail(error instanceof Error ? error.message : String(error)),
  );
  const commands = client.commands;
  const waitCommand = (target: string) =>
    `${options.command ?? DEFAULT_COMMAND} ${shellWord(url)} wait ${target}`;

  try {
    switch (command) {
      case "intro": {
        const kind = detectAgentKind();
        await commands["agent/intro"]({
          ...(kind !== undefined && { kind }),
        }).catch(() => {});
        process.stdout.write(
          agentInstructions(url, {
            ...(options.command !== undefined && { command: options.command }),
          }),
        );
        process.stdout.write("\nCurrent setup:\n");
        print(summary(requireState(client)));
        break;
      }
      case "status": {
        print(summary(requireState(client)));
        break;
      }
      case "stream": {
        await runStream(client, url, flags, options);
        break;
      }
      case "answer": {
        const id =
          rest[0] ??
          fail("usage: answer <input-id|plan|finish> <answer> [--note <text>]");
        const note = flagText(flags, "note");
        const feedback = flagText(flags, "feedback");
        print(
          await answerNeed(client, id, rest[1], {
            ...(note !== undefined && { note }),
            ...(feedback !== undefined && { feedback }),
            ...(flags.has("dismiss") && { dismiss: true }),
          }),
        );
        break;
      }
      case "step": {
        const usage =
          "usage: step <step-id> <pending|active|done|skipped|blocked>";
        const stepId = rest[0] ?? fail(usage);
        const status = rest[1];
        if (!STEP_STATUSES.includes(status as Checkout.StepStatus)) fail(usage);
        const note = flagText(flags, "note");
        await commands["agent/step"]({
          stepId,
          status: status as Checkout.StepStatus,
          ...(note !== undefined && { note }),
        });
        print({ ok: true, stepId, status });
        break;
      }
      case "add-step": {
        const title = rest[0] ?? fail("usage: add-step <title>");
        const detail = flagText(flags, "detail");
        const product = flagText(flags, "product");
        const result = await commands["agent/add-step"]({
          title,
          ...(detail !== undefined && { detail }),
          ...(product !== undefined && { product }),
          ...(flags.has("active") && { active: true }),
        });
        print({ ok: true, ...result });
        break;
      }
      case "plan": {
        const file = flagText(flags, "file");
        const markdown =
          file !== undefined
            ? await readFile(resolve(file), "utf8").catch(() =>
                fail(`could not read ${file}`),
              )
            : (rest[0] ?? fail("usage: plan <markdown> | plan --file <path>"));
        const { revision } = await commands["agent/plan"]({ markdown });
        if (!flags.has("wait")) {
          print({ ok: true, revision });
          break;
        }
        const plan = await within(
          waitForPlan(client, revision),
          waitSeconds(flags, DEFAULT_WAIT_SECONDS),
        );
        print(
          plan === TIMED_OUT
            ? stillWaiting("plan", waitCommand("plan"))
            : decided(plan, requireState(client)),
        );
        break;
      }
      case "ask": {
        const seed = askSeed(rest, flags);
        const redeemKey =
          seed.kind === "model" ? randomBytes(32).toString("hex") : undefined;
        const redeemKeyHash =
          redeemKey === undefined
            ? undefined
            : createHash("sha256").update(redeemKey).digest("hex");
        const keyFile =
          redeemKey === undefined || redeemKeyHash === undefined
            ? undefined
            : await saveRedeemKey(redeemKeyHash, redeemKey).catch(
                (error: unknown) =>
                  fail(
                    `could not store the model redeem key: ${error instanceof Error ? error.message : String(error)}`,
                  ),
              );
        let inputId: string;
        try {
          ({ inputId } = await commands["agent/ask"]({
            ...seed,
            ...(redeemKeyHash !== undefined && { redeemKeyHash }),
          }));
        } catch (error) {
          if (keyFile !== undefined) await unlink(keyFile).catch(() => {});
          throw error;
        }
        if (!flags.has("wait")) {
          print({ ok: true, inputId });
          break;
        }
        const input = await within(
          waitForInput(client, inputId),
          waitSeconds(flags, DEFAULT_WAIT_SECONDS),
        );
        print(
          input === TIMED_OUT
            ? stillWaiting(inputId, waitCommand(inputId))
            : answered(input),
        );
        break;
      }
      case "wait": {
        const target =
          rest[0] ?? fail("usage: wait start | wait <input-id> | wait plan");
        const state = requireState(client);
        if (target === "start") {
          // Waiting for the user's next setup is idle time, so it has no limit by default.
          const status = await within(
            waitForStart(client),
            waitSeconds(flags, 0),
          );
          if (status === TIMED_OUT) {
            print(stillWaiting("start", waitCommand("start")));
            break;
          }
          print({
            ok: status === "planning" || status === "installing",
            status,
          });
          break;
        }
        if (target === "plan") {
          const plan = currentPlan(state) ?? fail("no plan has been proposed");
          const decision = await within(
            waitForPlan(client, plan.revision),
            waitSeconds(flags, DEFAULT_WAIT_SECONDS),
          );
          print(
            decision === TIMED_OUT
              ? stillWaiting("plan", waitCommand("plan"))
              : decided(decision, requireState(client)),
          );
          break;
        }
        if (!state.inputs.some((input) => input.id === target)) {
          fail(`no input "${target}"`);
        }
        const input = await within(
          waitForInput(client, target),
          waitSeconds(flags, DEFAULT_WAIT_SECONDS),
        );
        print(
          input === TIMED_OUT
            ? stillWaiting(target, waitCommand(target))
            : answered(input),
        );
        break;
      }
      case "env": {
        const usage = "usage: env <input-id> <ENV_VAR> [--file <path>]";
        const inputId = rest[0] ?? fail(usage);
        const envKey = rest[1] ?? fail(usage);
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(envKey)) {
          fail(`"${envKey}" is not an environment variable name`);
        }
        const state = requireState(client);
        const input =
          state.inputs.find((candidate) => candidate.id === inputId) ??
          fail(`no input "${inputId}"`);
        const setupId = state.id ?? fail("the setup has not been created yet");
        if (isClosed(state)) {
          fail("the setup is not open");
        }
        if (input.status !== "answered") {
          fail(`input "${inputId}" is ${input.status}`);
        }
        if (
          input.kind !== "model" ||
          !isValidModelAnswer(input, input.answer ?? "")
        ) {
          fail(`input "${inputId}" is not an llm-provider answer`);
        }
        const storedKey =
          input.redeemKeyHash === undefined
            ? undefined
            : await readRedeemKey(input.redeemKeyHash);
        if (input.redeemKeyHash !== undefined && storedKey === undefined) {
          fail(`no local redeem key for "${inputId}"`);
        }
        const file = resolve(flagText(flags, "file") ?? ".env.local");
        await writeEnvSecret(file, envKey, async () => {
          const secretUrl = new URL(url);
          if (
            secretUrl.protocol !== "https:" &&
            !(
              secretUrl.protocol === "http:" &&
              isLoopbackHostname(secretUrl.hostname)
            )
          ) {
            fail("the key is only fetched over https");
          }
          const response = await fetch(
            `${url.replace(/\/$/, "")}/secret/${encodeURIComponent(inputId)}?setup=${encodeURIComponent(setupId)}`,
            storedKey === undefined
              ? undefined
              : { headers: { "Setup-Agent-Redeem-Key": storedKey.key } },
          );
          if (response.status === 403) {
            fail(`redeem key rejected for "${inputId}"`);
          }
          if (response.status === 404) {
            fail(
              `the key for "${inputId}" was already taken or never deposited`,
            );
          }
          if (!response.ok) fail(`could not fetch the key: ${response.status}`);
          const key = await response.text();
          // An API key is one word of letters, digits and a few separators;
          // anything else could break out of the env line, be read differently
          // by dotenv, or run as shell syntax when the file is sourced.
          if (!/^[A-Za-z0-9._~+/=:@%,-]+$/.test(key)) {
            fail("the deposited key is not a valid API key");
          }
          return key;
        });
        if (storedKey !== undefined) {
          await unlink(storedKey.file).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") {
              process.stderr.write(
                `warning: could not remove a redeem key: ${error.message}\n`,
              );
            }
          });
        }
        print({ ok: true, envKey, file });
        break;
      }
      case "ack": {
        const messageId = rest[0] ?? fail("usage: ack <message-id>");
        await commands["agent/ack"]({ messageId });
        print({ ok: true });
        break;
      }
      case "log": {
        const text = rest[0] ?? fail("usage: log <text>");
        await commands["agent/log"]({ text });
        print({ ok: true });
        break;
      }
      case "done": {
        const summary = flagText(flags, "summary");
        const preview = flagText(flags, "preview");
        await commands["agent/done"]({
          ...(summary !== undefined && { summary }),
          ...(preview !== undefined && { preview }),
        });
        print({
          ok: true,
          status: "proposed",
          next: "Keep the stream running and stay idle. The user closes the setup or sends a follow-up message.",
        });
        break;
      }
      default:
        fail(`unknown command "${command}"\n\n${HELP}`);
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    client.dispose();
  }
};
