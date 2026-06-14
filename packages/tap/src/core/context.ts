import type { Context as ReactContext } from "react";
import type { ResourceContext, ResourceFiber, TapRoot } from "./types";
import {
  getCurrentResourceFiber,
  peekResourceFiber,
} from "./helpers/execution-context";

const defaultContextValue: unique symbol = Symbol("tap.Context.defaultValue");
type TapContext<T> = ReactContext<T> & {
  [defaultContextValue]: T;
};

const asTap = <T>(context: ReactContext<T>): TapContext<T> =>
  context as unknown as TapContext<T>;

let currentContext: ResourceContext = new Map();

export const cloneCurrentTapContext = (): ResourceContext =>
  new Map(currentContext);

export const withTapContextRoot = <TResult>(
  context: ResourceContext,
  fn: () => TResult,
) => {
  const previousContext = currentContext;
  currentContext = context;
  try {
    return fn();
  } finally {
    currentContext = previousContext;
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
  const key = context as object;
  const previousValue = currentContext.get(key);
  const hadPreviousValue =
    previousValue !== undefined || currentContext.has(key);

  currentContext.set(key, value);
  try {
    return fn();
  } finally {
    if (hadPreviousValue) {
      currentContext.set(key, previousValue);
    } else {
      currentContext.delete(key);
    }
  }
};

export const useTapContext = <T>(context: ReactContext<T>) => {
  ensureTapContext(context);

  const key = context as object;
  const value = currentContext.has(key)
    ? currentContext.get(key)
    : asTap(context)[defaultContextValue];
  const currentFiber = getCurrentResourceFiber();
  (currentFiber.wipContextDeps ??= new Map()).set(key, value);
  return value as T;
};

export const bubbleContextDeps = (fiber: ResourceFiber<any>) => {
  const currentFiber = peekResourceFiber();
  if (!currentFiber?.wipContextDeps || !fiber.wipContextDeps) return;

  for (const [context, value] of fiber.wipContextDeps) {
    // TODO instead of always forwarding, there should be context source tracking
    // if context source of a context dep is this current fiber, don't bubble it up
    currentFiber?.wipContextDeps.set(context, value);
  }
};

export const hasContextDepsChanged = (fiber: ResourceFiber<any, any[]>) => {
  if (!fiber.contextDeps) return false;

  for (const [context, previousValue] of fiber.contextDeps) {
    const currentValue = currentContext.get(context);
    if (!Object.is(previousValue, currentValue)) return true;
  }

  return false;
};
