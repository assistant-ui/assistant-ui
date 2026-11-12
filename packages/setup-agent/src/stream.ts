import { detectAgentKind } from "./agents";
import type { AskReason, BrowserGate, BrowserGateAction } from "./browser";
import { createBrowserGate } from "./browser";
import type { CheckoutClient } from "./client";
import { formatTerminalQuestion, terminalQuestion } from "./needs";
import type { SetupNeed, TerminalQuestion } from "./needs";
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

const needPrompt = (need: SetupNeed) =>
  need.kind === "input"
    ? `"${need.input.prompt.trim() || "Your agent needs an answer."}"`
    : need.kind === "plan"
      ? "the plan review"
      : "closing the setup";

/** What the agent reads when setup opened the browser, or when it should ask the user itself. */
export const gateEvent = (
  action: BrowserGateAction,
  {
    answerCommand,
    pageUrl,
  }: {
    /** The command that answers a need, before the need id: `npx assistant-ui@latest setup <url> answer`. */
    answerCommand: string;
    /** The setup page, for no-browser. */
    pageUrl?: string;
  },
): StreamEvent => {
  if (action.type === "open")
    return {
      event: "browser.opened",
      id: action.need.id,
      url: action.url,
      message: `Opened the setup in the user's browser for ${needPrompt(action.need)}. Tell the user once that it is waiting there. The answer arrives on this stream.`,
    };
  const question = terminalQuestion(action.need);
  const text = formatTerminalQuestion(question);
  const message =
    action.reason === "recently-opened"
      ? `A browser tab for setup was opened ${Math.round((action.openedAgoMs ?? 0) / 1000)}s ago. Wait for the user there, or ask the user directly in the terminal: ${text}`
      : action.reason === "browser-closed"
        ? `The user closed the setup tab. Ask the user directly in the terminal: ${text} Setup opens the tab again for the next question.`
        : `No browser tab is open for this setup. Ask the user directly in the terminal${pageUrl ? `, or give them ${pageUrl}` : ""}: ${text}`;
  return {
    event: "input.needed",
    id: action.need.id,
    reason: action.reason,
    message,
    ...question,
    answer: `${answerCommand} ${action.need.id} <${question.answerFormat}>`,
  };
};

export type FollowSetupOptions = {
  /** Writes one line of events; the default prints a JSON array to stdout. */
  print?: (events: StreamEvent[]) => void;
  /** Opens the setup page when the setup waits on the user; omitted, the stream never opens one. */
  browser?: {
    /** The setup page for a state. */
    url: (state: Checkout.State) => string | undefined;
    open: (url: string) => void;
    /** False for `--no-open`: the agent is told to ask instead. */
    canOpen?: boolean;
    now?: () => number;
    guardMs?: number;
  };
  /** The command that answers a need, before the need id. Required with `browser`. */
  answerCommand?: string;
  /** The agent the stream reports in its hello; detected by default. */
  agent?: { cwd?: string; kind?: string };
  heartbeatMs?: number;
  /** How often the browser gate looks at presence without a state change. */
  tickMs?: number;
};

export type SetupStream = {
  /** Says goodbye to the setup and stops; the client stays open for the caller to dispose. */
  stop: () => Promise<void>;
  readonly gate: BrowserGate | undefined;
};

/**
 * Follows a setup as the agent: says hello, keeps the agent present with
 * heartbeats, prints what changed as stream events, and opens the browser
 * only when the setup waits on the user.
 */
export const followSetup = async (
  client: Pick<CheckoutClient, "state" | "subscribe" | "commands">,
  options: FollowSetupOptions = {},
): Promise<SetupStream> => {
  const print =
    options.print ??
    ((events: StreamEvent[]) => {
      process.stdout.write(`${JSON.stringify(events)}\n`);
    });
  const browser = options.browser;
  const gate =
    browser === undefined
      ? undefined
      : createBrowserGate({
          url: browser.url,
          ...(browser.canOpen !== undefined && { canOpen: browser.canOpen }),
          ...(browser.now !== undefined && { now: browser.now }),
          ...(browser.guardMs !== undefined && { guardMs: browser.guardMs }),
        });
  const answerCommand = options.answerCommand ?? "answer";
  const initial = client.state;
  if (initial === undefined) throw new Error("the setup has no state");
  let previous = initial;
  let pending: StreamEvent[] = diffEvents({ ...previous, log: [] }, previous);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (pending.length === 0) return;
    print(pending);
    pending = [];
  };
  const runGate = (state: Checkout.State) => {
    if (gate === undefined || browser === undefined) return;
    for (const action of gate.update(state)) {
      if (action.type === "open") {
        try {
          browser.open(action.url);
        } catch {
          // The event still tells the agent where the page is.
        }
      }
      pending.push(
        gateEvent(action, {
          answerCommand,
          ...(() => {
            const pageUrl = browser.url(state);
            return pageUrl === undefined ? {} : { pageUrl };
          })(),
        }),
      );
    }
  };
  const unsubscribe = client.subscribe(() => {
    const next = client.state;
    if (next === undefined) return;
    pending.push(...diffEvents(previous, next));
    previous = next;
    runGate(next);
    if (pending.length > 0 && timer === null) timer = setTimeout(flush, 200);
  });
  runGate(previous);
  flush();
  const tick =
    gate === undefined
      ? undefined
      : setInterval(() => {
          runGate(previous);
          flush();
        }, options.tickMs ?? 1_000);
  const kind = options.agent?.kind ?? detectAgentKind();
  await client.commands["agent/hello"]({
    cwd: options.agent?.cwd ?? process.cwd(),
    ...(kind !== undefined && { kind }),
  });
  const heartbeat = setInterval(() => {
    void client.commands["agent/heartbeat"]().catch(() => {});
  }, options.heartbeatMs ?? AGENT_HEARTBEAT_MS);
  let stopped: Promise<void> | undefined;
  return {
    gate,
    stop: () =>
      (stopped ??= (async () => {
        clearInterval(heartbeat);
        if (tick !== undefined) clearInterval(tick);
        unsubscribe();
        flush();
        await client.commands["agent/bye"]().catch(() => {});
      })()),
  };
};
