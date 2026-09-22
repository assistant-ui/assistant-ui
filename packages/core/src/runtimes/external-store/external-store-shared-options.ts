import type { ExternalStoreAdapter } from "./external-store-adapter";

export type ExternalStoreSharedOptions = Pick<
  ExternalStoreAdapter,
  | "isDisabled"
  | "isSendDisabled"
  | "canResume"
  | "unstable_capabilities"
  | "suggestions"
>;

export const pickExternalStoreSharedOptions = (
  options: ExternalStoreSharedOptions,
): ExternalStoreSharedOptions =>
  ({
    isDisabled: options.isDisabled,
    isSendDisabled: options.isSendDisabled,
    canResume: options.canResume,
    unstable_capabilities: options.unstable_capabilities,
    suggestions: options.suggestions,
  }) satisfies {
    [
      K in keyof Required<ExternalStoreSharedOptions>
    ]: ExternalStoreSharedOptions[K];
  };
