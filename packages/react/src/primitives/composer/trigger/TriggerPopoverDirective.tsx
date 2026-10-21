"use client";

import type { DirectiveFormatter, TriggerItem } from "@assistant-ui/core";
import { defaultDirectiveFormatter } from "@assistant-ui/core";
import { useEffect, useInsertionEffect, useRef, type FC } from "react";
import { useTriggerBehaviorRegistration } from "./TriggerPopover";
import type { TriggerBehavior } from "./triggerSelectionResource";

export namespace ComposerPrimitiveTriggerPopoverDirective {
  export type Props = {
    /** Defaults to `defaultDirectiveFormatter`. */
    readonly formatter?: DirectiveFormatter | undefined;
    /** Fires after an item has been inserted into the composer. */
    readonly onInserted?: ((item: TriggerItem) => void) | undefined;
  };
}

/**
 * Configures a `<TriggerPopover>` to insert a directive chip when an item is
 * selected. Render exactly one behavior sub-primitive per `<TriggerPopover>`.
 *
 * Exposed as `ComposerPrimitive.TriggerPopover.Directive`.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.TriggerPopover char="@" adapter={mentionAdapter}>
 *   <ComposerPrimitive.TriggerPopover.Directive
 *     formatter={defaultDirectiveFormatter}
 *     onInserted={(item) => track("mention", item.id)}
 *   />
 * </ComposerPrimitive.TriggerPopover>
 * ```
 */
export const ComposerPrimitiveTriggerPopoverDirective: FC<
  ComposerPrimitiveTriggerPopoverDirective.Props
> = ({ formatter, onInserted }) => {
  const { register } = useTriggerBehaviorRegistration();
  const onInsertedRef = useRef(onInserted);
  useInsertionEffect(() => {
    onInsertedRef.current = onInserted;
  }, [onInserted]);

  useEffect(() => {
    const behavior: TriggerBehavior = {
      kind: "directive",
      formatter: formatter ?? defaultDirectiveFormatter,
      onInserted: (item) => onInsertedRef.current?.(item),
    };
    return register(behavior);
  }, [register, formatter]);

  return null;
};

ComposerPrimitiveTriggerPopoverDirective.displayName =
  "ComposerPrimitive.TriggerPopoverDirective";
