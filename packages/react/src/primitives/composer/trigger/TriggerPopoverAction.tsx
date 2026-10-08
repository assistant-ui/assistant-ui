"use client";

import type { DirectiveFormatter, TriggerItem } from "@assistant-ui/core";
import { defaultDirectiveFormatter } from "@assistant-ui/core";
import { useEffect, useInsertionEffect, useRef, type FC } from "react";
import { useTriggerBehaviorRegistration } from "./TriggerPopover";
import type { TriggerBehavior } from "./triggerSelectionResource";

export namespace ComposerPrimitiveTriggerPopoverAction {
  export type Props = {
    /** Defaults to `defaultDirectiveFormatter`. */
    readonly formatter?: DirectiveFormatter | undefined;
    /** Fires the moment an item is selected; runs regardless of `removeOnExecute`. */
    readonly onExecute: (item: TriggerItem) => void;
    /** When true, strips the trigger text after executing. Defaults to `false` (keeps audit-trail chip). */
    readonly removeOnExecute?: boolean | undefined;
  };
}

/**
 * Configures a `<TriggerPopover>` to fire a handler when an item is selected,
 * optionally leaving a directive chip behind as an audit trail. Render exactly
 * one behavior sub-primitive per `<TriggerPopover>`.
 *
 * Exposed as `ComposerPrimitive.TriggerPopover.Action`.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.TriggerPopover char="/" adapter={slashAdapter}>
 *   <ComposerPrimitive.TriggerPopover.Action
 *     onExecute={(item) => commandHandlers[item.id]?.()}
 *     removeOnExecute={false}
 *   />
 * </ComposerPrimitive.TriggerPopover>
 * ```
 */
export const ComposerPrimitiveTriggerPopoverAction: FC<
  ComposerPrimitiveTriggerPopoverAction.Props
> = ({ formatter, onExecute, removeOnExecute }) => {
  const { register } = useTriggerBehaviorRegistration();
  const onExecuteRef = useRef(onExecute);
  useInsertionEffect(() => {
    onExecuteRef.current = onExecute;
  }, [onExecute]);

  useEffect(() => {
    const behavior: TriggerBehavior = {
      kind: "action",
      formatter: formatter ?? defaultDirectiveFormatter,
      onExecute: (item) => onExecuteRef.current(item),
      ...(removeOnExecute !== undefined ? { removeOnExecute } : {}),
    };
    return register(behavior);
  }, [register, formatter, removeOnExecute]);

  return null;
};

ComposerPrimitiveTriggerPopoverAction.displayName =
  "ComposerPrimitive.TriggerPopoverAction";
