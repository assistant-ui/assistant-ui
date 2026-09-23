import type { StatewireClient } from "statewire";
import { getCatalogItem } from "@/lib/catalog";
import { INPUT_PRESETS } from "@/lib/checkout/presets";
import {
  OPTION_ICONS,
  initialCheckoutState,
  type Checkout,
} from "@/lib/checkout/protocol";
import type { CheckoutSession } from "@/lib/checkout/session-store";

export type Values = Record<string, unknown>;

export type Control =
  | { kind: "text"; key: string; label: string; rows?: number }
  | { kind: "select"; key: string; label: string; options: readonly string[] }
  | { kind: "toggle"; key: string; label: string }
  | {
      kind: "list";
      key: string;
      label: string;
      fields: readonly Control[];
      blank: Values;
    };

export type Scene = {
  state: Checkout.State | undefined;
  session?: Partial<CheckoutSession>;
  agentPresent?: boolean;
  degraded?: boolean;
  connection?: StatewireClient.Connection;
  initialPage?: string;
  chat?: boolean;
};

export type Entry = {
  id: string;
  label: string;
  group: string;
  controls: readonly Control[];
  defaults: Values;
  scene: (values: Values) => Scene;
};

export const TEXT_PRESETS = ["short", "typical", "long", "no spaces"] as const;
export type TextPreset = (typeof TEXT_PRESETS)[number];

const FILLER =
  "It keeps going well past the width the design allowed for, wraps onto a second and third line inside the card, and pushes everything below it further down.";

export const textPreset = (preset: TextPreset, typical: string) => {
  switch (preset) {
    case "short":
      return typical.split(/\s+/)[0] || "Ok";
    case "typical":
      return typical;
    case "long":
      return `${typical} ${FILLER} ${FILLER}`;
    case "no spaces":
      return "Pneumonoultramicroscopicsilicovolcanoconiosis".repeat(3);
  }
};

const str = (values: Values, key: string) => {
  const value = values[key];
  return typeof value === "string" ? value : "";
};
const on = (values: Values, key: string) => values[key] === true;
const rows = (values: Values, key: string) => {
  const value = values[key];
  return Array.isArray(value) ? (value as Values[]) : [];
};
const ids = (text: string) =>
  text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const PRODUCTS = "assistant-ui, cloud";
const productsControl: Control = {
  kind: "text",
  key: "products",
  label: "Products (slugs)",
};
const productsOf = (values: Values): Checkout.Product[] =>
  ids(str(values, "products")).map((slug) => ({
    slug,
    name: getCatalogItem(slug)?.name ?? slug,
  }));

const AGENT_KINDS = [
  "claude",
  "codex",
  "cursor",
  "gemini",
  "opencode",
  "other",
];
const agentOf = (kind: string, seen = true): Checkout.State["agent"] => ({
  lastSeenAt: seen ? 1 : null,
  connected: seen,
  cwd: seen ? "~/code/app" : null,
  kind: seen ? kind : null,
  introducedAt: 1,
});

const stateOf = (
  overrides: Partial<Checkout.State>,
  kind = "claude",
): Checkout.State => ({
  ...initialCheckoutState(),
  createdAt: 1,
  status: "planning",
  agent: agentOf(kind),
  ...overrides,
});

const inputOf = (overrides: Partial<Checkout.Input>): Checkout.Input => ({
  phase: "planning",
  id: "q1",
  kind: "text",
  prompt: "",
  optional: false,
  status: "open",
  createdAt: 1,
  ...overrides,
});

const question = (input: Checkout.Input): Scene => ({
  state: stateOf({ inputs: [input] }),
});

const helpOf = (values: Values): { help?: Checkout.InputHelp } => {
  const summary = str(values, "help");
  const href = str(values, "helpHref");
  return summary ? { help: { summary, ...(href && { href }) } } : {};
};

const questionControls = (extra: readonly Control[]): Control[] => [
  { kind: "text", key: "prompt", label: "Prompt" },
  ...extra,
  { kind: "toggle", key: "optional", label: "Optional" },
  { kind: "text", key: "help", label: "Help" },
  { kind: "text", key: "helpHref", label: "Help link" },
];

const PLAN = `## Plan

1. Install **@assistant-ui/react** and its peer packages.
2. Add \`app/api/chat/route.ts\` on the Vercel AI SDK.
3. Mount \`<Thread />\` on the home page and keep the existing layout.

Nothing changes until you approve. See the [runtime guide](https://www.assistant-ui.com/docs/runtimes/pick-a-runtime).`;

const STEP_FIELDS: Control[] = [
  { kind: "text", key: "title", label: "Title" },
  { kind: "text", key: "detail", label: "Detail" },
  {
    kind: "select",
    key: "status",
    label: "Status",
    options: ["pending", "active", "done", "skipped", "blocked"],
  },
  { kind: "text", key: "note", label: "Note" },
  {
    kind: "select",
    key: "product",
    label: "Product",
    options: ["", "assistant-ui", "cloud"],
  },
];
const stepBlank: Values = {
  title: "Add the chat route",
  detail: "app/api/chat/route.ts streams through the AI SDK.",
  status: "pending",
  note: "",
  product: "assistant-ui",
};
const DEFAULT_STEPS: Values[] = [
  {
    ...stepBlank,
    title: "Install @assistant-ui/react",
    detail: "pnpm add @assistant-ui/react ai @ai-sdk/react",
    status: "done",
  },
  { ...stepBlank, status: "active" },
  {
    ...stepBlank,
    title: "Wire Assistant Cloud persistence",
    detail: "",
    status: "pending",
    product: "cloud",
  },
];
const stepsControl: Control = {
  kind: "list",
  key: "steps",
  label: "Steps",
  fields: STEP_FIELDS,
  blank: stepBlank,
};
const stepsOf = (values: Values): Checkout.Step[] =>
  rows(values, "steps").map((row, index) => ({
    id: `s${index}`,
    title: str(row, "title"),
    status: str(row, "status") as Checkout.StepStatus,
    createdAt: index,
    ...(str(row, "detail") && { detail: str(row, "detail") }),
    ...(str(row, "note") && { note: str(row, "note") }),
    ...(str(row, "product") && { product: str(row, "product") }),
  }));

const messageBlank: Values = {
  role: "agent",
  text: "I found a Next.js app in apps/web and will put the chat route there.",
};
const messagesControl: Control = {
  kind: "list",
  key: "messages",
  label: "Messages",
  fields: [
    { kind: "select", key: "role", label: "Role", options: ["agent", "user"] },
    { kind: "text", key: "text", label: "Text", rows: 2 },
  ],
  blank: messageBlank,
};
const logOf = (values: Values): Checkout.LogEntry[] =>
  rows(values, "messages").map((row, index) => ({
    phase: "planning",
    id: `m${index}`,
    role: str(row, "role") === "user" ? "user" : "agent",
    at: 1000 + index,
    text: str(row, "text"),
  }));

const retrying: StatewireClient.Connection = {
  status: "retrying",
  degraded: true,
  attempt: 2,
  reconnect() {},
};

const VARIANT_LABELS: Record<string, string> = {
  typescript: "TypeScript",
  python: "Python",
};
const ICONS = [
  "",
  "vercel",
  "mastra",
  "langgraph",
  "claude",
  "cursor",
  "gemini",
  "opencode",
  "openai",
  "anthropic",
  "google",
  "xai",
  "openrouter",
  "mistral",
  "deepseek",
  "groq",
  "fireworks",
  ...OPTION_ICONS,
];
const optionBlank: Values = {
  label: "Mastra",
  description: "Workflows, memory and tools",
  icon: "mastra",
  variants: "typescript",
};
const optionsControl: Control = {
  kind: "list",
  key: "options",
  label: "Options",
  fields: [
    { kind: "text", key: "label", label: "Label" },
    { kind: "text", key: "description", label: "Description" },
    { kind: "select", key: "icon", label: "Icon", options: ICONS },
    {
      kind: "select",
      key: "variants",
      label: "Variants",
      options: ["", "typescript", "typescript, python"],
    },
  ],
  blank: optionBlank,
};
const optionsOf = (values: Values): Checkout.ChoiceOption[] =>
  rows(values, "options").map((row, index) => ({
    id: `option-${index}`,
    label: str(row, "label"),
    ...(str(row, "description") && { description: str(row, "description") }),
    ...(str(row, "icon") && { icon: str(row, "icon") }),
    ...(str(row, "variants") && {
      variants: ids(str(row, "variants")).map((id) => ({
        id,
        label: VARIANT_LABELS[id] ?? id,
      })),
    }),
  }));

const framework = INPUT_PRESETS.framework;
const llm = INPUT_PRESETS["llm-provider"];
const frameworkRows: Values[] = framework.options.map((option) => ({
  label: option.label,
  description: option.description ?? "",
  icon: option.icon ?? "",
  variants: (option.variants ?? []).map((variant) => variant.id).join(", "),
}));

const INTEGRATION_ROWS: Values[] = [
  {
    label: "Slack notifications for every escalation the assistant hands off",
    description: "Posts to a channel through an incoming webhook",
    icon: "message",
    variants: "",
  },
  {
    label: "Postgres search over the product documentation and past tickets",
    description: "pgvector on the existing database",
    icon: "database",
    variants: "",
  },
  {
    label: "File uploads",
    description: "Images and PDFs in the composer",
    icon: "paperclip",
    variants: "",
  },
  {
    label: "Voice input",
    description: "",
    icon: "mic",
    variants: "",
  },
];

const choiceScene = (values: Values): Scene =>
  question(
    inputOf({
      kind: "choice",
      prompt: str(values, "prompt"),
      options: optionsOf(values),
      optional: on(values, "optional"),
      ...(on(values, "multiple") && { multiple: true }),
      ...(on(values, "preselect") && { default: "option-0" }),
      ...(str(values, "preset") && { preset: str(values, "preset") }),
      ...helpOf(values),
    }),
  );

export const ENTRIES: readonly Entry[] = [
  {
    id: "intro",
    label: "Intro",
    group: "Frame",
    controls: [productsControl],
    defaults: { products: PRODUCTS },
    scene: (values) => ({
      state: undefined,
      session: { products: ids(str(values, "products")), introSeen: false },
    }),
  },
  {
    id: "license",
    label: "License",
    group: "Frame",
    controls: [{ kind: "toggle", key: "accepted", label: "Accepted earlier" }],
    defaults: { accepted: false },
    scene: (values) =>
      on(values, "accepted")
        ? {
            state: stateOf({ status: "waiting", agent: agentOf("", false) }),
            initialPage: "license",
          }
        : { state: undefined, session: { licenseAccepted: false } },
  },
  {
    id: "connect",
    label: "Connect",
    group: "Frame",
    controls: [
      {
        kind: "select",
        key: "phase",
        label: "Phase",
        options: ["unconnected", "waiting", "connected", "quiet"],
      },
      { kind: "select", key: "kind", label: "Agent", options: AGENT_KINDS },
      productsControl,
    ],
    defaults: { phase: "unconnected", kind: "claude", products: PRODUCTS },
    scene: (values) => {
      const phase = str(values, "phase");
      const products = productsOf(values);
      const seen = phase === "connected" || phase === "quiet";
      return {
        state: stateOf({
          status: "waiting",
          products,
          agent: {
            ...agentOf(str(values, "kind"), seen),
            introducedAt: phase === "unconnected" ? null : 1,
          },
        }),
        agentPresent: phase === "connected",
        session: { products: products.map((product) => product.slug) },
      };
    },
  },
  {
    id: "disconnected",
    label: "Disconnected dialog",
    group: "Frame",
    controls: [
      { kind: "select", key: "kind", label: "Agent", options: AGENT_KINDS },
    ],
    defaults: { kind: "claude" },
    scene: (values) => ({
      state: stateOf({}, str(values, "kind")),
      agentPresent: false,
    }),
  },
  {
    id: "notice",
    label: "Connection notice",
    group: "Frame",
    controls: [
      {
        kind: "select",
        key: "status",
        label: "Status",
        options: ["retrying", "stopped"],
      },
      { kind: "text", key: "attempt", label: "Attempt" },
      { kind: "text", key: "message", label: "Message" },
    ],
    defaults: {
      status: "retrying",
      attempt: "3",
      message: "The server closed the connection.",
    },
    scene: (values) => {
      const message = str(values, "message");
      return {
        state: stateOf({}),
        degraded: true,
        connection:
          str(values, "status") === "retrying"
            ? {
                ...retrying,
                attempt: Number(str(values, "attempt")) || 1,
                ...(message && { message }),
              }
            : {
                status: "stopped",
                degraded: true,
                reason: "gone",
                ...(message && { message }),
                reconnect() {},
              },
      };
    },
  },
  {
    id: "working",
    label: "Exploring",
    group: "Frame",
    controls: [
      {
        kind: "select",
        key: "variant",
        label: "Variant",
        options: ["exploring", "revising"],
      },
      { kind: "text", key: "feedback", label: "Feedback" },
      { kind: "toggle", key: "present", label: "Agent present" },
    ],
    defaults: {
      variant: "exploring",
      feedback: "Use Anthropic instead.",
      present: true,
    },
    scene: (values) => ({
      state: stateOf({
        plans:
          str(values, "variant") === "revising"
            ? [
                {
                  revision: 1,
                  markdown: PLAN,
                  status: "changes-requested",
                  submittedAt: 1,
                  decidedAt: 2,
                  feedback: str(values, "feedback"),
                },
              ]
            : [],
      }),
      agentPresent: on(values, "present"),
    }),
  },
  {
    id: "plan",
    label: "Plan",
    group: "Frame",
    controls: [
      {
        kind: "select",
        key: "view",
        label: "View",
        options: ["proposed", "approved", "closed"],
      },
      { kind: "text", key: "markdown", label: "Markdown", rows: 8 },
      {
        kind: "list",
        key: "earlier",
        label: "Earlier revisions",
        fields: [
          { kind: "text", key: "feedback", label: "Feedback" },
          { kind: "text", key: "markdown", label: "Markdown", rows: 3 },
        ],
        blank: {
          feedback: "Skip the thread list for now.",
          markdown: "1. Install the packages.\n2. Add the chat route.",
        },
      },
    ],
    defaults: { view: "proposed", markdown: PLAN, earlier: [] },
    scene: (values) => {
      const view = str(values, "view");
      const earlier: Checkout.Plan[] = rows(values, "earlier").map(
        (row, index) => ({
          revision: index + 1,
          markdown: str(row, "markdown"),
          status: "changes-requested",
          submittedAt: index,
          decidedAt: index,
          feedback: str(row, "feedback"),
        }),
      );
      const current: Checkout.Plan = {
        revision: earlier.length + 1,
        markdown: str(values, "markdown"),
        status: view === "proposed" ? "proposed" : "approved",
        submittedAt: 9,
        ...(view !== "proposed" && { decidedAt: 10 }),
      };
      return {
        state: stateOf({
          status:
            view === "proposed"
              ? "planning"
              : view === "approved"
                ? "installing"
                : "done",
          plans: [...earlier, current],
        }),
        ...(view !== "proposed" && { initialPage: "plan" }),
      };
    },
  },
  {
    id: "install",
    label: "Install",
    group: "Frame",
    controls: [
      {
        kind: "select",
        key: "phase",
        label: "Phase",
        options: ["planning", "writing", "running"],
      },
      stepsControl,
      productsControl,
      { kind: "toggle", key: "proposal", label: "Finish proposed" },
      { kind: "toggle", key: "reviewing", label: "Reviewing, question open" },
      { kind: "toggle", key: "present", label: "Agent present" },
    ],
    defaults: {
      phase: "running",
      steps: DEFAULT_STEPS,
      products: PRODUCTS,
      proposal: false,
      reviewing: false,
      present: true,
    },
    scene: (values) => {
      const phase = str(values, "phase");
      const steps =
        phase === "planning"
          ? []
          : stepsOf(values).map((step) =>
              phase === "writing"
                ? { ...step, status: "pending" as const }
                : step,
            );
      const reviewing = on(values, "reviewing");
      const active = steps.find((step) => step.status === "active");
      return {
        state: stateOf({
          status: "installing",
          products: productsOf(values),
          steps,
          inputs: reviewing
            ? [
                inputOf({
                  phase: "installing",
                  prompt: "Which port should the dev server use?",
                  ...(active && { stepId: active.id }),
                }),
              ]
            : [],
          ...(on(values, "proposal") && { completion: { proposedAt: 5 } }),
        }),
        agentPresent: on(values, "present"),
        ...(reviewing && { initialPage: "install" }),
      };
    },
  },
  {
    id: "finish",
    label: "Finish",
    group: "Frame",
    controls: [
      { kind: "text", key: "preview", label: "Preview URL" },
      { kind: "toggle", key: "followedUp", label: "Message sent since" },
    ],
    defaults: { preview: "http://localhost:3000", followedUp: false },
    scene: (values) => {
      const preview = str(values, "preview");
      return {
        state: stateOf({
          status: "installing",
          completion: { proposedAt: 5, ...(preview && { preview }) },
          log: on(values, "followedUp")
            ? [
                {
                  phase: "installing",
                  id: "m1",
                  role: "user",
                  at: 6,
                  text: "Can you also add dark mode?",
                },
              ]
            : [],
        }),
      };
    },
  },
  {
    id: "closed",
    label: "Closed",
    group: "Frame",
    controls: [
      {
        kind: "select",
        key: "status",
        label: "Status",
        options: ["done", "cancelled"],
      },
      stepsControl,
    ],
    defaults: { status: "done", steps: DEFAULT_STEPS },
    scene: (values) => ({
      state: stateOf({
        status: str(values, "status") === "cancelled" ? "cancelled" : "done",
        steps: stepsOf(values),
      }),
    }),
  },
  {
    id: "chat",
    label: "Messages",
    group: "Frame",
    controls: [{ kind: "toggle", key: "open", label: "Open" }, messagesControl],
    defaults: {
      open: true,
      messages: [
        messageBlank,
        { role: "user", text: "Put it in apps/web, and use pnpm." },
        {
          role: "agent",
          text: "Done. Next I will add the route:\n\n```ts\nexport const POST = ...\n```",
        },
      ],
    },
    scene: (values) => ({
      state: stateOf({ log: logOf(values) }),
      chat: on(values, "open"),
    }),
  },
  {
    id: "footer",
    label: "Footer",
    group: "Frame",
    controls: [
      {
        kind: "select",
        key: "status",
        label: "Indicator",
        options: [
          "exploring",
          "needs you",
          "working",
          "quiet",
          "reconnecting",
          "finished",
          "cancelled",
        ],
      },
      messagesControl,
    ],
    defaults: { status: "exploring", messages: [] },
    scene: (values) => {
      const status = str(values, "status");
      return {
        state: stateOf({
          status:
            status === "working"
              ? "installing"
              : status === "finished"
                ? "done"
                : status === "cancelled"
                  ? "cancelled"
                  : "planning",
          inputs:
            status === "needs you"
              ? [inputOf({ prompt: "Which package manager?" })]
              : [],
          log: logOf(values),
        }),
        agentPresent: status !== "quiet",
        degraded: status === "reconnecting",
        ...(status === "reconnecting" && { connection: retrying }),
      };
    },
  },
  {
    id: "text",
    label: "Text",
    group: "Questions",
    controls: [
      { kind: "text", key: "prompt", label: "Prompt" },
      { kind: "text", key: "placeholder", label: "Placeholder" },
      { kind: "text", key: "default", label: "Default" },
      { kind: "toggle", key: "optional", label: "Optional" },
    ],
    defaults: {
      prompt: "Which directory holds the Next.js app?",
      placeholder: "apps/web",
      default: "",
      optional: false,
    },
    scene: (values) =>
      question(
        inputOf({
          prompt: str(values, "prompt"),
          optional: on(values, "optional"),
          ...(str(values, "placeholder") && {
            placeholder: str(values, "placeholder"),
          }),
          ...(str(values, "default") && { default: str(values, "default") }),
        }),
      ),
  },
  {
    id: "secret",
    label: "Text, secret guard",
    group: "Questions",
    controls: [
      { kind: "text", key: "prompt", label: "Prompt" },
      { kind: "toggle", key: "optional", label: "Optional" },
    ],
    defaults: { prompt: "Paste your OpenAI API key.", optional: true },
    scene: (values) =>
      question(
        inputOf({
          prompt: str(values, "prompt"),
          optional: on(values, "optional"),
        }),
      ),
  },
  {
    id: "choice",
    label: "Choice",
    group: "Questions",
    controls: questionControls([
      optionsControl,
      { kind: "toggle", key: "preselect", label: "Default: first option" },
      { kind: "toggle", key: "multiple", label: "Multiple" },
      {
        kind: "select",
        key: "preset",
        label: "Preset",
        options: ["", "project", "framework"],
      },
    ]),
    defaults: {
      prompt: framework.prompt,
      options: frameworkRows,
      preselect: false,
      multiple: false,
      preset: "framework",
      optional: false,
      help: framework.help.summary,
      helpHref: framework.help.href ?? "",
    },
    scene: choiceScene,
  },
  {
    id: "choice-multiple",
    label: "Choice, multiple",
    group: "Questions",
    controls: questionControls([
      optionsControl,
      { kind: "toggle", key: "preselect", label: "Default: first option" },
      { kind: "toggle", key: "multiple", label: "Multiple" },
    ]),
    defaults: {
      prompt: "Which integrations should the assistant reach?",
      options: INTEGRATION_ROWS,
      preselect: false,
      multiple: true,
      optional: true,
      help: "Pick everything you want wired up now; the rest can be added later.",
      helpHref: "",
    },
    scene: choiceScene,
  },
  {
    id: "model",
    label: "Model",
    group: "Questions",
    controls: questionControls([
      { kind: "text", key: "providers", label: "Providers (ids)" },
      {
        kind: "select",
        key: "default",
        label: "Default",
        options: ["", "openai", "anthropic", "google"],
      },
    ]),
    defaults: {
      prompt: llm.prompt,
      providers: llm.options.map((option) => option.id).join(", "),
      default: "openai",
      optional: false,
      help: llm.help.summary,
      helpHref: "",
    },
    scene: (values) =>
      question(
        inputOf({
          kind: "model",
          prompt: str(values, "prompt"),
          options: ids(str(values, "providers")).map(
            (id) =>
              llm.options.find((option) => option.id === id) ?? {
                id,
                label: id,
              },
          ),
          optional: on(values, "optional"),
          ...(str(values, "default") && { default: str(values, "default") }),
          ...helpOf(values),
        }),
      ),
  },
  {
    id: "product",
    label: "Product",
    group: "Questions",
    controls: [
      { kind: "text", key: "prompt", label: "Prompt" },
      {
        kind: "select",
        key: "product",
        label: "Product",
        options: ["assistant-ui", "cloud", "react-app", "unknown-product"],
      },
      { kind: "toggle", key: "optional", label: "Optional" },
    ],
    defaults: {
      prompt: "Assistant Cloud needs the assistant-ui packages. Add them?",
      product: "assistant-ui",
      optional: false,
    },
    scene: (values) =>
      question(
        inputOf({
          kind: "product",
          prompt: str(values, "prompt"),
          product: str(values, "product"),
          optional: on(values, "optional"),
        }),
      ),
  },
  {
    id: "answer",
    label: "Answer review",
    group: "Questions",
    controls: [
      {
        kind: "select",
        key: "kind",
        label: "Kind",
        options: ["text", "choice", "model", "product"],
      },
      {
        kind: "select",
        key: "status",
        label: "Status",
        options: ["answered", "dismissed"],
      },
      { kind: "text", key: "prompt", label: "Prompt" },
      { kind: "text", key: "answer", label: "Answer" },
      { kind: "text", key: "note", label: "Note" },
    ],
    defaults: {
      kind: "text",
      status: "answered",
      prompt: "Which directory holds the Next.js app?",
      answer: "apps/web",
      note: "",
    },
    scene: (values) => {
      const kind = str(values, "kind") as Checkout.InputKind;
      const answered = str(values, "status") === "answered";
      return {
        state: stateOf({
          inputs: [
            inputOf({
              kind,
              prompt: str(values, "prompt"),
              status: answered ? "answered" : "dismissed",
              answeredAt: 2,
              ...(answered && { answer: str(values, "answer") }),
              ...(str(values, "note") && { note: str(values, "note") }),
              ...(kind === "choice" && { options: framework.options }),
              ...(kind === "model" && { options: llm.options }),
              ...(kind === "product" && { product: "assistant-ui" }),
            }),
          ],
        }),
        initialPage: "answer:q1",
      };
    },
  },
];
