import type { ExternalStoreAdapter } from "./external-store-adapter";

/**
 * The subset of `ExternalStoreAdapter` fields that runtime wrapper hooks
 * (`useChatRuntime`, `useLangGraphRuntime`, etc.) forward verbatim from
 * their own options object. Use this as a mixin on a wrapper's options
 * type so every wrapper exposes the same thread-level surface area:
 *
 * ```ts
 * export type UseLangGraphRuntimeOptions = ExternalStoreSharedOptions & {
 *   stream: LangGraphStreamCallback;
 *   // ...other protocol-specific options
 * };
 * ```
 *
 * Then apply `pickExternalStoreSharedOptions(options)` inside the wrapper:
 *
 * ```ts
 * return useExternalStoreRuntime({
 *   ...pickExternalStoreSharedOptions(options),
 *   isRunning,
 *   messages,
 *   onNew,
 *   // ...wrapper-specific fields
 * });
 * ```
 */
export type ExternalStoreSharedOptions = Pick<
  ExternalStoreAdapter,
  "isDisabled" | "isSendDisabled" | "unstable_capabilities" | "suggestions"
>;

export const pickExternalStoreSharedOptions = (
  options: ExternalStoreSharedOptions,
): ExternalStoreSharedOptions =>
  // `satisfies Required<...>` forces every key declared on
  // `ExternalStoreSharedOptions` to appear in this object literal; if a new
  // key is added to the Pick above without updating this body, the line
  // below fails to compile.
  ({
    isDisabled: options.isDisabled,
    isSendDisabled: options.isSendDisabled,
    unstable_capabilities: options.unstable_capabilities,
    suggestions: options.suggestions,
  }) satisfies {
    [K in keyof Required<ExternalStoreSharedOptions>]: ExternalStoreSharedOptions[K];
  };
