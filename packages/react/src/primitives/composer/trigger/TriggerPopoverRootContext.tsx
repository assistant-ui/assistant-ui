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

export type TriggerPopoverRootContextValue = {
  register(id: string, trigger: Omit<RegisteredTrigger, "id">): () => void;
  getTriggers(): ReadonlyMap<string, RegisteredTrigger>;
  subscribe(listener: () => void): () => void;
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
 * Hook that returns the live map of registered triggers and re-renders when it
 * changes. Use from consumers that need to iterate triggers reactively
 * (e.g. `@assistant-ui/react-lexical`'s `MentionPlugin`).
 */
export const useTriggerPopoverTriggers = () => {
  const ctx = useTriggerPopoverRootContext();
  return useSyncExternalStore(ctx.subscribe, ctx.getTriggers, ctx.getTriggers);
};

const EMPTY_TRIGGERS: ReadonlyMap<string, RegisteredTrigger> = new Map();
const noopSubscribe = () => () => {};
const getEmptyTriggers = () => EMPTY_TRIGGERS;

/**
 * Same as `useTriggerPopoverTriggers` but returns an empty map when used
 * outside a `TriggerPopoverRoot` instead of throwing. Intended for input-level
 * integrations (e.g. Lexical `MentionPlugin`) that must render even when no
 * trigger root is present.
 */
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
  const triggersRef = useRef<Map<string, RegisteredTrigger>>(new Map());
  const snapshotRef = useRef<ReadonlyMap<string, RegisteredTrigger>>(
    triggersRef.current,
  );
  const listenersRef = useRef<Set<() => void>>(new Set());

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) listener();
  }, []);

  // Rebuild the snapshot Map on every mutation so useSyncExternalStore sees a
  // fresh reference and downstream `Object.is` checks fire correctly.
  const refreshSnapshot = useCallback(() => {
    snapshotRef.current = new Map(triggersRef.current);
  }, []);

  const register = useCallback<TriggerPopoverRootContextValue["register"]>(
    (id, trigger) => {
      triggersRef.current.set(id, { id, ...trigger });
      refreshSnapshot();
      notify();
      return () => {
        triggersRef.current.delete(id);
        refreshSnapshot();
        notify();
      };
    },
    [notify, refreshSnapshot],
  );

  const getTriggers = useCallback<
    TriggerPopoverRootContextValue["getTriggers"]
  >(() => snapshotRef.current, []);

  const subscribe = useCallback<TriggerPopoverRootContextValue["subscribe"]>(
    (listener) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    [],
  );

  const value = useMemo<TriggerPopoverRootContextValue>(
    () => ({ register, getTriggers, subscribe }),
    [register, getTriggers, subscribe],
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
