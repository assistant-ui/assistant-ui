import type { ExternalStoreAdapter } from "./external-store-adapter";

export type ExternalStoreSharedOptions = Pick<
  ExternalStoreAdapter,
  "isDisabled" | "isSendDisabled" | "unstable_capabilities" | "suggestions"
>;

export const pickExternalStoreSharedOptions = (
  options: ExternalStoreSharedOptions,
): ExternalStoreSharedOptions =>
  ({
    isDisabled: options.isDisabled,
    isSendDisabled: options.isSendDisabled,
    /**
     * @deprecated Experimental since 2024-09-01, extended 2026-12-05. Not scheduled for removal; the API may change in any release.
     */
    unstable_capabilities: options.unstable_capabilities,
    suggestions: options.suggestions,
  }) satisfies {
    [
      K in keyof Required<ExternalStoreSharedOptions>
    ]: ExternalStoreSharedOptions[K];
  };
