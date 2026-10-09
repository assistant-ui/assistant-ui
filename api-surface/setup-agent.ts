import "react";

import { StatewireClient } from "statewire";

declare const AGENT_HEARTBEAT_MS = 5000;

declare const AGENT_PRESENCE_MS = 15000;

declare namespace Checkout {
  type StepStatus = "active" | "blocked" | "done" | "pending" | "skipped";
  type Step = {
    id: string;
    title: string;
    detail?: string;
    status: StepStatus;
    note?: string;
    product?: string;
    createdAt: number;
  };
  type Product = {
    slug: string;
    name: string;
    guide?: string;
  };
  type InputStatus = "answered" | "dismissed" | "open";
  type InputKind = "choice" | "model" | "product" | "text";
  type ChoiceVariant = {
    id: string;
    label: string;
  };
  type ChoiceOption = {
    id: string;
    label: string;
    description?: string;
    icon?: string;
    variants?: ChoiceVariant[];
  };
  type InputHelp = {
    summary: string;
    href?: string;
  };
  type ModelAnswer = {
    provider: string;
    model: string;
    reasoningEffort?: "high" | "low" | "medium";
  };
  type Input = {
    phase: Status;
    id: string;
    kind: InputKind;
    preset?: string;
    prompt: string;
    placeholder?: string;
    options?: ChoiceOption[];
    multiple?: true;
    product?: string;
    default?: string;
    help?: InputHelp;
    optional: boolean;
    status: InputStatus;
    answer?: string;
    note?: string;
    stepId?: string;
    createdAt: number;
    answeredAt?: number;
  };
  type LogEntry = {
    phase: Status;
    id: string;
    role: "agent" | "user";
    acknowledgedAt?: number;
    at: number;
    text: string;
    stepId?: string;
  };
  type PlanStatus = "approved" | "changes-requested" | "proposed";
  type Plan = {
    revision: number;
    markdown: string;
    status: PlanStatus;
    submittedAt: number;
    decidedAt?: number;
    feedback?: string;
  };
  type Status = "cancelled" | "done" | "installing" | "planning" | "waiting";
  type Completion = {
    proposedAt: number;
    preview?: string;
  };
  type State = {
    version: 2;
    id: string | null;
    status: Status;
    completion?: Completion;
    createdAt: number | null;
    products: Product[];
    instructions: string;
    agent: {
      lastSeenAt: number | null;
      connected: boolean;
      cwd: string | null;
      kind: string | null;
      introducedAt: number | null;
    };
    plans: Plan[];
    steps: Step[];
    inputs: Input[];
    log: LogEntry[];
  };
  type ProductSeed = {
    slug: string;
    name: string;
    guide?: string;
  };
  type InputSeed = {
    kind?: InputKind;
    preset?: string;
    prompt: string;
    placeholder?: string;
    options?: ChoiceOption[];
    multiple?: true;
    product?: string;
    default?: string;
    help?: InputHelp;
    optional?: boolean;
  };
  type PlanDecision = {
    decision: "approve";
  } | {
    decision: "revise";
    feedback: string;
  };
  type Commands = {
    "checkout/create": (params: {
      id: string;
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
    "checkout/message": (params: {
      text: string;
    }) => void;
    "agent/ack": (params: {
      messageId: string;
    }) => void;
    "checkout/dismiss": (params: {
      inputId: string;
    }) => void;
    "checkout/plan": (params: PlanDecision) => void;
    "checkout/cancel": () => void;
    "checkout/finish": () => void;
    "agent/intro": (params: {
      kind?: string;
    }) => void;
    "agent/hello": (params: {
      cwd?: string;
      kind?: string;
    }) => void;
    "agent/heartbeat": () => void;
    "agent/bye": () => void;
    "agent/plan": (params: {
      markdown: string;
    }) => {
      revision: number;
    };
    "agent/add-step": (params: {
      title: string;
      detail?: string;
      product?: string;
      active?: boolean;
    }) => {
      stepId: string;
    };
    "agent/step": (params: {
      stepId: string;
      status: StepStatus;
      note?: string;
    }) => void;
    "agent/ask": (params: InputSeed & {
      stepId?: string;
    }) => {
      inputId: string;
    };
    "agent/log": (params: {
      text: string;
    }) => void;
    "agent/done": (params?: {
      summary?: string;
      preview?: string;
    }) => void;
  };
  type RejectionReason = "already-created" | "closed" | "empty-message" | "empty-plan" | "feedback-required" | "finish-not-proposed" | "input-closed" | "invalid-answer" | "invalid-input" | "invalid-preview" | "no-plan" | "not-created" | "plan-decided" | "plan-required" | "planning-not-started" | "unknown-input" | "unknown-message" | "unknown-product" | "unknown-step";
}

type CheckoutClient = StatewireClient<Checkout.State | undefined, Checkout.Commands>;

declare const CheckoutHost: (restored?: unknown) => ResourceElement<{
  state: Checkout.State;
  commands: import("statewire").Statewire.CommandsProxy<import("statewire/host").StatewireHost.HandledCommands<Checkout.Commands>>;
  snapshot: () => unknown;
  subscribe: (listener: () => void) => () => void;
}>;

type ChoiceAnswerKind = "custom" | "invalid" | "option";

declare const HELP: string;

declare const INPUT_PRESETS: Record<PresetId, Preset>;

declare const INSTRUCTIONS: (url: string) => string;

declare const OPTION_ICONS: readonly [
  "code",
  "terminal",
  "braces",
  "git-branch",
  "package",
  "database",
  "server",
  "cloud",
  "globe",
  "monitor",
  "smartphone",
  "key",
  "lock",
  "shield",
  "brain",
  "sparkles",
  "bot",
  "workflow",
  "file",
  "folder",
  "book",
  "table",
  "image",
  "video",
  "mic",
  "speech",
  "paperclip",
  "message",
  "mail",
  "bell",
  "calendar",
  "clock",
  "user",
  "users",
  "settings",
  "wrench",
  "plug",
  "link",
  "palette",
  "search",
  "zap",
  "check",
  "question"
];

type OptionIcon = (typeof OPTION_ICONS)[number];

type Parsed = {
  positional: string[];
  flags: Map<string, string | true>;
};

type Preset = {
  kind: Checkout.InputKind;
  prompt: string;
  options: Checkout.ChoiceOption[];
  default?: string;
  help: Checkout.InputHelp;
};

type PresetId = "framework" | "llm-provider" | "project";

type PresetOverrides = {
  only?: readonly string[];
  found?: readonly {
    id: string;
    description?: string;
  }[];
  default?: string;
  optional?: boolean;
  stepId?: string;
};

type ResourceElement<V> = {
  readonly hook: (...args: any[]) => V;
  readonly args: readonly unknown[];
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
};

type StreamEvent = {
  event: "planning.started";
} | {
  event: "message.created";
  messageId: string;
  text: string;
} | {
  event: "input.answered";
  inputId: string;
  prompt: string;
  answer: string | string[];
  note?: string;
  custom?: true;
} | {
  event: "input.dismissed";
  inputId: string;
  prompt: string;
} | {
  event: "plan.approved";
  revision: number;
} | {
  event: "plan.changes-requested";
  revision: number;
  feedback: string;
} | {
  event: "finished";
  next: string;
} | {
  event: "cancelled";
  next: string;
} | {
  event: "setup.created";
  products: string[];
};

declare const askSeed: (rest: readonly string[], flags: Parsed["flags"]) => Checkout.InputSeed & {
  stepId?: string;
};

declare const classifyChoiceAnswer: (input: Checkout.Input, answer: string) => ChoiceAnswerKind;

declare namespace entry_cli_exports {
  export { HELP, INSTRUCTIONS, askSeed, detectAgentKind, diffEvents, isDirectInvocation, main, upsertEnvLine, waitForStart, writeEnvSecret };
}

declare const connectCheckout: (url: string) => Promise<CheckoutClient>;

declare const currentPlan: (state: Checkout.State) => Checkout.Plan | undefined;

declare const detectAgentKind: (env?: NodeJS.ProcessEnv) => string | undefined;

declare const diffEvents: (before: Checkout.State, after: Checkout.State) => StreamEvent[];

declare const finishProposed: (state: Checkout.State) => boolean;

declare const followedUpSinceProposal: (state: Checkout.State) => boolean;

declare namespace entry_host_exports {
  export { Checkout, CheckoutHost };
}

declare namespace entry_root_exports {
  export { AGENT_HEARTBEAT_MS, AGENT_PRESENCE_MS, Checkout, CheckoutClient, INPUT_PRESETS, OPTION_ICONS, OptionIcon, PresetId, PresetOverrides, classifyChoiceAnswer, connectCheckout, currentPlan, finishProposed, followedUpSinceProposal, initialCheckoutState, isAgentPresent, isClosed, isOptionIcon, isPresetId, isValidModelAnswer, openInputs, parseChoiceAnswer, parseModelAnswer, parseMultipleAnswer, parsePreviewUrl, planNeedsReview, presetInput, stepProgress };
}

declare const initialCheckoutState: () => Checkout.State;

declare const isAgentPresent: (state: Checkout.State, now?: number) => boolean;

declare const isClosed: (state: Checkout.State) => boolean;

declare const isDirectInvocation: (env?: NodeJS.ProcessEnv, stdin?: {
  isTTY?: boolean | undefined;
}, stdout?: {
  isTTY?: boolean | undefined;
}) => boolean;

declare const isOptionIcon: (value: string) => value is OptionIcon;

declare const isPresetId: (id: string) => id is PresetId;

declare const isValidModelAnswer: (input: Checkout.Input, answer: string) => boolean;

declare const main: (argv: readonly string[]) => Promise<undefined>;

declare const openInputs: (state: Checkout.State) => Checkout.Input[];

declare const parseChoiceAnswer: (answer: string) => {
  variant?: string;
  option: string;
};

declare const parseModelAnswer: (answer: string) => Checkout.ModelAnswer | undefined;

declare const parseMultipleAnswer: (answer: string) => string[] | undefined;

declare const parsePreviewUrl: (value: string | undefined) => URL | undefined;

declare const planNeedsReview: (state: Checkout.State) => boolean;

declare const presetInput: (id: PresetId, overrides?: PresetOverrides) => Checkout.InputSeed & {
  stepId?: string;
};

declare const stepProgress: (state: Checkout.State) => {
  total: number;
  done: number;
};

declare const upsertEnvLine: (content: string, key: string, value: string) => string;

declare const waitForStart: (client: Pick<CheckoutClient, "state" | "subscribe">) => Promise<Checkout.Status>;

declare const writeEnvSecret: (file: string, key: string, take: () => Promise<string>) => Promise<void>;

export { entry_cli_exports as entry_cli, entry_host_exports as entry_host, entry_root_exports as entry_root };
