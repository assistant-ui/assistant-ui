import type { ExternalStoreAdapter } from "./external-store-adapter";

export type ExternalStoreSharedOptions = Pick<
  ExternalStoreAdapter,
  | "isDisabled"
  | "isSendDisabled"
  | "unstable_capabilities"
  | "suggestions"
  | "queue"
>;

export const pickExternalStoreSharedOptions = (
  options: ExternalStoreSharedOptions,
): ExternalStoreSharedOptions =>
  ({
    isDisabled: options.isDisabled,
    isSendDisabled: options.isSendDisabled,
    unstable_capabilities: options.unstable_capabilities,
    suggestions: options.suggestions,
    queue: options.queue,
  }) satisfies {
    [K in keyof Required<ExternalStoreSharedOptions>]: ExternalStoreSharedOptions[K];
  };
