"use client";

import { useMemo } from "react";
import type { ExternalStoreSharedOptions } from "../../runtimes/external-store/external-store-shared-options";

export const useExternalStoreSharedOptions = (
  options: ExternalStoreSharedOptions,
): ExternalStoreSharedOptions => {
  const {
    isDisabled,
    isSendDisabled,
    unstable_capabilities,
    suggestions,
    queue,
  } = options;
  return useMemo(
    () =>
      ({
        isDisabled,
        isSendDisabled,
        unstable_capabilities,
        suggestions,
        queue,
      }) satisfies {
        [K in keyof Required<ExternalStoreSharedOptions>]: ExternalStoreSharedOptions[K];
      },
    [isDisabled, isSendDisabled, unstable_capabilities, suggestions, queue],
  );
};
