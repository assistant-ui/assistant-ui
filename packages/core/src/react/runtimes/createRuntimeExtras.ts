"use client";

import { useAuiState } from "@assistant-ui/store";
import type { AssistantClient } from "@assistant-ui/store";

export type RuntimeExtras<T> = {
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

export const createRuntimeExtras = <T>(
  runtimeName: string,
): RuntimeExtras<T> => {
  const brand = Symbol(`${runtimeName} extras`);

  const is = (extras: unknown): extras is T =>
    typeof extras === "object" && extras !== null && brand in extras;

  const assert = (extras: unknown): T => {
    if (!is(extras))
      throw new Error(
        `This hook can only be used inside the ${runtimeName} runtime.`,
      );
    return extras;
  };

  const provide = (value: T): T => {
    Object.defineProperty(value, brand, {
      value: true,
      enumerable: false,
      configurable: true,
    });
    return value;
  };

  const tryGet = (extras: unknown): T | undefined =>
    is(extras) ? extras : undefined;

  const get = (client: AssistantClient): T =>
    assert(client.thread().getState().extras);

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
