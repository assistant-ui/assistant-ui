import spawn from "cross-spawn";
import { detectAgentKind } from "./agents";
import { createBrowserGate } from "./browser";
import type { AskReason, BrowserGateAction } from "./browser";
import type { CheckoutClient } from "./client";
import { formatTerminalQuestion, terminalQuestion } from "./needs";
import type { TerminalQuestion } from "./needs";
import {
  AGENT_HEARTBEAT_MS,
  classifyChoiceAnswer,
  parseMultipleAnswer,
} from "./protocol";
import type { Checkout } from "./protocol";

export type StreamEvent =
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
  | { event: "setup.created"; products: string[] }
  | {
      event: "browser.opened";
      /** The need the tab opened for: an input id, plan or finish. */
      id: string;
      url: string;
      message: string;
    }
  | ({
      event: "input.needed";
      id: string;
      reason: AskReason;
      message: string;
      /** The command that answers it, with the answer's shape in angle brackets. */
      answer: string;
    } & TerminalQuestion);

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

export const answerFields = (input: Checkout.Input, answer: string) => ({
  answer: (input.multiple && parseMultipleAnswer(answer)) || answer,
  ...(input.note !== undefined && { note: input.note }),
  ...(input.kind === "choice" &&
    classifyChoiceAnswer(input, answer) === "custom" && {
      custom: true as const,
    }),
});

/** The setup page that joins a link; the link rides in the fragment, which never reaches a server. */
export const setupPageUrl = (
  setupAppUrl: string,
  linkId: string,
  setupId: string,
) => `${setupAppUrl.replace(/\/$/, "")}/#link=${linkId}&setup=${setupId}`;

/**
 * Opens `url` in the user's default browser without waiting for it.
 * `SETUP_AGENT_BROWSER` names another program to run with the URL instead,
 * such as a test driver.
 */
export const openUrl = (url: string) => {
  const custom = process.env.SETUP_AGENT_BROWSER?.trim();
  const [command, args] = custom
    ? [custom, [url]]
    : process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
        : ["xdg-open", [url]];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
};

/** `value` as one shell word, quoted only when it holds more than plain URL characters. */
export const shellWord = (value: string) =>
  /^[A-Za-z0-9._~%/:@=+,-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", `'\\''`)}'`;

const ASK_MESSAGES: Record<
  AskReason,
  (question: string, context: { agoSeconds: number; page: string }) => string
> = {
  "recently-opened": (question, { agoSeconds }) =>
    `A browser tab for setup was opened ${agoSeconds}s ago. Wait for the user there, or ask the user directly in the terminal: ${question}`,
  "browser-closed": (question) =>
    `The user closed the setup tab. Ask the user directly in the terminal: ${question}`,
  "no-browser": (question, { page }) =>
    `No browser tab is open for this setup. Ask the user directly in the terminal, or give them ${page}: ${question}`,
};

/** What the agent reads when setup opened the browser, or when it should ask the user itself. */
const gateEvent = (
  action: BrowserGateAction,
  answerCommand: string,
  page: string,
): StreamEvent => {
  const { need } = action;
  if (action.type === "open")
    return {
      event: "browser.opened",
      id: need.id,
      url: action.url,
      message: `Opened the setup in the user's browser for ${need.kind === "input" ? `"${need.input.prompt.trim()}"` : need.kind === "plan" ? "the plan review" : "closing the setup"}. Tell the user once that it is waiting there. The answer arrives on this stream.`,
    };
  const question = terminalQuestion(need);
  return {
    event: "input.needed",
    id: need.id,
    reason: action.reason,
    message: ASK_MESSAGES[action.reason](formatTerminalQuestion(question), {
      agoSeconds: Math.round((action.openedAgoMs ?? 0) / 1000),
      page,
    }),
    ...question,
    answer: `${answerCommand} ${need.id} <${question.answerFormat}>`,
  };
};

export type FollowSetupOptions = {
  /** Writes one line of events; the default prints a JSON array to stdout. */
  print?: (events: StreamEvent[]) => void;
  /** The agent the stream reports in its hello; detected by default. */
  agent?: { cwd?: string; kind?: string };
  /** Opens the setup page when the setup waits on the user; without it, the stream never opens one. */
  browser?: {
    setupAppUrl: string;
    linkId: string;
    /** The command that answers a need, before the need id: `npx assistant-ui@latest setup <url> answer`. */
    answerCommand: string;
    open?: (url: string) => void;
    /** False for `--no-open`: the agent is told to ask instead. */
    canOpen?: boolean;
    now?: () => number;
  };
};

/**
 * Follows a setup as the agent: says hello, keeps the agent present with
 * heartbeats, prints what changed as stream events, and opens the browser
 * only when the setup waits on the user. Resolves with `stop`, which says
 * goodbye; the caller disposes the client.
 */
export const followSetup = async (
  client: Pick<CheckoutClient, "state" | "subscribe" | "commands">,
  { print, agent, browser }: FollowSetupOptions = {},
) => {
  const write =
    print ??
    ((events: StreamEvent[]) => {
      process.stdout.write(`${JSON.stringify(events)}\n`);
    });
  const page = (state: Checkout.State) =>
    browser && state.id !== null
      ? setupPageUrl(browser.setupAppUrl, browser.linkId, state.id)
      : undefined;
  const gate =
    browser &&
    createBrowserGate({
      url: page,
      ...(browser.canOpen !== undefined && { canOpen: browser.canOpen }),
      ...(browser.now !== undefined && { now: browser.now }),
    });
  let previous = client.state;
  if (previous === undefined) throw new Error("the setup has no state");
  let pending = diffEvents({ ...previous, log: [] }, previous);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (pending.length > 0) write(pending);
    pending = [];
  };
  const runGate = (state: Checkout.State) => {
    for (const action of gate?.update(state) ?? []) {
      if (action.type === "open") (browser!.open ?? openUrl)(action.url);
      pending.push(
        gateEvent(action, browser!.answerCommand, page(state) ?? ""),
      );
    }
  };
  const unsubscribe = client.subscribe(() => {
    const next = client.state;
    if (next === undefined) return;
    pending.push(...diffEvents(previous!, next));
    previous = next;
    runGate(next);
    if (pending.length > 0 && timer === undefined)
      timer = setTimeout(flush, 200);
  });
  runGate(previous);
  flush();
  // Presence lapses without a state change, so the gate also looks every second.
  const tick =
    gate &&
    setInterval(() => {
      runGate(previous!);
      flush();
    }, 1_000);
  const kind = agent?.kind ?? detectAgentKind();
  try {
    await client.commands["agent/hello"]({
      cwd: agent?.cwd ?? process.cwd(),
      ...(kind !== undefined && { kind }),
    });
  } catch (error) {
    clearInterval(tick);
    clearTimeout(timer);
    unsubscribe();
    throw error;
  }
  const heartbeat = setInterval(() => {
    void client.commands["agent/heartbeat"]().catch(() => {});
  }, AGENT_HEARTBEAT_MS);
  let stopped: Promise<void> | undefined;
  return {
    stop: () =>
      (stopped ??= (async () => {
        clearInterval(heartbeat);
        clearInterval(tick);
        unsubscribe();
        flush();
        await client.commands["agent/bye"]().catch(() => {});
      })()),
  };
};
