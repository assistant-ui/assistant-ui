import "react";

import { StatewireClient } from "statewire";

declare const AGENT_HEARTBEAT_MS = 5000;

declare const AGENT_PRESENCE_MS = 15000;

type AgentInstructionsOptions = {
  command?: string;
  startedByAgent?: {
    browserUrl: string;
    opened?: boolean;
    streaming?: boolean;
  };
  guide?: Pick<Guide, "texts">;
};

type AskReason = "browser-closed" | "no-browser" | "recently-opened";

declare const BROWSER_HEARTBEAT_MS = 5000;

declare const CLI_CAPABILITIES: readonly string[];

declare const CLI_FEATURES: readonly [
  "ask.preset",
  "ask.choices",
  "ask.single",
  "ask.entry-points",
  "ask.wait",
  "wait.timeout",
  "env.redeem-key",
  "answer",
  "done.preview",
  "presets"
];

declare const CODING_AGENTS: readonly CodingAgent[];

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
  type InputKind = "choice" | "entry-point" | "model" | "product" | "text";
  type EntryPoint = {
    formFactor: "full-page" | "modal" | "sidebar";
    placement: string;
    trigger: string;
    recommended?: boolean;
  };
  type EntryPointOption = {
    id: string;
    label: string;
    description: string;
    entryPoint: EntryPoint;
  };
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
    entryPoint?: EntryPoint;
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
    redeemKeyHash?: string;
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
    browser?: {
      lastSeenAt: number | null;
      connected: boolean;
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
    redeemKeyHash?: string;
    optional?: boolean;
  };
  type PlanDecision = {
    id?: string;
    revision?: number;
  } & ({
    decision: "approve";
  } | {
    decision: "revise";
    feedback: string;
  });
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
    "checkout/cancel": (params?: {
      id?: string;
    }) => void;
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
    "browser/heartbeat": () => void;
    "browser/bye": () => void;
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
  type RejectionReason = "already-created" | "closed" | "empty-message" | "empty-plan" | "feedback-required" | "finish-not-proposed" | "input-closed" | "invalid-answer" | "invalid-input" | "invalid-preview" | "no-plan" | "not-created" | "plan-decided" | "plan-required" | "planning-not-started" | "stale-plan" | "unknown-input" | "unknown-message" | "unknown-product" | "unknown-step";
}

type CheckoutClient = StatewireClient<Checkout.State | undefined, Checkout.Commands>;

declare const CheckoutHost: (restored?: unknown) => ResourceElement<{
  state: Checkout.State;
  commands: import("statewire").Statewire.CommandsProxy<import("statewire/host").StatewireHost.HandledCommands<Checkout.Commands>>;
  snapshot: () => unknown;
  subscribe: (listener: () => void) => () => void;
}>;

type ChoiceAnswerKind = "custom" | "invalid" | "option";

type CodingAgent = {
  kind: string;
  name: string;
  launch?: {
    commands: readonly string[];
    args: (prompt: string) => string[];
    install: string;
  };
};

declare const DEFAULT_GUIDE_CONTEXT: GuideContext;

type FollowSetupOptions = {
  guide?: Pick<Guide, "texts">;
  print?: (events: StreamEvent[]) => void;
  agent?: {
    cwd?: string;
    kind?: string;
  };
  browser?: {
    setupAppUrl: string;
    linkId: string;
    answerCommand: string;
    open?: (url: string) => void;
    canOpen?: boolean;
    now?: () => number;
  };
};

declare const GUIDE_PROTOCOL = 1;

declare const GUIDE_TEXTS: {
  readonly briefing: readonly [
    "cmd",
    "url",
    "browserUrl",
    "icons"
  ];
  readonly "intro.status-heading": readonly [
  ];
  readonly "stream.briefing": readonly [
    "name",
    "cmd",
    "url",
    "linkId",
    "browserUrl"
  ];
  readonly "stream.briefing-footer": readonly [
    "browserUrl"
  ];
  readonly "stream.stay-connected": readonly [
  ];
  readonly "stream.opened.input": readonly [
    "prompt",
    "url",
    "wait"
  ];
  readonly "stream.opened.plan": readonly [
    "url",
    "wait"
  ];
  readonly "stream.opened.finish": readonly [
    "url"
  ];
  readonly "stream.ask.recently-opened": readonly [
    "question",
    "agoSeconds",
    "wait"
  ];
  readonly "stream.ask.browser-closed": readonly [
    "question"
  ];
  readonly "stream.ask.no-browser": readonly [
    "question",
    "page"
  ];
  readonly "wait.waiting": readonly [
  ];
  readonly "done.next": readonly [
  ];
  readonly "need.plan.question": readonly [
  ];
  readonly "need.plan.approve": readonly [
  ];
  readonly "need.plan.revise": readonly [
  ];
  readonly "need.plan.format": readonly [
  ];
  readonly "need.finish.question": readonly [
  ];
  readonly "need.finish.question-preview": readonly [
    "preview"
  ];
  readonly "need.finish.close": readonly [
  ];
  readonly "need.finish.format": readonly [
  ];
  readonly "need.input.empty-prompt": readonly [
  ];
  readonly "need.input.optional": readonly [
  ];
  readonly "need.input.model": readonly [
  ];
  readonly "need.product.add": readonly [
    "product"
  ];
  readonly "need.product.decline": readonly [
  ];
  readonly "need.format.text": readonly [
  ];
  readonly "need.format.product": readonly [
  ];
  readonly "need.format.model": readonly [
  ];
  readonly "need.format.entry-point": readonly [
  ];
  readonly "need.format.choice": readonly [
  ];
  readonly "need.format.multiple": readonly [
  ];
};

type Guide = {
  protocol: number;
  texts: Record<GuideTextKey, string>;
  intro: GuideStep[];
  presets: Record<string, Preset>;
};

type GuideContext = {
  started: "agent" | "agent-stream" | "user";
  opened: boolean;
};

declare class GuideError extends Error {
  name: string;
}

type GuideRequest = {
  protocol: number;
  capabilities: readonly string[];
  context: GuideContext;
};

type GuideResponse = {
  status: number;
  body: unknown;
};

type GuideStep = {
  action: "print";
  text: GuideTextKey;
} | {
  action: "print-status";
} | {
  action: "announce-agent";
};

type GuideTextKey = keyof typeof GUIDE_TEXTS;

declare const HELP: string;

declare const INPUT_PRESETS: Record<PresetId, Preset>;

declare const INSTRUCTIONS: typeof agentInstructions;

declare const LOCAL_ACTIONS: readonly [
  "print",
  "print-status",
  "announce-agent"
];

type LocalAction = (typeof LOCAL_ACTIONS)[number];

declare const MIN_GUIDE_PROTOCOL = 1;

type NeedOption = {
  id: string;
  label: string;
  description?: string;
};

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

type RunAgentSetupOptions = {
  server: string;
  setupAppUrl: string;
  products: Checkout.ProductSeed[];
  command: string;
  name?: string;
  canOpen?: boolean;
  open?: (url: string) => void;
  onSession?: (session: SetupSession) => void;
  write?: (text: string) => void;
  env?: NodeJS.ProcessEnv;
  connect?: (url: string) => Promise<CheckoutClient>;
  stream?: Pick<FollowSetupOptions, "agent" | "print">;
};

type RunSetupCommandOptions = {
  command?: string;
  browser?: {
    setupAppUrl: string;
    canOpen?: boolean;
  };
};

type SetupSession = {
  linkId: string;
  setupId: string;
  agentUrl: string;
  browserUrl: string;
  products: Checkout.ProductSeed[];
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
} | {
  event: "browser.opened";
  id: string;
  url: string;
  message: string;
} | ({
  event: "input.needed";
  id: string;
  reason: AskReason;
  message: string;
  answer: string;
} & TerminalQuestion);

type TerminalQuestion = {
  question: string;
  options?: NeedOption[];
  multiple?: true;
  answerFormat: string;
};

declare const agentInstructions: (setupUrl: string, options?: AgentInstructionsOptions) => string;

declare const askSeed: (rest: readonly string[], flags: Parsed["flags"], presets?: Readonly<Record<string, Preset>>) => Checkout.InputSeed & {
  stepId?: string;
};

declare const buildGuide: (_param0: GuideRequest) => Guide;

declare const bundledGuide: (context?: GuideContext) => Guide;

declare const classifyChoiceAnswer: (input: Checkout.Input, answer: string) => ChoiceAnswerKind;

declare namespace entry_cli_exports {
  export { AgentInstructionsOptions, CODING_AGENTS, CodingAgent, HELP, INSTRUCTIONS, RunSetupCommandOptions, agentInstructions, askSeed, detectAgentKind, diffEvents, findCommand, isDirectInvocation, main, parseSetupUrl, runCodingAgent, runSetupCommand, upsertEnvLine, waitForStart, writeEnvSecret };
}

declare const connectCheckout: (url: string) => Promise<CheckoutClient>;

declare const currentPlan: (state: Checkout.State) => Checkout.Plan | undefined;

declare const detectAgentKind: (env?: NodeJS.ProcessEnv) => string | undefined;

declare const diffEvents: (before: Checkout.State, after: Checkout.State, guide?: Pick<Guide, "texts">) => StreamEvent[];

declare const findCommand: (commands: readonly string[], env?: NodeJS.ProcessEnv) => string | undefined;

declare const finishProposed: (state: Checkout.State) => boolean;

declare const followedUpSinceProposal: (state: Checkout.State) => boolean;

declare const guideQuery: (_param1: GuideRequest) => string;

declare namespace entry_guide_exports {
  export { CLI_CAPABILITIES, CLI_FEATURES, DEFAULT_GUIDE_CONTEXT, GUIDE_PROTOCOL, GUIDE_TEXTS, Guide, GuideContext, GuideError, GuideRequest, GuideResponse, GuideStep, GuideTextKey, LOCAL_ACTIONS, LocalAction, MIN_GUIDE_PROTOCOL, buildGuide, bundledGuide, guideQuery, parseGuide, parseGuideQuery, renderText, respondToGuideRequest };
}

declare namespace entry_host_exports {
  export { Checkout, CheckoutHost };
}

declare namespace entry_root_exports {
  export { AGENT_HEARTBEAT_MS, AGENT_PRESENCE_MS, BROWSER_HEARTBEAT_MS, Checkout, CheckoutClient, INPUT_PRESETS, OPTION_ICONS, OptionIcon, PresetId, PresetOverrides, classifyChoiceAnswer, connectCheckout, currentPlan, finishProposed, followedUpSinceProposal, initialCheckoutState, isAgentPresent, isClosed, isOptionIcon, isPresetId, isValidEntryPointAnswer, isValidEntryPointInput, isValidModelAnswer, openInputs, parseChoiceAnswer, parseEntryPointOptions, parseModelAnswer, parseMultipleAnswer, parsePreviewUrl, planNeedsReview, presetInput, stepProgress };
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

declare const isPresetId: (id: string, presets?: Readonly<Record<string, Preset>>) => id is PresetId;

declare const isValidEntryPointAnswer: (input: Checkout.Input, answer: string) => boolean;

declare const isValidEntryPointInput: (input: Checkout.InputSeed) => boolean;

declare const isValidModelAnswer: (input: Checkout.Input, answer: string) => boolean;

declare const main: (argv: readonly string[]) => Promise<void>;

declare const openInputs: (state: Checkout.State) => Checkout.Input[];

declare const parseChoiceAnswer: (answer: string) => {
  option: string;
  variant?: string;
};

declare const parseEntryPointOptions: (value: unknown) => Checkout.EntryPointOption[] | undefined;

declare const parseGuide: (value: unknown, request: GuideRequest, fallback?: Guide) => Guide;

declare const parseGuideQuery: (params: URLSearchParams) => GuideRequest | undefined;

declare const parseModelAnswer: (answer: string) => Checkout.ModelAnswer | undefined;

declare const parseMultipleAnswer: (answer: string) => string[] | undefined;

declare const parsePreviewUrl: (value: string | undefined) => URL | undefined;

declare const parseSetupUrl: (value: string) => string;

declare const planNeedsReview: (state: Checkout.State) => boolean;

declare const presetInput: (id: PresetId, overrides?: PresetOverrides, presets?: Readonly<Record<string, Preset>>) => Checkout.InputSeed & {
  stepId?: string;
};

declare const renderText: (guide: Pick<Guide, "texts">, key: GuideTextKey, values?: Partial<Record<string, string | number>>) => string;

declare const respondToGuideRequest: (params: URLSearchParams, supported?: {
  min: number;
  max: number;
}) => GuideResponse;

declare const runAgentSetup: (options: RunAgentSetupOptions) => Promise<{
  session: SetupSession;
  stream: {
    stop: () => Promise<void>;
  };
  client: CheckoutClient;
}>;

declare const runCodingAgent: (agent: CodingAgent, prompt: string) => Promise<number | undefined>;

declare const runSetupCommand: (argv: readonly string[], options?: RunSetupCommandOptions) => Promise<void>;

declare namespace entry_sdk_exports {
  export { RunAgentSetupOptions, SetupSession, runAgentSetup };
}

declare const stepProgress: (state: Checkout.State) => {
  total: number;
  done: number;
};

declare const upsertEnvLine: (content: string, key: string, value: string) => string;

declare const waitForStart: (client: Pick<CheckoutClient, "state" | "subscribe">) => Promise<Checkout.Status>;

declare const writeEnvSecret: (file: string, key: string, take: () => Promise<string>, projectRoot?: string) => Promise<void>;

export { entry_cli_exports as entry_cli, entry_guide_exports as entry_guide, entry_host_exports as entry_host, entry_root_exports as entry_root, entry_sdk_exports as entry_sdk };
