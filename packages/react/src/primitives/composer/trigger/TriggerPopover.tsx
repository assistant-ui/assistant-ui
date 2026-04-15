"use client";

import { useAui, useAuiState } from "@assistant-ui/store";
import { useResource } from "@assistant-ui/tap/react";
import type { Unstable_TriggerAdapter } from "@assistant-ui/core";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";
import { Primitive } from "../../../utils/Primitive";
import { useComposerInputPluginRegistryOptional } from "../ComposerInputPluginContext";
import {
  TriggerPopoverResource,
  type TriggerPopoverResourceOutput,
} from "./TriggerPopoverResource";
import type { TriggerBehavior } from "./triggerSelectionResource";
import { useTriggerPopoverRootContext } from "./TriggerPopoverRootContext";

const TriggerPopoverScopeContext =
  createContext<TriggerPopoverResourceOutput | null>(null);

export const useTriggerPopoverScopeContext = () => {
  const ctx = useContext(TriggerPopoverScopeContext);
  if (!ctx)
    throw new Error(
      "useTriggerPopoverScopeContext must be used within ComposerPrimitive.TriggerPopover",
    );
  return ctx;
};

export const useTriggerPopoverScopeContextOptional = () =>
  useContext(TriggerPopoverScopeContext);

/** Registration API exposed to behavior sub-primitives. */
export type TriggerBehaviorRegistration = {
  register(behavior: TriggerBehavior): () => void;
};

const TriggerBehaviorRegistrationContext =
  createContext<TriggerBehaviorRegistration | null>(null);

/** Obtain the registration handle from the parent `<TriggerPopover>`. */
export const useTriggerBehaviorRegistration = () => {
  const ctx = useContext(TriggerBehaviorRegistrationContext);
  if (!ctx)
    throw new Error(
      "TriggerPopover.Directive / TriggerPopover.Action must be rendered inside ComposerPrimitive.TriggerPopover",
    );
  return ctx;
};

export namespace ComposerPrimitiveTriggerPopover {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.div>,
    "onSelect"
  > & {
    /** The character(s) that activate this trigger (e.g. `"@"`, `"/"`). Also serves as the trigger identity within the root. */
    readonly char: string;
    /** Adapter providing categories and items. */
    readonly adapter?: Unstable_TriggerAdapter | undefined;
  };
}

/**
 * Declares a trigger and renders its popover container. The popover only
 * renders its DOM (and children) when the trigger character is active in the
 * composer input and a behavior sub-primitive has been registered.
 *
 * A behavior is contributed by rendering exactly one of
 * `<TriggerPopover.Directive>` or `<TriggerPopover.Action>` as a child. Without
 * a behavior the trigger stays closed.
 *
 * Must be placed inside `ComposerPrimitive.Unstable_TriggerPopoverRoot`.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Unstable_TriggerPopover
 *   char="@"
 *   adapter={mentionAdapter}
 * >
 *   <ComposerPrimitive.Unstable_TriggerPopover.Directive formatter={formatter} />
 *   <ComposerPrimitive.Unstable_TriggerPopoverCategories>
 *     {(cats) => cats.map(...)}
 *   </ComposerPrimitive.Unstable_TriggerPopoverCategories>
 *   <ComposerPrimitive.Unstable_TriggerPopoverItems>
 *     {(items) => items.map(...)}
 *   </ComposerPrimitive.Unstable_TriggerPopoverItems>
 * </ComposerPrimitive.Unstable_TriggerPopover>
 * ```
 */
export const ComposerPrimitiveTriggerPopover = forwardRef<
  ComposerPrimitiveTriggerPopover.Element,
  ComposerPrimitiveTriggerPopover.Props
>(
  (
    { char, adapter, "aria-label": ariaLabel, children, ...props },
    forwardedRef,
  ) => {
    const aui = useAui();
    const text = useAuiState((s) => s.composer.text);
    const popoverId = useId();

    // Track in state (for resource reactivity) + ref (dev warning on duplicate registrations).
    const behaviorRef = useRef<TriggerBehavior | null>(null);
    const [behavior, setBehavior] = useState<TriggerBehavior | null>(null);
    const registrationCountRef = useRef(0);

    const register = useCallback<TriggerBehaviorRegistration["register"]>(
      (next) => {
        registrationCountRef.current += 1;
        if (
          process.env.NODE_ENV !== "production" &&
          registrationCountRef.current > 1
        ) {
          console.warn(
            `[assistant-ui] TriggerPopover "${char}" received more than one behavior child. Exactly one <TriggerPopover.Directive> or <TriggerPopover.Action> is allowed per TriggerPopover; the last registration wins.`,
          );
        }
        behaviorRef.current = next;
        setBehavior(next);
        return () => {
          registrationCountRef.current = Math.max(
            0,
            registrationCountRef.current - 1,
          );
          if (behaviorRef.current === next) {
            behaviorRef.current = null;
            setBehavior(null);
          }
        };
      },
      [char],
    );

    const registration = useMemo<TriggerBehaviorRegistration>(
      () => ({ register }),
      [register],
    );

    const resource = useResource(
      TriggerPopoverResource({
        adapter,
        text,
        triggerChar: char,
        behavior: behavior ?? undefined,
        aui,
        popoverId,
      }),
    );

    // Wrapper changes per render, but tap-stable methods inside don't.
    const resourceRef = useRef(resource);
    resourceRef.current = resource;

    const root = useTriggerPopoverRootContext();
    useEffect(() => {
      return root.register({
        char,
        ...(behavior ? { behavior } : {}),
        resource: resourceRef.current,
      });
    }, [root, char, behavior]);

    const pluginRegistry = useComposerInputPluginRegistryOptional();
    useEffect(() => {
      if (!pluginRegistry) return undefined;
      return pluginRegistry.register(resourceRef.current);
    }, [pluginRegistry]);

    const open = behavior !== null && resource.open;

    return (
      <TriggerBehaviorRegistrationContext.Provider value={registration}>
        <TriggerPopoverScopeContext.Provider value={resource}>
          {open ? (
            <Primitive.div
              role="listbox"
              id={popoverId}
              aria-label={ariaLabel ?? "Suggestions"}
              aria-activedescendant={resource.highlightedItemId}
              data-state="open"
              {...props}
              ref={forwardedRef}
            >
              {children}
            </Primitive.div>
          ) : (
            children
          )}
        </TriggerPopoverScopeContext.Provider>
      </TriggerBehaviorRegistrationContext.Provider>
    );
  },
);

ComposerPrimitiveTriggerPopover.displayName =
  "ComposerPrimitive.TriggerPopover";
