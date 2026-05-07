import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { HarnessRequestContext } from "@mastra/core/harness";
import type { LanguageModel } from "@mastra/core/llm";
import type { RequestContext } from "@mastra/core/request-context";

type ProviderFactory = (modelName: string) => unknown;

const PROVIDERS: Record<string, ProviderFactory> = {
  openai: (model) => createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(model),
  anthropic: (model) => createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(model),
  google: (model) => createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })(model),
};

const PROVIDER_ENV_VARS: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

const MODEL_PREFIX_MAP: Record<string, string> = {
  "gpt-": "openai",
  "o1-": "openai",
  "o3-": "openai",
  "o4-": "openai",
  "chatgpt-": "openai",
  "claude-": "anthropic",
  "gemini-": "google",
};

export function resolveModel(modelId: string): LanguageModel {
  const slashIndex = modelId.indexOf("/");
  if (slashIndex === -1) {
    for (const [prefix, provider] of Object.entries(MODEL_PREFIX_MAP)) {
      if (modelId.startsWith(prefix)) return resolveModel(`${provider}/${modelId}`);
    }
    throw new Error(`Invalid model ID "${modelId}". Expected "provider/model-name".`);
  }

  const provider = modelId.slice(0, slashIndex);
  const modelName = modelId.slice(slashIndex + 1);
  const factory = PROVIDERS[provider];
  if (!factory) throw new Error(`Unknown model provider "${provider}". Available: ${Object.keys(PROVIDERS).join(", ")}`);

  const envVar = PROVIDER_ENV_VARS[provider];
  if (envVar && !process.env[envVar]) {
    throw new Error(`Missing API key for provider "${provider}". Set ${envVar}.`);
  }

  return factory(modelName) as LanguageModel;
}

export function getDynamicModel({ requestContext }: { requestContext: RequestContext }): LanguageModel {
  const ctx = requestContext?.get?.("harness") as HarnessRequestContext<any> | undefined;
  const modelId = ctx?.getState?.()?.currentModelId ?? process.env.MODEL_ID ?? "openai/gpt-5.4";
  return resolveModel(modelId);
}
