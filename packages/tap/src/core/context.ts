import type { Context as ReactContext } from "react";

const contextValue: unique symbol = Symbol("tap.Context");
type TapContext<T> = {
  [contextValue]: T;
};

const asTap = <T>(context: ReactContext<T>): TapContext<T> =>
  context as unknown as TapContext<T>;

// A tap resource context is typed as a React `Context<T>` purely so React's
// `use(context)` accepts it (the type is erased, so this adds no runtime react
// dependency). At runtime it is only a branded `{ [contextValue]: T }` and is
// not a usable React context — `use()` routes it to `useResourceContext()` via the brand.
/**
 * @deprecated experimental — the resource context API is not yet stable and may
 * change or be removed in a future release.
 */
export const createResourceContext = <T>(defaultValue: T): ReactContext<T> => {
  return {
    [contextValue]: defaultValue,
  } as unknown as ReactContext<T>;
};

export const isResourceContext = (value: unknown): boolean => {
  return typeof value === "object" && value !== null && contextValue in value;
};

/**
 * @deprecated experimental — the resource context API is not yet stable and may
 * change or be removed in a future release.
 */
export const withContextProvider = <T, TResult>(
  context: ReactContext<T>,
  value: T,
  fn: () => TResult,
) => {
  const tapContext = asTap(context);
  const previousValue = tapContext[contextValue];
  tapContext[contextValue] = value;
  try {
    return fn();
  } finally {
    tapContext[contextValue] = previousValue;
  }
};

export const useResourceContext = <T>(context: ReactContext<T>) => {
  return asTap(context)[contextValue];
};
