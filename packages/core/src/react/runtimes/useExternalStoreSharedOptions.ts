"use client";

import { useMemo } from "react";
import {
  pickExternalStoreSharedOptions,
  type ExternalStoreSharedOptions,
} from "../../runtimes/external-store/external-store-shared-options";

/**
 * Memoizes the thread-level options shared across runtime wrapper hooks
 * (`useChatRuntime`, `useLangGraphRuntime`, etc.) so a wrapper that wraps
 * its own store in `useMemo` can list the returned object as a single
 * dependency instead of enumerating every shared field individually.
 *
 * The result is stable while the picked fields are stable, and changes
 * identity when any of them changes. This keeps the wrapper's `useMemo`
 * deps array decoupled from the exact set of shared fields, so future
 * additions to {@link ExternalStoreSharedOptions} flow through without
 * touching every wrapper's deps array.
 *
 * ```ts
 * const shared = useExternalStoreSharedOptions(options);
 * const store = useMemo(
 *   () => ({ ...shared, ...wrapperSpecific }),
 *   [adapterAdapters, core, _version, shared],
 * );
 * ```
 */
export const useExternalStoreSharedOptions = (
  options: ExternalStoreSharedOptions,
): ExternalStoreSharedOptions => {
  // Destructure each shared field into a primitive local so React's
  // exhaustive-deps rule can validate the memo's dep array (it doesn't
  // resolve member expressions like `options.isDisabled`). The
  // `satisfies Required<...>` clause on the helper input forces every
  // key on `ExternalStoreSharedOptions` to be passed here, so adding a
  // key to that type without also updating this site is a compile error
  // rather than a silent stale-memo bug.
  const { isDisabled, isSendDisabled, unstable_capabilities, suggestions } =
    options;
  return useMemo(
    () =>
      pickExternalStoreSharedOptions({
        isDisabled,
        isSendDisabled,
        unstable_capabilities,
        suggestions,
      } satisfies {
        [K in keyof Required<ExternalStoreSharedOptions>]: ExternalStoreSharedOptions[K];
      }),
    [isDisabled, isSendDisabled, unstable_capabilities, suggestions],
  );
};
