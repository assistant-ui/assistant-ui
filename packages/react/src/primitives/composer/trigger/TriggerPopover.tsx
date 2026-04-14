"use client";

import { useAui, useAuiState } from "@assistant-ui/store";
import { useResource } from "@assistant-ui/tap/react";
import type {
  Unstable_TriggerAdapter,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";
import { Primitive } from "../../../utils/Primitive";
import { useComposerInputPluginRegistryOptional } from "../ComposerInputPluginContext";
import {
  TriggerPopoverResource,
  type OnSelectBehavior,
  type TriggerPopoverResourceOutput,
} from "./TriggerPopoverResource";
import { useTriggerPopoverRootContext } from "./TriggerPopoverRootContext";

// Scope Context — the active TriggerPopover's state. Read by sub-primitives
// (Categories, Items, Back) via nearest-ancestor lookup.

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

export namespace ComposerPrimitiveTriggerPopover {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.div>,
    "onSelect"
  > & {
    /** Unique identifier for this trigger within the root. */
    readonly triggerId: string;
    /** The character(s) that activate this trigger (e.g. `"@"`, `"/"`). */
    readonly char: string;
    /** Adapter providing categories and items. */
    readonly adapter?: Unstable_TriggerAdapter | undefined;
    /** What happens when an item is selected. */
    readonly onSelect: OnSelectBehavior;
  };
}

/**
 * Declares a trigger and renders its popover container. The popover only
 * renders its DOM (and children) when the trigger character is active in the
 * composer input.
 *
 * Must be placed inside `ComposerPrimitive.Unstable_TriggerPopoverRoot`.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Unstable_TriggerPopover
 *   triggerId="mention"
 *   char="@"
 *   adapter={mentionAdapter}
 *   onSelect={{ type: "insertDirective", formatter }}
 * >
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
    {
      triggerId,
      char,
      adapter,
      onSelect,
      "aria-label": ariaLabel,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const aui = useAui();
    const text = useAuiState((s) => s.composer.text);
    const popoverId = useId();

    // Stabilize `onSelect` so it doesn't re-register on every render. The
    // wrapper identity changes only when the behavior `type` changes; inner
    // callbacks always read the latest caller-supplied functions via a ref.
    // The memo dep `[onSelect.type]` is the invariant that lets us skip the
    // narrowing guard inside each callback — if type changes, the whole
    // wrapper is rebuilt, so `onSelectRef.current.type` always matches.
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;
    const stableOnSelect = useMemo<OnSelectBehavior>(() => {
      if (onSelect.type === "insertDirective") {
        const getFormatter = () =>
          (
            onSelectRef.current as OnSelectBehavior & {
              type: "insertDirective";
            }
          ).formatter;
        return {
          type: "insertDirective",
          formatter: {
            serialize: (item: Unstable_TriggerItem) =>
              getFormatter().serialize(item),
            parse: (input: string) => getFormatter().parse(input),
          },
        };
      }
      return {
        type: "action",
        handler: (item: Unstable_TriggerItem) =>
          (
            onSelectRef.current as OnSelectBehavior & { type: "action" }
          ).handler(item),
      };
    }, [onSelect.type]);

    const resource = useResource(
      TriggerPopoverResource({
        adapter,
        text,
        triggerChar: char,
        onSelect: stableOnSelect,
        aui,
        popoverId,
      }),
    );

    // Register with the root so MentionPlugin and other consumers can iterate
    // all triggers.
    const root = useTriggerPopoverRootContext();
    useEffect(() => {
      return root.register(triggerId, {
        char,
        onSelect: stableOnSelect,
        resource,
      });
    }, [root, triggerId, char, stableOnSelect, resource]);

    // Register as a ComposerInput plugin — receives cursor + keyDown events.
    const pluginRegistry = useComposerInputPluginRegistryOptional();
    useEffect(() => {
      if (!pluginRegistry) return undefined;
      return pluginRegistry.register(resource);
    }, [pluginRegistry, resource]);

    if (!resource.open) return null;

    return (
      <TriggerPopoverScopeContext.Provider value={resource}>
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
      </TriggerPopoverScopeContext.Provider>
    );
  },
);

ComposerPrimitiveTriggerPopover.displayName =
  "ComposerPrimitive.TriggerPopover";
