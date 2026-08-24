"use client";

import { useAuiState } from "@assistant-ui/store";
import type { AssistantClient } from "@assistant-ui/store";
import {
  createRuntimeExtrasBrand,
  type RuntimeExtrasBrand,
} from "../../runtime/utils/runtime-extras-brand";

/** @deprecated Internal API for external-store adapter authors. Not part of the public API; may change or be removed without notice. */
export type RuntimeExtras<T extends object> = {
  provide: (value: T) => T;
  is: (extras: unknown) => extras is T;
  tryGet: (extras: unknown) => T | undefined;
  get: (client: AssistantClient) => T;
  use: {
    (): T;
    <S>(select: (extras: T) => S): S;
    <S>(select: (extras: T) => S, fallback: S): S;
  };
};

/** @deprecated Internal API for external-store adapter authors. Not part of the public API; may change or be removed without notice. */
export const unstable_createRuntimeExtrasFromBrand = <T extends object>(
  brand: RuntimeExtrasBrand<T>,
): RuntimeExtras<T> => {
  const { provide, is, tryGet, assert } = brand;

  const get = (client: AssistantClient): T =>
    assert(client.thread.getState().extras);

  function use<S>(
    select?: (extras: T) => S,
    ...rest: [fallback: S] | []
  ): S | T {
    // Detect a provided fallback by arity, not value: callers pass an explicit
    // `undefined` fallback, which must return `undefined` rather than throw.
    const hasFallback = rest.length > 0;
    const fallback = rest[0] as S;
    return useAuiState((s) => {
      const extras = s.thread.extras;
      if (is(extras)) return select ? select(extras) : extras;
      if (hasFallback) return fallback;
      return assert(extras);
    });
  }

  return { provide, is, tryGet, get, use: use as RuntimeExtras<T>["use"] };
};

/** @deprecated Internal API for external-store adapter authors. Not part of the public API; may change or be removed without notice. */
export const createRuntimeExtras = <T extends object>(
  runtimeName: string,
): RuntimeExtras<T> =>
  unstable_createRuntimeExtrasFromBrand(
    createRuntimeExtrasBrand<T>(runtimeName),
  );
