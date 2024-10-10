"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ElementRef,
  forwardRef,
  ComponentPropsWithoutRef,
  ElementType,
} from "react";
import { useContentPartText } from "../../primitive-hooks/contentPart/useContentPartText";
import { useSmooth } from "../../utils/smooth/useSmooth";

/**
 * @deprecated Use `ContentPartPrimitive.Text.Props` instead. This will be removed in 0.6.
 */
export type ContentPartPrimitiveTextProps = ContentPartPrimitiveText.Props;

export namespace ContentPartPrimitiveText {
  export type Element = ElementRef<typeof Primitive.span>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.span>,
    "children" | "asChild"
  > & {
    smooth?: boolean;
    component?: ElementType;
  };
}

export const ContentPartPrimitiveText = forwardRef<
  ContentPartPrimitiveText.Element,
  ContentPartPrimitiveText.Props
>(({ smooth = true, component: Component = "span", ...rest }, forwardedRef) => {
  const { text, status } = useSmooth(useContentPartText(), smooth);

  return (
    <Component data-status={status.type} {...rest} ref={forwardedRef}>
      {text}
    </Component>
  );
});

ContentPartPrimitiveText.displayName = "ContentPartPrimitive.Text";
