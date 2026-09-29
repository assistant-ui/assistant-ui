import type { Checkout } from "./protocol";

const TYPESCRIPT = { id: "typescript", label: "TypeScript" };
const PYTHON = { id: "python", label: "Python" };

const DOCS = "https://www.assistant-ui.com";

export type PresetId = "framework" | "llm-provider";

export type PresetOverrides = {
  /** Restrict the options to these ids, in this order; one id locks the choice in. */
  only?: readonly string[];
  default?: string;
  optional?: boolean;
  stepId?: string;
};

type Preset = {
  kind: Checkout.InputKind;
  prompt: string;
  options: Checkout.ChoiceOption[];
  default?: string;
  help: Checkout.InputHelp;
};

/** The standard inputs an agent can ask with `ask --preset <id>`. */
export const INPUT_PRESETS: Record<PresetId, Preset> = {
  framework: {
    kind: "choice",
    prompt: "Which agent framework runs your backend?",
    options: [
      {
        id: "ai-sdk",
        label: "Vercel AI SDK",
        description: "Shortest path for Next.js and React",
        icon: "vercel",
        variants: [TYPESCRIPT],
      },
      {
        id: "mastra",
        label: "Mastra",
        description: "Workflows, memory and tools",
        icon: "mastra",
        variants: [TYPESCRIPT],
      },
      {
        id: "langgraph",
        label: "LangGraph",
        description: "Stateful graphs, Python or TypeScript",
        icon: "langgraph",
        variants: [PYTHON, TYPESCRIPT],
      },
    ],
    help: {
      summary:
        "Already on one of these? Pick it. Starting fresh in Next.js, the AI SDK is the shortest path. Mastra adds workflows and memory in TypeScript. LangGraph fits a Python backend or multi-step graphs that pause for a human.",
      href: `${DOCS}/docs/runtimes/pick-a-runtime`,
    },
  },
  "llm-provider": {
    kind: "model",
    prompt: "Which model should the assistant use?",
    options: [
      {
        id: "openai",
        label: "OpenAI",
        description: "OPENAI_API_KEY",
        icon: "openai",
      },
      {
        id: "anthropic",
        label: "Anthropic",
        description: "ANTHROPIC_API_KEY",
        icon: "anthropic",
      },
      {
        id: "google",
        label: "Google Gemini",
        description: "GOOGLE_GENERATIVE_AI_API_KEY",
        icon: "google",
      },
      {
        id: "openrouter",
        label: "OpenRouter",
        description: "OPENROUTER_API_KEY",
        icon: "openrouter",
      },
      { id: "xai", label: "xAI", description: "XAI_API_KEY", icon: "xai" },
      {
        id: "mistral",
        label: "Mistral",
        description: "MISTRAL_API_KEY",
        icon: "mistral",
      },
      {
        id: "deepseek",
        label: "DeepSeek",
        description: "DEEPSEEK_API_KEY",
        icon: "deepseek",
      },
      { id: "groq", label: "Groq", description: "GROQ_API_KEY", icon: "groq" },
      {
        id: "fireworks",
        label: "Fireworks AI",
        description: "FIREWORKS_API_KEY",
        icon: "fireworks",
      },
    ],
    default: "openai",
    help: {
      summary:
        "Any of them works with every framework here. Pick the one whose API key you already have, or OpenRouter to reach many models with one key.",
    },
  },
};

export const isPresetId = (id: string): id is PresetId => id in INPUT_PRESETS;

/** Build the seed for a standard input, throwing on an unknown preset, option or default. */
export const presetInput = (
  id: PresetId,
  overrides: PresetOverrides = {},
): Checkout.InputSeed & { stepId?: string } => {
  const preset = INPUT_PRESETS[id];
  const options = overrides.only
    ? overrides.only.map((optionId) => {
        const option = preset.options.find((c) => c.id === optionId);
        if (!option)
          throw new Error(`preset "${id}" has no option "${optionId}"`);
        return option;
      })
    : preset.options;
  const fallback = options.some((o) => o.id === preset.default)
    ? preset.default
    : undefined;
  const chosen = overrides.default ?? fallback;
  if (chosen !== undefined && !options.some((o) => o.id === chosen)) {
    throw new Error(`preset "${id}" has no option "${chosen}" to default to`);
  }
  return {
    kind: preset.kind,
    preset: id,
    prompt: preset.prompt,
    options,
    ...(chosen !== undefined && { default: chosen }),
    help: preset.help,
    optional: overrides.optional ?? false,
    ...(overrides.stepId !== undefined && { stepId: overrides.stepId }),
  };
};
