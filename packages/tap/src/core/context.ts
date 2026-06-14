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

type ReactContextWithDefault<T> = ReactContext<T> & {
  _currentValue?: T;
  _currentValue2?: T;
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

export const isTapContext = (
  context: unknown,
): context is TapContext<unknown> =>
  typeof context === "object" &&
  context !== null &&
  defaultContextValue in context;

const isReactContext = (
  context: unknown,
): context is ReactContextWithDefault<unknown> =>
  typeof context === "object" &&
  context !== null &&
  "$$typeof" in context &&
  (context as { $$typeof: unknown }).$$typeof === Symbol.for("react.context");

export const isReadableTapContext = (
  context: unknown,
): context is ReactContext<unknown> =>
  isTapContext(context) || isReactContext(context);

const assertTapContext: (
  context: unknown,
) => asserts context is TapContext<unknown> = (context) => {
  if (isTapContext(context)) return;
  if (isReactContext(context)) {
    // React stores the createContext default on the context object. There is no
    // public accessor, so this guarded fallback only runs for actual React
    // contexts that were created before the tap shim could attach the marker.
    attachDefaultValueToContext(
      context,
      context._currentValue ?? context._currentValue2,
    );
    return;
  }

  throw new Error("A tap resource's `use()` only accepts a tap context.");
};

export const useContextProvider = <T, TResult>(
  context: ReactContext<T>,
  value: T,
  fn: () => TResult,
) => {
  if (typeof context !== "object" || context === null)
    throw new Error("useContextProvider only accepts a React context.");
  if (!isTapContext(context)) attachDefaultValueToContext(context, value);

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
      currentContext.set(key, previousValue!);
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
  assertTapContext(context);

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
