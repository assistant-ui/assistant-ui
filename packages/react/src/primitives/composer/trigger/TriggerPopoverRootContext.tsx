"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type FC,
  type ReactNode,
} from "react";
import {
  ComposerInputPluginProvider,
  useComposerInputPluginRegistryOptional,
} from "../ComposerInputPluginContext";
import type { TriggerPopoverResourceOutput } from "./TriggerPopoverResource";
import type { TriggerBehavior } from "./triggerSelectionResource";

export type RegisteredTrigger = {
  readonly char: string;
  /** Behavior contributed by a child `TriggerPopover.Directive` / `.Action`. */
  readonly behavior?: TriggerBehavior;
  readonly resource: TriggerPopoverResourceOutput;
};

export type TriggerPopoverLifecycleListener = {
  added(trigger: RegisteredTrigger): void;
  removed(char: string): void;
};

export type TriggerPopoverRootContextValue = {
  register(trigger: RegisteredTrigger): () => void;
  getTriggers(): ReadonlyMap<string, RegisteredTrigger>;
  subscribe(listener: () => void): () => void;
  /** Subscribe to per-trigger add/remove events. */
  subscribeLifecycle(listener: TriggerPopoverLifecycleListener): () => void;
};

const TriggerPopoverRootContext =
  createContext<TriggerPopoverRootContextValue | null>(null);

export const useTriggerPopoverRootContext = () => {
  const ctx = useContext(TriggerPopoverRootContext);
  if (!ctx)
    throw new Error(
      "useTriggerPopoverRootContext must be used within ComposerPrimitive.TriggerPopoverRoot",
    );
  return ctx;
};

export const useTriggerPopoverRootContextOptional = () =>
  useContext(TriggerPopoverRootContext);

/**
 * Live map of registered triggers, re-rendering on change. Prefer
 * `subscribeLifecycle` for incremental add/remove handling.
 */
export const useTriggerPopoverTriggers = () => {
  const ctx = useTriggerPopoverRootContext();
  return useSyncExternalStore(ctx.subscribe, ctx.getTriggers, ctx.getTriggers);
};

const EMPTY_TRIGGERS: ReadonlyMap<string, RegisteredTrigger> = new Map();
const noopSubscribe = () => () => {};
const getEmptyTriggers = () => EMPTY_TRIGGERS;

/** Like `useTriggerPopoverTriggers` but returns an empty map outside a root. */
export const useTriggerPopoverTriggersOptional = () => {
  const ctx = useTriggerPopoverRootContextOptional();
  return useSyncExternalStore(
    ctx ? ctx.subscribe : noopSubscribe,
    ctx ? ctx.getTriggers : getEmptyTriggers,
    ctx ? ctx.getTriggers : getEmptyTriggers,
  );
};

export namespace ComposerPrimitiveTriggerPopoverRoot {
  export type Props = {
    children: ReactNode;
  };
}

const TriggerPopoverRootInner: FC<
  ComposerPrimitiveTriggerPopoverRoot.Props
> = ({ children }) => {
  const triggersRef = useRef<ReadonlyMap<string, RegisteredTrigger>>(new Map());
  const listenersRef = useRef<Set<() => void>>(new Set());
  const lifecycleListenersRef = useRef<Set<TriggerPopoverLifecycleListener>>(
    new Set(),
  );

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) listener();
  }, []);

  const register = useCallback<TriggerPopoverRootContextValue["register"]>(
    (trigger) => {
      const { char } = trigger;
      if (triggersRef.current.has(char)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[assistant-ui] Duplicate TriggerPopover for char "${char}". Ignoring the second registration.`,
          );
        }
        return () => {};
      }
      if (process.env.NODE_ENV !== "production") {
        for (const existing of triggersRef.current.values()) {
          if (
            char.startsWith(existing.char) ||
            existing.char.startsWith(char)
          ) {
            console.warn(
              `[assistant-ui] Trigger prefix collision between "${existing.char}" and "${char}". One char is a prefix of the other; only one will match reliably.`,
            );
          }
        }
      }
      const next = new Map(triggersRef.current);
      next.set(char, trigger);
      triggersRef.current = next;
      notify();
      for (const l of lifecycleListenersRef.current) l.added(trigger);
      return () => {
        const after = new Map(triggersRef.current);
        after.delete(char);
        triggersRef.current = after;
        notify();
        for (const l of lifecycleListenersRef.current) l.removed(char);
      };
    },
    [notify],
  );

  const getTriggers = useCallback<
    TriggerPopoverRootContextValue["getTriggers"]
  >(() => triggersRef.current, []);

  const subscribe = useCallback<TriggerPopoverRootContextValue["subscribe"]>(
    (listener) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    [],
  );

  const subscribeLifecycle = useCallback<
    TriggerPopoverRootContextValue["subscribeLifecycle"]
  >((listener) => {
    lifecycleListenersRef.current.add(listener);
    return () => {
      lifecycleListenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<TriggerPopoverRootContextValue>(
    () => ({ register, getTriggers, subscribe, subscribeLifecycle }),
    [register, getTriggers, subscribe, subscribeLifecycle],
  );

  return (
    <TriggerPopoverRootContext.Provider value={value}>
      {children}
    </TriggerPopoverRootContext.Provider>
  );
};

/**
 * Provider that groups one or more `TriggerPopover` declarations. Each trigger
 * is identified by its `char` (unique within the root). Behavior is contributed
 * by a child `TriggerPopover.Directive` or `TriggerPopover.Action`.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Unstable_TriggerPopoverRoot>
 *   <ComposerPrimitive.Unstable_TriggerPopover char="@" adapter={mentionAdapter}>
 *     <ComposerPrimitive.Unstable_TriggerPopover.Directive formatter={formatter} />
 *     ...
 *   </ComposerPrimitive.Unstable_TriggerPopover>
 *
 *   <ComposerPrimitive.Unstable_TriggerPopover char="/" adapter={slashAdapter}>
 *     <ComposerPrimitive.Unstable_TriggerPopover.Action onExecute={handler} />
 *     ...
 *   </ComposerPrimitive.Unstable_TriggerPopover>
 *
 *   <ComposerPrimitive.Root>
 *     <ComposerPrimitive.Input />
 *   </ComposerPrimitive.Root>
 * </ComposerPrimitive.Unstable_TriggerPopoverRoot>
 * ```
 */
export const ComposerPrimitiveTriggerPopoverRoot: FC<
  ComposerPrimitiveTriggerPopoverRoot.Props
> = ({ children }) => {
  const existingRegistry = useComposerInputPluginRegistryOptional();

  if (existingRegistry) {
    return <TriggerPopoverRootInner>{children}</TriggerPopoverRootInner>;
  }

  return (
    <ComposerInputPluginProvider>
      <TriggerPopoverRootInner>{children}</TriggerPopoverRootInner>
    </ComposerInputPluginProvider>
  );
};

ComposerPrimitiveTriggerPopoverRoot.displayName =
  "ComposerPrimitive.TriggerPopoverRoot";
