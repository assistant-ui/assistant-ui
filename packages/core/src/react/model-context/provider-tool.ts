import type { Tool } from "assistant-stream";

type ProviderToolDefinition<TArgs extends Record<string, unknown>> = Extract<
  Tool<TArgs, unknown>,
  { type: "provider" }
>;

export type ProviderToolConfig<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
> = Pick<
  ProviderToolDefinition<TArgs>,
  | "providerId"
  | "args"
  | "parameters"
  | "providerOptions"
  | "supportsDeferredResults"
>;

/**
 * Marks a tool as provider-executed. The use-generative compiler converts
 * `execute: providerTool(...)` into a `type: "provider"` tool entry.
 */
export function providerTool(_config: ProviderToolConfig): never {
  throw new Error(
    "[assistant-ui] providerTool() has no runtime implementation — it marks a " +
      "provider-executed tool and is stripped at build time by the " +
      "use-generative compiler. Reaching it means this module was not compiled " +
      '(e.g. providerTool() used outside a "use generative" file).',
  );
}
