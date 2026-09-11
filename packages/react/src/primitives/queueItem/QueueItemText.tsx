"use client";

import { Primitive } from "../../utils/Primitive";
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
  const text = useAuiState((s) =>
    // hosts on the pre-parts adapter shape may omit the field at runtime
    (s.queueItem.parts ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n"),
  );

  return (
    <Primitive.span {...props} ref={ref}>
      {props.children ?? text}
    </Primitive.span>
  );
});

QueueItemPrimitiveText.displayName = "QueueItemPrimitive.Text";
