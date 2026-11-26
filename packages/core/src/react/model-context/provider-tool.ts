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
 * Marks a tool as provider-executed: the model provider runs it (for example a
 * hosted web search), so there is no `execute` to write. The use-generative
 * compiler converts `execute: providerTool(...)` into a `type: "provider"` tool
 * entry and lifts the config onto it. The config must be an inline object
 * literal of static, non-function properties that do not duplicate a property
 * already on the entry.
 *
 * @example
 * ```tsx
 * web_search: {
 *   execute: providerTool({
 *     providerId: "openai.web_search_preview",
 *     args: { searchContextSize: "low" },
 *   }),
 * },
 * ```
 */
export function providerTool(_config: ProviderToolConfig): never {
  throw new Error(
    "[assistant-ui] providerTool() has no runtime implementation — it marks a " +
      "provider-executed tool and is stripped at build time by the " +
      "use-generative compiler. Reaching it means this module was not compiled " +
      '(e.g. providerTool() used outside a "use generative" file).',
  );
}
