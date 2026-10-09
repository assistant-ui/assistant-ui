import { connectCheckout } from "./client";
import type { CheckoutClient } from "./client";
import { INPUT_PRESETS, isPresetId, presetInput } from "./presets";
import { spawn } from "node:child_process";
import { open, readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import {
  AGENT_HEARTBEAT_MS,
  OPTION_ICONS,
  classifyChoiceAnswer,
  currentPlan,
  isAgentPresent,
  isClosed,
  isOptionIcon,
  isValidModelAnswer,
  parseEntryPointOptions,
  parseMultipleAnswer,
  stepProgress,
} from "./protocol";
import type { Checkout } from "./protocol";

export const HELP = `setup-agent <url> [command]

Commands (the url always comes first):
  status                            Print the setup as JSON.
  stream                            Follow the setup: one JSON array of events per line.
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
  wait <input-id>                   Block until the user answers or dismisses an input. A multi-select answer prints as an array.
  plan (<markdown> | --file <path>) [--wait]
                                    Propose the plan for the user to approve. --wait blocks until they decide.
  wait plan                         Block until the user approves the plan or asks for changes.
  env <input-id> <ENV_VAR> [--file <path>]
                                    Write the API key behind an answered llm-provider input to an env file (default .env.local) as ENV_VAR=<key>, without printing it.
  add-step <title> [--detail <text>] [--product <slug>] [--active]
                                    Declare a step of the install (after the plan is approved). Prints its id.
  step <step-id> <status> [--note <text>]
                                    Set a step to pending|active|done|skipped|blocked.
  done [--summary <text>] [--preview <url>]
                                    Mark every remaining step done and propose closing; the user closes it.
`;

export const agentInstructions = (
  url: string,
) => `You are the coding agent for a setup the user opened in their browser. The browser shows this setup live; every command below updates it. The user watches the browser, not this terminal: once setup begins, send questions through "ask" so the user can answer in their browser.

First, start a persistent Monitor on
  npx setup-agent ${url} stream
and keep it running: the browser shows you as connected only while it runs, and it is how answers reach you. The URL is the user's link to you from their browser, not one setup: it outlives this one, and their next setup arrives on the same stream. Each line is a JSON array of events: "planning.started", "input.answered" ({inputId, answer, note?}; answer is an array for a choice question not asked with --single), "input.dismissed", "plan.approved", "plan.changes-requested" ({feedback}), "message.created" ({messageId, text}), "finished", "cancelled", "setup.created" ({products}).

The user can message you at any time, including while a question is waiting. Read "message.created" events, acknowledge each with "npx setup-agent ${url} ack <message-id>", and reply using "log" with what you will do. Pending messages are replayed when the stream starts and listed in "status". A message is not an answer or plan approval; keep those decisions explicit.

"log" is a message to the user, and the user reads every one: send it only to reply to their message, to tell them something no question or step conveys (a blocker, a deviation from the plan, a decision you made for them), or once as a wrap-up when the install is finished. Findings go in the plan, progress in step notes, questions in "ask"; do not narrate.

Before planning, check the current setup status. If it is "waiting", tell the user in your own conversation: "I'm connected. Go back to your browser and click Begin plan. You can watch my progress, answer questions, and steer me there." Then run:
  npx setup-agent ${url} wait start
Keep the stream running while you wait. Do not inspect the project, fetch guides, ask setup questions, or propose a plan until this command returns {"ok":true}. Only the user in the browser should start planning; never invoke the browser's start command yourself. "planning.started" also arrives on the stream. If the status is already "planning" or "installing", resume that phase without asking the user to begin again. If it is "done" or "cancelled", that setup is over: tell the user you are connected and waiting for their next setup, and run "wait start", which returns once the next one begins.

The remaining phases are plan, then install.

1. Plan. Investigate only; change nothing yet. If the current directory is not an app to install into (a monorepo root, an empty folder, a library), ask where to install first:
  npx setup-agent ${url} ask "Which project should I install into?" --placeholder "An absolute path to the app" --wait
Read the project: its app framework and package manager, the agent framework and model provider it already uses, where components live, any existing chat route. Fetch each product's "guide" URL from the setup below; it is the install reference. Ask for what the project does not decide, using the standard questions so the browser can render them well:
  npx setup-agent ${url} ask --preset framework
  npx setup-agent ${url} ask --preset llm-provider
The setup's products are starting names and guide references. Explore each product's setup instructions, then discover and plan any other relevant products or dependencies the app needs. Read /catalog.md on the guide URL’s origin to find related products and fetch their setup guides. The starting list does not restrict the implementation or require adding another product to the list. Include relevant additions in the plan for approval.
When the setup puts an assistant in the app, ask how users should access it after discovering the actual app and before proposing the plan. Skip this question when no product's guide installs an assistant (a standalone library or service setup, for example). Use an entry-point question with only 1–3 sensible alternatives. Describe the actual app's pages, workflow and component placement, not generic placeholder copy. Recommend one clear fit when there is one; two options may use the same form factor in different places. Each option needs a stable id, label, contextual description and entryPoint {"formFactor":"modal"|"sidebar"|"full-page","placement":"where it appears","trigger":"how users open it or navigate to it","recommended":true?}. Write the JSON array for this app and send it with:
  npx setup-agent ${url} ask "Where should users access the assistant?" --entry-points '<JSON array>' --default <recommended-id> --wait
Omit --default when there is no clear recommendation. When you ask it, do not submit the plan before the user picks an entry point. Respect the selected placement and trigger in the plan and implementation. Do not ask for a new-versus-existing app setting; discover the app from its files and ask only for an install path when needed.
Skip a preset the code already answers (a chat route on the AI SDK, a provider key in .env.local) and log why. Ask everything at once, keep investigating, and block with "wait <input-id>" only when nothing else can proceed. A framework answer is "<framework>:<language>", for example "ai-sdk:typescript". A model answer is JSON {"provider","model","reasoningEffort"?}. An answer may carry a "note" from the user; follow it. A choice answer that matches none of the options is the user's own text.
Then write the plan as markdown and submit it:
  npx setup-agent ${url} plan --file <path> --wait
Use these headings, each with bullets: "## What I found" (facts as \`- **Label:** value\`: app framework, package manager, agent framework, model provider and model, where components live), "## What I will install" (packages and files, one per bullet), "## Steps" (a numbered list, one line each), and "## Open questions" only if any remain. Keep it under 30 lines; no preamble. "plan --wait" prints {"decision":"approve"} or {"decision":"revise","feedback":"..."}. On revise, address the feedback (ask again if you need to) and submit a new plan; repeat until approved. Do not change the project before approval: the setup refuses steps until then.

2. Install. Declare the steps from your plan up front, in order:
  npx setup-agent ${url} add-step "<title>" --detail "<one line>"
which prints the step id. Then work through them: "step <id> active" before, "step <id> done --note '<one line on what you did>'" after; "skipped" when the step is already satisfied, "blocked" when you cannot continue, saying why in --note. Add steps as the work reveals them. Ask when you need another decision or value (--choices for a pick, plain for text; --optional when you can proceed without an answer; --wait only when the answer is the very next thing you need). A choice question is multi-select: the user checks any number of your options, and the answer is an array of the ids they checked, plus their own text as an entry when they typed one. Pass --single only when the options exclude each other (one framework, one model, yes or no); the answer is then one id. Every option must carry an icon, given as --icons "<id>=<icon>,..." with the closest name from this pack: ${OPTION_ICONS.join(", ")}. A question without an icon for each option is refused. Open inputs the user has not answered are listed under "inputs" in "status"; check them before asking again.
The API key behind a model answer is not in the answer and you never see it: pick the variable name the provider's SDK reads (OPENAI_API_KEY, ANTHROPIC_API_KEY, ...) and run
  npx setup-agent ${url} env <input-id> <ENV_VAR> --file .env.local
which writes ENV_VAR=<key> into that file. Use the answer's model in the chat route and map reasoningEffort onto the provider's setting when it is set. Never invent a key or a model name.

When every product is installed and verified, run
  npx setup-agent ${url} done --summary "<one or two lines on what you installed and how to try it>" --preview http://localhost:<port>
Before that, start the project's dev server in the background when the project has one, check that the page you changed loads, and pass the address as --preview (the page itself when it is not the root); leave the server running so the user can try the result. Omit --preview when there is nothing to open. This proposes closing the setup; only the user closes it. Do not stop the stream or exit: stay idle on it, because the user may follow up with a "message.created" event. Handle it, then run "done" again. The stream prints "finished" once the user closes the setup, and "cancelled" if they end it early. Keep the stream running after either: the user's next setup starts on this same URL and arrives as "setup.created" with its products. Run
  npx setup-agent ${url} wait start
which returns once that setup begins, then run "status" for its products, guides and instructions and go through plan and install again. A "setup.created" event while you are still working means the user replaced this setup: drop what you were doing and start over the same way.
`;

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

const AGENT_ENV: readonly [kind: string, variable: string][] = [
  ["claude", "CLAUDECODE"],
  ["codex", "CODEX_SANDBOX"],
  ["codex", "CODEX_SANDBOX_NETWORK_DISABLED"],
  ["cursor", "CURSOR_AGENT"],
  ["gemini", "GEMINI_CLI"],
];

/** The coding agent this process runs under, from the variables each one exports to its shell. */
export const detectAgentKind = (env: NodeJS.ProcessEnv = process.env) =>
  AGENT_ENV.find(([, variable]) => env[variable])?.[0];

type Launcher = {
  kind: string;
  name: string;
  command: string;
  args: (prompt: string) => string[];
  install: string;
};

const LAUNCHERS: Launcher[] = [
  {
    kind: "claude",
    name: "Claude Code",
    command: "claude",
    args: (prompt) => [prompt],
    install: "npm install -g @anthropic-ai/claude-code",
  },
  {
    kind: "codex",
    name: "Codex",
    command: "codex",
    args: (prompt) => [prompt],
    install: "npm install -g @openai/codex",
  },
  {
    kind: "cursor",
    name: "Cursor",
    command: "agent",
    args: (prompt) => [prompt],
    install: "curl https://cursor.com/install -fsS | bash",
  },
  {
    kind: "gemini",
    name: "Gemini CLI",
    command: "gemini",
    args: (prompt) => ["-i", prompt],
    install: "npm install -g @google/gemini-cli",
  },
];

/** True when a person typed the command into a terminal rather than an agent running it from its shell. */
export const isDirectInvocation = (
  env: NodeJS.ProcessEnv = process.env,
  stdin: { isTTY?: boolean | undefined } = process.stdin,
  stdout: { isTTY?: boolean | undefined } = process.stdout,
) =>
  detectAgentKind(env) === undefined &&
  stdin.isTTY === true &&
  stdout.isTTY === true;

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
  const prompt = `Run \`npx setup-agent ${url}\` and follow the instructions it prints.`;
  process.stdout.write(`\nStarting ${launcher.name}...\n\n`);
  const child = spawn(launcher.command, launcher.args(prompt), {
    stdio: "inherit",
  });
  const code = await new Promise<number>((resolve) => {
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        process.stderr.write(
          `${launcher.name} is not installed. Install it with:\n  ${launcher.install}\nthen run this command again.\n`,
        );
      } else {
        process.stderr.write(`${error.message}\n`);
      }
      resolve(1);
    });
    child.on("exit", (status) => resolve(status ?? 1));
  });
  process.exit(code);
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

type StreamEvent =
  | { event: "planning.started" }
  | { event: "message.created"; messageId: string; text: string }
  | {
      event: "input.answered";
      inputId: string;
      prompt: string;
      /** The entries of a multiple choice answer, else the answer text. */
      answer: string | string[];
      note?: string;
      /** True when a choice answer is, or a multiple one contains, the user's own text rather than an option. */
      custom?: true;
    }
  | { event: "input.dismissed"; inputId: string; prompt: string }
  | { event: "plan.approved"; revision: number }
  | { event: "plan.changes-requested"; revision: number; feedback: string }
  | { event: "finished"; next: string }
  | { event: "cancelled"; next: string }
  | { event: "setup.created"; products: string[] };

const STAY_CONNECTED =
  "This setup is over, not your connection. Keep the stream running, tell the user you are connected and waiting for their next setup, and run wait start.";

export const diffEvents = (
  before: Checkout.State,
  after: Checkout.State,
): StreamEvent[] => {
  const events: StreamEvent[] = [];
  if (before.status === "waiting" && after.status === "planning") {
    events.push({ event: "planning.started" });
  }
  for (const entry of after.log) {
    if (
      entry.role === "user" &&
      entry.acknowledgedAt === undefined &&
      !before.log.some((previous) => previous.id === entry.id)
    ) {
      events.push({
        event: "message.created",
        messageId: entry.id,
        text: entry.text,
      });
    }
  }
  for (const input of after.inputs) {
    const previous = before.inputs.find(
      (candidate) => candidate.id === input.id,
    );
    if (previous?.status === input.status) continue;
    if (input.status === "answered") {
      const answer = input.answer ?? "";
      events.push({
        event: "input.answered",
        inputId: input.id,
        prompt: input.prompt,
        ...answerFields(input, answer),
      });
    } else if (input.status === "dismissed" && after.status !== "cancelled") {
      events.push({
        event: "input.dismissed",
        inputId: input.id,
        prompt: input.prompt,
      });
    }
  }
  for (const plan of after.plans) {
    const previous = before.plans.find(
      (candidate) => candidate.revision === plan.revision,
    );
    if (previous?.status === plan.status || plan.status === "proposed") {
      continue;
    }
    if (plan.status === "approved") {
      events.push({ event: "plan.approved", revision: plan.revision });
    } else {
      events.push({
        event: "plan.changes-requested",
        revision: plan.revision,
        feedback: plan.feedback ?? "",
      });
    }
  }
  if (before.status !== "done" && after.status === "done") {
    events.push({ event: "finished", next: STAY_CONNECTED });
  }
  if (before.status !== "cancelled" && after.status === "cancelled") {
    events.push({ event: "cancelled", next: STAY_CONNECTED });
  }
  if (after.id !== null && after.id !== before.id) {
    events.push({
      event: "setup.created",
      products: after.products.map((product) => product.slug),
    });
  }
  return events;
};

const stream = async (client: CheckoutClient) => {
  let previous = requireState(client);
  let pending: StreamEvent[] = diffEvents({ ...previous, log: [] }, previous);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    timer = null;
    if (pending.length === 0) return;
    print(pending);
    pending = [];
  };
  client.subscribe(() => {
    const next = client.state;
    if (next === undefined) return;
    pending.push(...diffEvents(previous, next));
    previous = next;
    if (pending.length > 0 && timer === null) timer = setTimeout(flush, 200);
  });
  flush();
  const kind = detectAgentKind();
  await client.commands["agent/hello"]({
    cwd: process.cwd(),
    ...(kind !== undefined && { kind }),
  });
  const heartbeat = setInterval(() => {
    void client.commands["agent/heartbeat"]().catch(() => {});
  }, AGENT_HEARTBEAT_MS);
  const stop = () => {
    clearInterval(heartbeat);
    flush();
    void client.commands["agent/bye"]()
      .catch(() => {})
      .finally(() => {
        client.dispose();
        process.exit(0);
      });
  };
  process.on("SIGHUP", stop);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  await new Promise(() => {});
};

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
      ["preset", "product", "choices", "icons", "multiple", "placeholder"].some(
        (flag) => flags.has(flag),
      )
    )
      return fail(
        "--entry-points cannot be combined with other input kinds or --multiple",
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
) => {
  assertEnvKey(key);
  const handle = await open(file, "a+", 0o600);
  try {
    await handle.chmod(0o600);
    const value = await take();
    const current = await handle.readFile("utf8");
    await handle.truncate(0);
    await handle.writeFile(upsertEnvLine(current, key, value));
  } finally {
    await handle.close();
  }
};

const answerFields = (input: Checkout.Input, answer: string) => ({
  answer: (input.multiple && parseMultipleAnswer(answer)) || answer,
  ...(input.note !== undefined && { note: input.note }),
  ...(input.kind === "choice" &&
    classifyChoiceAnswer(input, answer) === "custom" && {
      custom: true as const,
    }),
});

const answered = (input: Checkout.Input) => ({
  ok: true,
  inputId: input.id,
  status: input.status,
  ...(input.answer !== undefined && answerFields(input, input.answer)),
});

export const main = async (argv: readonly string[]) => {
  const { positional, flags } = parseArgs(argv);
  const [first, command = "intro", ...rest] = positional;
  if (flags.has("help") || flags.has("h") || first === undefined) {
    process.stdout.write(HELP);
    return process.exit(first === undefined ? 1 : 0);
  }
  const url = first;
  if (command === "intro" && isDirectInvocation()) return launchAgent(url);

  const client = await connectCheckout(url).catch((error: unknown) =>
    fail(error instanceof Error ? error.message : String(error)),
  );
  const commands = client.commands;

  try {
    switch (command) {
      case "intro": {
        const kind = detectAgentKind();
        await commands["agent/intro"]({
          ...(kind !== undefined && { kind }),
        }).catch(() => {});
        process.stdout.write(INSTRUCTIONS(url));
        process.stdout.write("\nCurrent setup:\n");
        print(summary(requireState(client)));
        break;
      }
      case "status": {
        print(summary(requireState(client)));
        break;
      }
      case "stream": {
        await stream(client);
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
        const plan = await waitForPlan(client, revision);
        print(decided(plan, requireState(client)));
        break;
      }
      case "ask": {
        const { inputId } = await commands["agent/ask"](askSeed(rest, flags));
        if (!flags.has("wait")) {
          print({ ok: true, inputId });
          break;
        }
        print(await waitForInput(client, inputId).then(answered));
        break;
      }
      case "wait": {
        const target =
          rest[0] ?? fail("usage: wait start | wait <input-id> | wait plan");
        const state = requireState(client);
        if (target === "start") {
          const status = await waitForStart(client);
          print({
            ok: status === "planning" || status === "installing",
            status,
          });
          break;
        }
        if (target === "plan") {
          const plan = currentPlan(state) ?? fail("no plan has been proposed");
          print(
            decided(
              await waitForPlan(client, plan.revision),
              requireState(client),
            ),
          );
          break;
        }
        if (!state.inputs.some((input) => input.id === target)) {
          fail(`no input "${target}"`);
        }
        print(await waitForInput(client, target).then(answered));
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
        const file = resolve(flagText(flags, "file") ?? ".env.local");
        await writeEnvSecret(file, envKey, async () => {
          const response = await fetch(
            `${url.replace(/\/$/, "")}/secret/${encodeURIComponent(inputId)}?setup=${encodeURIComponent(setupId)}`,
          );
          if (response.status === 404) {
            fail(
              `the key for "${inputId}" was already taken or never deposited`,
            );
          }
          if (!response.ok) fail(`could not fetch the key: ${response.status}`);
          return response.text();
        });
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
