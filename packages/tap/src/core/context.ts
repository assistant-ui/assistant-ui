import type { Context as ReactContext } from "react";
import type { ResourceContext, TapRoot } from "./types";
import { peekResourceFiber } from "./helpers/execution-context";

const defaultContextValue: unique symbol = Symbol("tap.Context.defaultValue");
type TapContext<T> = ReactContext<T> & {
  [defaultContextValue]: T;
};

const asTap = <T>(context: ReactContext<T>): TapContext<T> =>
  context as unknown as TapContext<T>;

let ambientContext: ResourceContext = new Map();

const getCurrentTapContext = (): ResourceContext => {
  const fiber = peekResourceFiber();
  if (fiber) return fiber.root.context;

  return ambientContext;
};

export const cloneCurrentTapContext = (): ResourceContext =>
  new Map(getCurrentTapContext());

export const withTapRootContext = <TResult>(
  root: TapRoot,
  context: ResourceContext,
  fn: () => TResult,
) => {
  const previousContext = root.context;
  root.context = context;
  try {
    return fn();
  } finally {
    root.context = previousContext;
  }
};

// Tap uses regular React contexts. The shim attaches the default value here so
// the same context object can be read from tap renders without involving
// React's context stack.
export const attachDefaultValueToContext = <T>(
  context: ReactContext<T>,
  defaultValue: T,
) => {
  (context as TapContext<T>)[defaultContextValue] = defaultValue;
};

const ensureTapContext = (context: unknown) => {
  // TODO fitler out promises and stores
  if (
    typeof context === "object" &&
    context !== null &&
    defaultContextValue in context
  )
    return;

  attachDefaultValueToContext(
    context as ReactContext<unknown>,
    (context as any)._currentValue2,
  );
};

/**
 * @deprecated experimental — the resource context API is not yet stable and may
 * change or be removed in a future release.
 */
export const useContextProvider = <T, TResult>(
  context: ReactContext<T>,
  value: T,
  fn: () => TResult,
) => {
  const resourceContext = getCurrentTapContext();
  const key = context as object;
  const previousValue = resourceContext.get(key);
  const hadPreviousValue = previousValue || resourceContext.has(key);

  resourceContext.set(key, value);
  try {
    return fn();
  } finally {
    if (hadPreviousValue) {
      resourceContext.set(key, previousValue);
    } else {
      resourceContext.delete(key);
    }
  }
};

export const useTapContext = <T>(context: ReactContext<T>) => {
  ensureTapContext(context);

  const resourceContext = getCurrentTapContext();
  return resourceContext.has(context as object)
    ? (resourceContext.get(context as object) as T)
    : asTap(context)[defaultContextValue];
};
