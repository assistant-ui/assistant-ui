import type { Checkout } from "./protocol";

export type ReasoningEffort = NonNullable<
  Checkout.ModelAnswer["reasoningEffort"]
>;

export type ModelProvider = {
  id: string;
  envKey: string;
  /** Where a key is created, and the one line that gets a user there. */
  keys: { href: string; hint: string };
  /** Whether the provider takes a reasoning effort the agent can map. */
  reasoning: boolean;
  /** The model the scaffolds ship with, when the provider has one. */
  defaultModel?: string;
  listModels: (apiKey: string) => Promise<Response>;
  parseModels: (body: unknown) => string[];
};

export type KeyTest =
  | { status: "ok"; models: string[] }
  | { status: "unauthorized" }
  | { status: "unreachable" };

/** Ids that name something other than a chat model in a provider's list. */
const NON_CHAT =
  /embed|tts|whisper|transcri|dall-e|image|audio|realtime|moderation|rerank|ocr|babbage|davinci|guard|codestral-embed|sora|aqa|imagen|veo|gemini-embedding|-vision-preview$/i;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const listOf = (body: unknown, key: string, field: string): string[] => {
  if (!isObject(body) || !Array.isArray(body[key])) return [];
  return body[key]
    .map((entry) => (isObject(entry) ? entry[field] : undefined))
    .filter((id): id is string => typeof id === "string");
};

/** Drops non-chat ids, dedupes, and sorts newest-looking names first. */
export const tidyModels = (ids: readonly string[]) =>
  [...new Set(ids.filter((id) => !NON_CHAT.test(id)))].sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }),
  );

const bearer = (apiKey: string) => ({ Authorization: `Bearer ${apiKey}` });

const openAiCompatible = (url: string) => ({
  listModels: (apiKey: string) => fetch(url, { headers: bearer(apiKey) }),
  parseModels: (body: unknown) => tidyModels(listOf(body, "data", "id")),
});

export const MODEL_PROVIDERS: Record<string, ModelProvider> = {
  openai: {
    id: "openai",
    envKey: "OPENAI_API_KEY",
    keys: {
      href: "https://platform.openai.com/api-keys",
      hint: "Sign in to the OpenAI platform and create a secret key under API keys.",
    },
    reasoning: true,
    defaultModel: "gpt-5.6-luna",
    ...openAiCompatible("https://api.openai.com/v1/models"),
  },
  anthropic: {
    id: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    keys: {
      href: "https://console.anthropic.com/settings/keys",
      hint: "Open the Anthropic Console and create a key under Settings › API keys.",
    },
    reasoning: true,
    defaultModel: "claude-sonnet-5",
    listModels: (apiKey) =>
      fetch("https://api.anthropic.com/v1/models?limit=100", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
      }),
    parseModels: (body) => tidyModels(listOf(body, "data", "id")),
  },
  google: {
    id: "google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    keys: {
      href: "https://aistudio.google.com/app/apikey",
      hint: "Open Google AI Studio and click Create API key.",
    },
    reasoning: true,
    defaultModel: "gemini-2.5-flash",
    listModels: (apiKey) =>
      fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
        { headers: { "x-goog-api-key": apiKey } },
      ),
    parseModels: (body) =>
      tidyModels(
        (isObject(body) && Array.isArray(body["models"]) ? body["models"] : [])
          .filter(
            (entry) =>
              isObject(entry) &&
              Array.isArray(entry["supportedGenerationMethods"]) &&
              entry["supportedGenerationMethods"].includes("generateContent"),
          )
          .map((entry) => String((entry as Record<string, unknown>)["name"]))
          .map((name) => name.replace(/^models\//, "")),
      ),
  },
  openrouter: {
    id: "openrouter",
    envKey: "OPENROUTER_API_KEY",
    keys: {
      href: "https://openrouter.ai/settings/keys",
      hint: "Sign in to OpenRouter and create a key under Settings › Keys. One key reaches every model it lists.",
    },
    reasoning: true,
    listModels: async (apiKey) => {
      const auth = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: bearer(apiKey),
      });
      if (!auth.ok) return auth;
      return fetch("https://openrouter.ai/api/v1/models", {
        headers: bearer(apiKey),
      });
    },
    parseModels: (body) => tidyModels(listOf(body, "data", "id")),
  },
  xai: {
    id: "xai",
    envKey: "XAI_API_KEY",
    keys: {
      href: "https://console.x.ai",
      hint: "Sign in to the xAI console and create a key under API keys.",
    },
    reasoning: true,
    ...openAiCompatible("https://api.x.ai/v1/models"),
  },
  mistral: {
    id: "mistral",
    envKey: "MISTRAL_API_KEY",
    keys: {
      href: "https://console.mistral.ai/api-keys",
      hint: "Sign in to La Plateforme and create a key under API keys.",
    },
    reasoning: false,
    ...openAiCompatible("https://api.mistral.ai/v1/models"),
  },
  deepseek: {
    id: "deepseek",
    envKey: "DEEPSEEK_API_KEY",
    keys: {
      href: "https://platform.deepseek.com/api_keys",
      hint: "Sign in to the DeepSeek platform and create a key under API keys.",
    },
    reasoning: false,
    ...openAiCompatible("https://api.deepseek.com/models"),
  },
  groq: {
    id: "groq",
    envKey: "GROQ_API_KEY",
    keys: {
      href: "https://console.groq.com/keys",
      hint: "Sign in to the Groq console and create a key under API Keys.",
    },
    reasoning: true,
    ...openAiCompatible("https://api.groq.com/openai/v1/models"),
  },
  fireworks: {
    id: "fireworks",
    envKey: "FIREWORKS_API_KEY",
    keys: {
      href: "https://fireworks.ai/account/api-keys",
      hint: "Sign in to Fireworks and create a key under Account › API keys.",
    },
    reasoning: false,
    ...openAiCompatible("https://api.fireworks.ai/inference/v1/models"),
  },
};

export const getModelProvider = (id: string): ModelProvider | undefined =>
  Object.hasOwn(MODEL_PROVIDERS, id) ? MODEL_PROVIDERS[id] : undefined;

/**
 * Checks a key straight from the browser by listing the provider's models.
 * A provider that blocks cross-origin calls reports "unreachable", which is
 * not a verdict on the key.
 */
export const testProviderKey = async (
  provider: ModelProvider,
  apiKey: string,
): Promise<KeyTest> => {
  let response: Response;
  try {
    response = await provider.listModels(apiKey);
  } catch {
    return { status: "unreachable" };
  }
  if (response.status === 401 || response.status === 403) {
    return { status: "unauthorized" };
  }
  if (!response.ok) return { status: "unreachable" };
  try {
    return {
      status: "ok",
      models: provider.parseModels(await response.json()),
    };
  } catch {
    return { status: "ok", models: [] };
  }
};

export const REASONING_EFFORTS: readonly {
  id: ReasoningEffort | "default";
  label: string;
}[] = [
  { id: "default", label: "Default" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];
