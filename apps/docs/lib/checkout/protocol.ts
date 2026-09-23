export namespace Checkout {
  export type StepStatus =
    | "pending"
    | "active"
    | "done"
    | "skipped"
    | "blocked";

  /** A unit of install work the agent declared; the catalog seeds none. */
  export type Step = {
    id: string;
    title: string;
    detail?: string;
    status: StepStatus;
    note?: string;
    /** The product this step belongs to, when the agent said. */
    product?: string;
    createdAt: number;
  };

  export type Product = {
    slug: string;
    name: string;
    /** The install reference the agent fetches while planning. */
    guide?: string;
  };

  export type InputStatus = "open" | "answered" | "dismissed";

  /**
   * product: the agent proposes adding a product to this checkout, such as one
   * another product depends on. The browser owns the catalog, so it answers
   * with `checkout/add-product`; dismissing the input declines.
   */
  export type InputKind = "text" | "choice" | "model" | "product";

  export type ChoiceVariant = { id: string; label: string };

  export type ChoiceOption = {
    id: string;
    label: string;
    description?: string;
    /** A key the browser maps to a brand mark; unknown keys render without one. */
    icon?: string;
    /** A second pick under this option, such as the language of a framework. */
    variants?: ChoiceVariant[];
  };

  /** A short nudge for users who need help choosing, with a longer guide to link to. */
  export type InputHelp = { summary: string; href?: string };

  /**
   * The answer to a model input, stored as JSON text. The API key itself is
   * never part of it: the browser deposits it with the checkout and the
   * agent's `env` command writes it straight to a file.
   */
  export type ModelAnswer = {
    provider: string;
    model: string;
    reasoningEffort?: "low" | "medium" | "high";
  };

  /**
   * A choice answer is an option id, `<option>:<variant>` when the option has
   * variants, or the user's own text when none of the options fit. A model
   * answer is a JSON-encoded ModelAnswer whose provider is one of the options.
   */
  export type Input = {
    phase: Status;
    id: string;
    kind: InputKind;
    /** The standard input this was built from, when it was. */
    preset?: string;
    prompt: string;
    placeholder?: string;
    options?: ChoiceOption[];
    /** The slug a product input proposes. */
    product?: string;
    default?: string;
    help?: InputHelp;
    optional: boolean;
    status: InputStatus;
    answer?: string;
    /** A remark the user attached to the answer. */
    note?: string;
    stepId?: string;
    createdAt: number;
    answeredAt?: number;
  };

  export type LogEntry = {
    phase: Status;
    id: string;
    role: "agent" | "user";
    acknowledgedAt?: number;
    at: number;
    text: string;
    /** The step that was active when the line was posted; none while planning. */
    stepId?: string;
  };

  export type PlanStatus = "proposed" | "approved" | "changes-requested";

  /** One revision of the agent's plan. Markdown the browser renders. */
  export type Plan = {
    revision: number;
    markdown: string;
    status: PlanStatus;
    submittedAt: number;
    decidedAt?: number;
    /** What the user asked to change, when they did. */
    feedback?: string;
  };

  /**
   * waiting: no agent has joined. planning: the agent investigates and
   * proposes a plan. installing: the plan is approved and steps run.
   */
  export type Status =
    | "waiting"
    | "planning"
    | "installing"
    | "done"
    | "cancelled";

  /**
   * The agent's proposal to close the checkout. Only the user closes it, and
   * they may keep messaging the agent instead; a later `done` renews it.
   * `preview` is the loopback URL of a dev server the agent left running for
   * the user to try before they close.
   */
  export type Completion = { proposedAt: number; preview?: string };

  export type State = {
    version: 2;
    status: Status;
    completion?: Completion;
    createdAt: number | null;
    products: Product[];
    instructions: string;
    agent: {
      lastSeenAt: number | null;
      /** False once the agent's stream said goodbye; heartbeats set it again. */
      connected: boolean;
      cwd: string | null;
      /** The coding agent that ran the command, as the CLI detected it from its environment. */
      kind: string | null;
      /** When the command was first run against this checkout, before the agent joined the stream. */
      introducedAt: number | null;
    };
    /** Every revision in order; the last one is current. */
    plans: Plan[];
    steps: Step[];
    inputs: Input[];
    log: LogEntry[];
  };

  export type ProductSeed = { slug: string; name: string; guide?: string };

  export type InputSeed = {
    kind?: InputKind;
    preset?: string;
    prompt: string;
    placeholder?: string;
    options?: ChoiceOption[];
    product?: string;
    default?: string;
    help?: InputHelp;
    optional?: boolean;
  };

  export type PlanDecision =
    | { decision: "approve" }
    | { decision: "revise"; feedback: string };

  export type Commands = {
    "checkout/create": (params: {
      products: ProductSeed[];
      instructions?: string;
    }) => void;
    "checkout/begin-plan": () => void;
    "checkout/answer": (params: {
      inputId: string;
      answer: string;
      note?: string;
    }) => void;
    "checkout/add-product": (params: {
      inputId: string;
      product: ProductSeed;
    }) => void;
    "checkout/message": (params: { text: string }) => void;
    "agent/ack": (params: { messageId: string }) => void;
    "checkout/dismiss": (params: { inputId: string }) => void;
    "checkout/plan": (params: PlanDecision) => void;
    "checkout/cancel": () => void;
    "checkout/finish": () => void;
    "agent/intro": (params: { kind?: string }) => void;
    "agent/hello": (params: { cwd?: string; kind?: string }) => void;
    "agent/heartbeat": () => void;
    "agent/bye": () => void;
    "agent/plan": (params: { markdown: string }) => { revision: number };
    "agent/add-step": (params: {
      title: string;
      detail?: string;
      product?: string;
      /** Start the step in the same call. */
      active?: boolean;
    }) => { stepId: string };
    "agent/step": (params: {
      stepId: string;
      status: StepStatus;
      note?: string;
    }) => void;
    "agent/ask": (params: InputSeed & { stepId?: string }) => {
      inputId: string;
    };
    "agent/log": (params: { text: string }) => void;
    "agent/done": (params?: { summary?: string; preview?: string }) => void;
  };

  export type RejectionReason =
    | "already-created"
    | "not-created"
    | "closed"
    | "planning-not-started"
    | "plan-required"
    | "no-plan"
    | "plan-decided"
    | "finish-not-proposed"
    | "feedback-required"
    | "empty-plan"
    | "unknown-step"
    | "unknown-product"
    | "unknown-input"
    | "input-closed"
    | "invalid-input"
    | "invalid-answer"
    | "invalid-preview"
    | "empty-message"
    | "unknown-message";
}

export const AGENT_PRESENCE_MS = 15_000;
export const AGENT_HEARTBEAT_MS = 5_000;

export const initialCheckoutState = (): Checkout.State => ({
  version: 2,
  status: "waiting",
  createdAt: null,
  products: [],
  instructions: "",
  agent: {
    lastSeenAt: null,
    connected: false,
    cwd: null,
    kind: null,
    introducedAt: null,
  },
  plans: [],
  steps: [],
  inputs: [],
  log: [],
});

export const isAgentPresent = (state: Checkout.State, now = Date.now()) =>
  state.agent.connected &&
  state.agent.lastSeenAt !== null &&
  now - state.agent.lastSeenAt < AGENT_PRESENCE_MS;

export const isClosed = (state: Checkout.State) =>
  state.status === "done" || state.status === "cancelled";

/** The question as shown to the user; an agent that sent none still gets a line to answer under. */
export const inputPrompt = (input: Checkout.Input) =>
  input.prompt.trim() || "Your agent needs an answer.";

/** True while the agent's proposal to close waits for the user. */
export const finishProposed = (state: Checkout.State) =>
  !isClosed(state) && state.completion !== undefined;

/** True while a message the user sent after the agent proposed to close still waits for the agent. */
export const followedUpSinceProposal = (state: Checkout.State) => {
  const proposedAt = state.completion?.proposedAt;
  return (
    proposedAt !== undefined &&
    state.log.some(
      (entry) =>
        entry.role === "user" &&
        entry.at > proposedAt &&
        entry.acknowledgedAt === undefined,
    )
  );
};

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The URL a preview names, or `undefined` unless it is an http(s) URL on this
 * machine's loopback interface. The browser opens it, so nothing else passes.
 */
export const parsePreviewUrl = (value: string | undefined) => {
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
  if (url.username !== "" || url.password !== "") return undefined;
  const loopback =
    LOOPBACK_HOSTS.has(url.hostname) || url.hostname.endsWith(".localhost");
  return loopback ? url : undefined;
};

export const openInputs = (state: Checkout.State) =>
  state.inputs.filter((input) => input.status === "open");

/** The current plan revision, or `undefined` before the agent proposed one. */
export const currentPlan = (state: Checkout.State): Checkout.Plan | undefined =>
  state.plans.at(-1);

/** True while a proposed plan waits for the user's decision. */
export const planNeedsReview = (state: Checkout.State) =>
  !isClosed(state) && currentPlan(state)?.status === "proposed";

export const parseChoiceAnswer = (answer: string) => {
  const [option = "", variant] = answer.split(":", 2);
  return { option, ...(variant !== undefined && { variant }) };
};

/**
 * "option" when `answer` names one of the input's options (with a variant
 * when the option has them), "custom" for the user's own text, "invalid"
 * for an option named without its variant or with an unknown one.
 */
export const classifyChoiceAnswer = (
  input: Checkout.Input,
  answer: string,
): "option" | "custom" | "invalid" => {
  const { option, variant } = parseChoiceAnswer(answer);
  const match = input.options?.find((candidate) => candidate.id === option);
  if (!match) return answer.trim() === "" ? "invalid" : "custom";
  if (!match.variants || match.variants.length === 0) {
    return variant === undefined ? "option" : "invalid";
  }
  return match.variants.some((candidate) => candidate.id === variant)
    ? "option"
    : "invalid";
};

const REASONING_EFFORTS = new Set(["low", "medium", "high"]);

const isReasoningEffort = (
  value: unknown,
): value is NonNullable<Checkout.ModelAnswer["reasoningEffort"]> =>
  typeof value === "string" && REASONING_EFFORTS.has(value);

/** The model answer an input holds, or `undefined` when the text is not one. */
export const parseModelAnswer = (
  answer: string,
): Checkout.ModelAnswer | undefined => {
  let value: unknown;
  try {
    value = JSON.parse(answer);
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null) return undefined;
  const { provider, model, reasoningEffort } = value as Record<string, unknown>;
  if (
    typeof provider !== "string" ||
    typeof model !== "string" ||
    provider === "" ||
    model === ""
  ) {
    return undefined;
  }
  if (reasoningEffort === undefined) return { provider, model };
  if (!isReasoningEffort(reasoningEffort)) return undefined;
  return { provider, model, reasoningEffort };
};

/** Whether `answer` is a model answer naming one of the input's providers. */
export const isValidModelAnswer = (input: Checkout.Input, answer: string) => {
  const parsed = parseModelAnswer(answer);
  return (
    parsed !== undefined &&
    (input.options?.some((option) => option.id === parsed.provider) ?? false)
  );
};

export const stepProgress = (state: Checkout.State) => ({
  total: state.steps.length,
  done: state.steps.filter(
    (step) => step.status === "done" || step.status === "skipped",
  ).length,
});
