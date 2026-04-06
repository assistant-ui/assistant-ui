"use client";

import { type ReactNode, type FC, useCallback, useMemo } from "react";
import type {
  Unstable_SlashCommandAdapter,
  Unstable_SlashCommandItem,
} from "@assistant-ui/core";
import { ComposerPrimitiveTriggerPopoverRoot } from "../trigger/TriggerPopoverContext";
import type { OnSelectBehavior } from "../trigger/TriggerPopoverResource";

// =============================================================================
// SlashCommandRoot — convenience wrapper around TriggerPopoverRoot
// =============================================================================

export namespace ComposerPrimitiveSlashCommandRoot {
  export type Props = {
    children: ReactNode;
    /** The adapter providing slash command categories and items. */
    adapter: Unstable_SlashCommandAdapter;
    /** Character(s) that trigger the popover. @default "/" */
    trigger?: string | undefined;
    /** Callback when a slash command is selected. */
    onSelect?: ((item: Unstable_SlashCommandItem) => void) | undefined;
  };
}

/**
 * Convenience wrapper around `TriggerPopoverRoot` pre-configured for `/` slash commands.
 * When a user selects a command, the `/command` text is removed from the composer
 * and the item's `execute` callback (if any) and `onSelect` prop are called.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Unstable_SlashCommandRoot adapter={slashAdapter}>
 *   <ComposerPrimitive.Input />
 *   <ComposerPrimitive.Unstable_TriggerPopoverPopover>
 *     <ComposerPrimitive.Unstable_TriggerPopoverItems>
 *       {(items) => items.map(item => (
 *         <ComposerPrimitive.Unstable_TriggerPopoverItem key={item.id} item={item}>
 *           {item.label}
 *         </ComposerPrimitive.Unstable_TriggerPopoverItem>
 *       ))}
 *     </ComposerPrimitive.Unstable_TriggerPopoverItems>
 *   </ComposerPrimitive.Unstable_TriggerPopoverPopover>
 * </ComposerPrimitive.Unstable_SlashCommandRoot>
 * ```
 */
export const ComposerPrimitiveSlashCommandRoot: FC<
  ComposerPrimitiveSlashCommandRoot.Props
> = ({ children, adapter, trigger = "/", onSelect: onSelectProp }) => {
  const handler = useCallback(
    (item: Unstable_SlashCommandItem) => {
      item.execute?.();
      onSelectProp?.(item);
    },
    [onSelectProp],
  );

  const onSelect = useMemo<OnSelectBehavior>(
    () => ({ type: "action", handler }),
    [handler],
  );

  return (
    <ComposerPrimitiveTriggerPopoverRoot
      adapter={adapter}
      trigger={trigger}
      onSelect={onSelect}
    >
      {children}
    </ComposerPrimitiveTriggerPopoverRoot>
  );
};

ComposerPrimitiveSlashCommandRoot.displayName =
  "ComposerPrimitive.SlashCommandRoot";
