export type ProviderId = "openai" | "anthropic" | "google";

export type Provider = {
  id: ProviderId;
  name: string;
  envVar: string;
  header: string;
  placeholder: string;
};

export const PROVIDERS: readonly Provider[] = [
  {
    id: "openai",
    name: "OpenAI",
    envVar: "OPENAI_API_KEY",
    header: "x-openai-key",
    placeholder: "sk-...",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    envVar: "ANTHROPIC_API_KEY",
    header: "x-anthropic-key",
    placeholder: "sk-ant-...",
  },
  {
    id: "google",
    name: "Google",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    header: "x-google-key",
    placeholder: "AIza...",
  },
];

export type Model = {
  id: string;
  name: string;
  provider: ProviderId;
};

export const MODELS: readonly Model[] = [
  { id: "gpt-6-luna", name: "GPT-6 Luna", provider: "openai" },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", provider: "anthropic" },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "anthropic" },
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", provider: "google" },
];

export const findModel = (id: string | undefined) =>
  MODELS.find((model) => model.id === id);

export const findProvider = (id: ProviderId) =>
  PROVIDERS.find((provider) => provider.id === id)!;

export const isProviderId = (value: unknown): value is ProviderId =>
  PROVIDERS.some((provider) => provider.id === value);
