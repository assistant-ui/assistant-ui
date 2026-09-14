"use client";

import { Primitive, renderSlot } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  isValidElement,
} from "react";
import { useMessagePartText } from "./useMessagePartText";
import { useSmooth, type SmoothOptions } from "../../utils/smooth/useSmooth";

export namespace MessagePartPrimitiveText {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.span>,
    "children" | "asChild"
  > & {
    /**
     * Whether to enable smooth text streaming animation.
     * When enabled, text appears with a typing effect as it streams in.
     * Pass a `SmoothOptions` object to tune the reveal rate.
     * Auto-disables under `prefers-reduced-motion: reduce`.
     * @default true
     */
    smooth?: boolean | SmoothOptions;
    /**
     * The HTML element or React component to render as.
     * Ignored when a valid `render` element is supplied.
     * @default "span"
     */
    component?: ElementType;
  };
}

/**
 * Renders the text content of a message part with optional smooth streaming.
 *
 * This component displays text content from the current message part context,
 * with support for smooth streaming animation that shows text appearing
 * character by character as it's generated.
 *
 * @example
 * ```tsx
 * <MessagePartPrimitive.Text
 *   smooth={true}
 *   component="p"
 *   className="message-text"
 * />
 * ```
 */
export const MessagePartPrimitiveText = forwardRef<
  MessagePartPrimitiveText.Element,
  MessagePartPrimitiveText.Props
>(
  (
    { smooth = true, component: Component = Primitive.span, render, ...rest },
    forwardedRef,
  ) => {
    const { text, status } = useSmooth(useMessagePartText(), smooth);

    const mergedProps = {
      "data-status": status.type,
      ...rest,
      ref: forwardedRef,
    };

    if (render && isValidElement(render)) {
      return renderSlot(render, text, mergedProps);
    }

    return <Component {...mergedProps}>{text}</Component>;
  },
);

MessagePartPrimitiveText.displayName = "MessagePartPrimitive.Text";
