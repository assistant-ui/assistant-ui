"use client";

import type {
  Unstable_DirectiveFormatter,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import { useEffect, useRef, type FC } from "react";
import { useTriggerBehaviorRegistration } from "./TriggerPopover";
import type { TriggerBehavior } from "./triggerSelectionResource";

export namespace ComposerPrimitiveTriggerPopoverDirective {
  export type Props = {
    /** Defaults to `unstable_defaultDirectiveFormatter`. */
    readonly formatter?: Unstable_DirectiveFormatter | undefined;
    /** Fires after an item has been inserted into the composer. */
    readonly onInserted?: ((item: Unstable_TriggerItem) => void) | undefined;
  };
}

/**
 * Configures a `<TriggerPopover>` to insert a directive chip when an item is
 * selected. Render exactly one behavior sub-primitive per `<TriggerPopover>`.
 *
 * Exposed as `ComposerPrimitive.Unstable_TriggerPopover.Directive`.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Unstable_TriggerPopover char="@" adapter={mentionAdapter}>
 *   <ComposerPrimitive.Unstable_TriggerPopover.Directive
 *     formatter={unstable_defaultDirectiveFormatter}
 *     onInserted={(item) => track("mention", item.id)}
 *   />
 * </ComposerPrimitive.Unstable_TriggerPopover>
 * ```
 */
export const ComposerPrimitiveTriggerPopoverDirective: FC<
  ComposerPrimitiveTriggerPopoverDirective.Props
> = ({ formatter, onInserted }) => {
  const { register } = useTriggerBehaviorRegistration();
  const onInsertedRef = useRef(onInserted);
  onInsertedRef.current = onInserted;

  useEffect(() => {
    const behavior: TriggerBehavior = {
      kind: "directive",
      formatter: formatter ?? unstable_defaultDirectiveFormatter,
      onInserted: (item) => onInsertedRef.current?.(item),
    };
    return register(behavior);
  }, [register, formatter]);

  return null;
};

ComposerPrimitiveTriggerPopoverDirective.displayName =
  "ComposerPrimitive.TriggerPopoverDirective";
