"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  type ReactNode,
  type FC,
} from "react";
import { useResource } from "@assistant-ui/tap/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { Unstable_TriggerAdapter } from "@assistant-ui/core";
import {
  TriggerPopoverResource,
  type TriggerPopoverResourceOutput,
  type OnSelectBehavior,
} from "./TriggerPopoverResource";
import {
  useComposerInputPluginRegistryOptional,
  ComposerInputPluginProvider,
} from "../ComposerInputPluginContext";

// =============================================================================
// Context
// =============================================================================

const TriggerPopoverContext =
  createContext<TriggerPopoverResourceOutput | null>(null);

export const useTriggerPopoverContext = () => {
  const ctx = useContext(TriggerPopoverContext);
  if (!ctx)
    throw new Error(
      "useTriggerPopoverContext must be used within ComposerPrimitive.TriggerPopoverRoot",
    );
  return ctx;
};

export const useTriggerPopoverContextOptional = () => {
  return useContext(TriggerPopoverContext);
};

// =============================================================================
// Root Component
// =============================================================================

export namespace ComposerPrimitiveTriggerPopoverRoot {
  export type Props = {
    children: ReactNode;
    /** The adapter providing categories and items. */
    adapter: Unstable_TriggerAdapter;
    /** Character(s) that trigger the popover. @default "@" */
    trigger?: string | undefined;
    /** What happens when an item is selected. */
    onSelect: OnSelectBehavior;
  };
}

const TriggerPopoverRootInner: FC<
  ComposerPrimitiveTriggerPopoverRoot.Props
> = ({ children, adapter, trigger: triggerChar = "@", onSelect }) => {
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);
  const popoverId = useId();

  const triggerPopover = useResource(
    TriggerPopoverResource({
      adapter,
      text,
      triggerChar,
      onSelect,
      aui,
      popoverId,
    }),
  );

  // Register as ComposerInput plugin
  const pluginRegistry = useComposerInputPluginRegistryOptional();

  useEffect(() => {
    if (!pluginRegistry) return undefined;
    return pluginRegistry.register(triggerPopover);
  }, [pluginRegistry, triggerPopover]);

  return (
    <TriggerPopoverContext.Provider value={triggerPopover}>
      {children}
    </TriggerPopoverContext.Provider>
  );
};

/**
 * Provider that wraps the composer with trigger detection, keyboard navigation,
 * and popover state. Supports any trigger character (`@`, `/`, `:`, etc.).
 * Multiple trigger roots can coexist around the same input.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Unstable_TriggerPopoverRoot
 *   trigger="/"
 *   adapter={slashAdapter}
 *   onSelect={{ type: "action", handler: (item) => console.log(item) }}
 * >
 *   <ComposerPrimitive.Input />
 *   <ComposerPrimitive.Unstable_TriggerPopoverPopover>
 *     ...
 *   </ComposerPrimitive.Unstable_TriggerPopoverPopover>
 * </ComposerPrimitive.Unstable_TriggerPopoverRoot>
 * ```
 */
export const ComposerPrimitiveTriggerPopoverRoot: FC<
  ComposerPrimitiveTriggerPopoverRoot.Props
> = (props) => {
  const existingRegistry = useComposerInputPluginRegistryOptional();

  if (existingRegistry) {
    return <TriggerPopoverRootInner {...props} />;
  }

  return (
    <ComposerInputPluginProvider>
      <TriggerPopoverRootInner {...props} />
    </ComposerInputPluginProvider>
  );
};

ComposerPrimitiveTriggerPopoverRoot.displayName =
  "ComposerPrimitive.TriggerPopoverRoot";
