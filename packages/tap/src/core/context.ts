import type { Context as ReactContext } from "react";
import { useEffect, useRef } from "react";
import type {
  ResourceContext,
  ResourceContextDeps,
  ResourceContextValue,
  ResourceFiber,
} from "./types";
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
const changedContexts = new Map<object, true>();

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
  const currentFiber = getCurrentResourceFiber();
  const committedValueRef = useRef<{ value: T } | undefined>(undefined);
  const didChange =
    committedValueRef.current === undefined ||
    !Object.is(committedValueRef.current.value, value);
  useEffect(() => {
    committedValueRef.current = { value };
  }, [value]);

  const previousValue = currentContext.get(key);
  const hadPreviousValue =
    previousValue !== undefined || currentContext.has(key);
  currentContext.set(key, { value, source: currentFiber });

  try {
    return withChangedContext(key, didChange, fn);
  } finally {
    if (hadPreviousValue) {
      currentContext.set(key, previousValue);
    } else {
      currentContext.delete(key);
    }
  }
};

const withChangedContext = <T>(
  context: object,
  didChange: boolean,
  fn: () => T,
) => {
  const restoreChangedContext = changedContexts.has(context);

  if (didChange) {
    changedContexts.set(context, true);
  } else {
    changedContexts.delete(context);
  }

  try {
    return fn();
  } finally {
    if (restoreChangedContext) {
      changedContexts.set(context, true);
    } else {
      changedContexts.delete(context);
    }
  }
};

export const useTapContext = <T>(context: ReactContext<T>) => {
  ensureTapContext(context);

  const key = context as object;
  const contextValue = getCurrentContextValue(key, context);
  const currentFiber = getCurrentResourceFiber();
  (currentFiber.wipContextDeps ??= new Map()).set(key, contextValue.source);
  return contextValue.value as T;
};

const getCurrentContextValue = <T>(
  key: object,
  context: ReactContext<T>,
): ResourceContextValue =>
  currentContext.get(key) ?? {
    value: asTap(context)[defaultContextValue],
    source: null,
  };

const mergeContextDeps = (
  targetFiber: ResourceFiber<any>,
  sourceFiber: ResourceFiber<any>,
  target: ResourceContextDeps | null,
  source: ResourceContextDeps | null,
) => {
  if (!source) return target;

  let next = target;
  for (const [context, providerFiber] of source) {
    if (providerFiber === sourceFiber || providerFiber === targetFiber) {
      continue;
    }
    (next ??= new Map()).set(context, providerFiber);
  }
  return next;
};

export const bubbleContextDeps = (
  fiber: ResourceFiber<any>,
  contextDeps: ResourceContextDeps | null = fiber.wipContextDeps,
) => {
  const currentFiber = peekResourceFiber();
  if (!currentFiber || !contextDeps) return;

  currentFiber.wipContextDeps = mergeContextDeps(
    currentFiber,
    fiber,
    currentFiber.wipContextDeps,
    contextDeps,
  );
};

export const hasChangedContexts = () => changedContexts.size > 0;

export const hasContextDepsChanged = (fiber: ResourceFiber<any, any[]>) => {
  if (!fiber.contextDeps || !hasChangedContexts()) return false;

  for (const context of changedContexts.keys()) {
    if (fiber.contextDeps.has(context)) return true;
  }

  return false;
};
