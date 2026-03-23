"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  type ComponentPropsWithoutRef,
  forwardRef,
} from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace QueueItemPrimitiveText {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

/**
 * Renders the prompt text of a queue item.
 *
 * @example
 * ```tsx
 * <QueueItemPrimitive.Text />
 * ```
 */
export const QueueItemPrimitiveText = forwardRef<
  QueueItemPrimitiveText.Element,
  QueueItemPrimitiveText.Props
>((props, ref) => {
  const prompt = useAuiState((s) => s.queueItem.prompt);

  return (
    <Primitive.span {...props} ref={ref}>
      {props.children ?? prompt}
    </Primitive.span>
  );
});

QueueItemPrimitiveText.displayName = "QueueItemPrimitive.Text";
