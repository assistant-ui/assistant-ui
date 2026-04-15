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
import type {
  OnSelectBehavior,
  TriggerPopoverResourceOutput,
} from "./TriggerPopoverResource";

export type RegisteredTrigger = {
  readonly id: string;
  readonly char: string;
  readonly onSelect: OnSelectBehavior;
  readonly resource: TriggerPopoverResourceOutput;
};

export type TriggerPopoverLifecycleListener = {
  added(trigger: RegisteredTrigger): void;
  removed(id: string): void;
};

export type TriggerPopoverRootContextValue = {
  register(id: string, trigger: Omit<RegisteredTrigger, "id">): () => void;
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
    (id, trigger) => {
      if (triggersRef.current.has(id)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[assistant-ui] Duplicate triggerId "${id}" registered in TriggerPopoverRoot. Each trigger must have a unique id; ignoring the second registration.`,
          );
        }
        return () => {};
      }
      const entry: RegisteredTrigger = { id, ...trigger };
      const next = new Map(triggersRef.current);
      next.set(id, entry);
      triggersRef.current = next;
      notify();
      for (const l of lifecycleListenersRef.current) l.added(entry);
      return () => {
        const after = new Map(triggersRef.current);
        after.delete(id);
        triggersRef.current = after;
        notify();
        for (const l of lifecycleListenersRef.current) l.removed(id);
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
 * Provider that groups one or more `TriggerPopover` declarations. Declare each
 * trigger as a `<ComposerPrimitive.Unstable_TriggerPopover>` child with its own
 * `triggerId`, `char`, `adapter` and `onSelect` behavior.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Unstable_TriggerPopoverRoot>
 *   <ComposerPrimitive.Unstable_TriggerPopover
 *     triggerId="mention"
 *     char="@"
 *     adapter={mentionAdapter}
 *     onSelect={{ type: "insertDirective", formatter }}
 *   >
 *     ...
 *   </ComposerPrimitive.Unstable_TriggerPopover>
 *
 *   <ComposerPrimitive.Unstable_TriggerPopover
 *     triggerId="slash"
 *     char="/"
 *     adapter={slashAdapter}
 *     onSelect={{ type: "action", handler }}
 *   >
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
