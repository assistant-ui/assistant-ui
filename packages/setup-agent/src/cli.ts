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
import { loadGuide, renderText } from "./guide";
import type { Guide } from "./guide";

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
  wait start                        Block until the setup page starts the plan; prints {"ok":false,"status":"cancelled"} if the user cancels first. After a finished or cancelled setup, waits for the next one to begin.
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

/** The values the CLI fills into guide texts itself; never the server's to choose. */
const localValues = (setupUrl: string, command = DEFAULT_COMMAND) => ({
  cmd: command,
  url: shellWord(setupUrl),
  icons: OPTION_ICONS.join(", "),
});

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
const stillWaiting = (target: string, next: string, guide: Guide) => ({
  ok: false,
  status: "waiting",
  waitingFor: target,
  next,
  message: renderText(guide, "wait.waiting"),
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
  guide: Guide,
) => {
  const setupAppUrl =
    options.browser?.setupAppUrl ?? flagText(flags, "setup-app-url");
  const linkId = new URL(url).pathname.split("/").filter(Boolean).at(-1);
  const stream = await followSetup(client, {
    guide,
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

  // Commands that print guidance get their wording from the setup server.
  const client = await connectCheckout(url).catch((error: unknown) =>
    fail(error instanceof Error ? error.message : String(error)),
  );
  const commands = client.commands;
  // The wording comes from the setup server, fetched only when a command
  // prints some, so an outage never blocks a question, a plan or an answer.
  let guideLoad: Promise<Guide> | undefined;
  const guide = () =>
    (guideLoad ??= loadGuide(url, {
      started: "user",
      // Only a stream given the setup page's URL can open it.
      opened:
        command !== "stream" ||
        ((options.browser?.setupAppUrl ?? flagText(flags, "setup-app-url")) !==
          undefined &&
          (options.browser?.canOpen ?? true) &&
          !flags.has("no-open")),
    }));
  const waitCommand = (target: string) =>
    `${options.command ?? DEFAULT_COMMAND} ${shellWord(url)} wait ${target}`;

  try {
    switch (command) {
      case "intro": {
        // The steps are the server's, but each is one of these fixed actions.
        const intro = await guide();
        for (const step of intro.intro) {
          if (step.action === "announce-agent") {
            const kind = detectAgentKind();
            await commands["agent/intro"]({
              ...(kind !== undefined && { kind }),
            }).catch(() => {});
          } else if (step.action === "print") {
            process.stdout.write(
              renderText(intro, step.text, localValues(url, options.command)),
            );
          } else print(summary(requireState(client)));
        }
        break;
      }
      case "status": {
        print(summary(requireState(client)));
        break;
      }
      case "stream": {
        await runStream(client, url, flags, options, await guide());
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
            ? stillWaiting("plan", waitCommand("plan"), await guide())
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
            ? stillWaiting(inputId, waitCommand(inputId), await guide())
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
            print(stillWaiting("start", waitCommand("start"), await guide()));
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
              ? stillWaiting("plan", waitCommand("plan"), await guide())
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
            ? stillWaiting(target, waitCommand(target), await guide())
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
        // Fetched first, so an outage fails the command before it proposes closing.
        const hint = renderText(await guide(), "done.next");
        const summary = flagText(flags, "summary");
        const preview = flagText(flags, "preview");
        await commands["agent/done"]({
          ...(summary !== undefined && { summary }),
          ...(preview !== undefined && { preview }),
        });
        print({
          ok: true,
          status: "proposed",
          next: hint,
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
