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

type ContentPartPrimitiveTextElement = ElementRef<typeof Primitive.span>;
type PrimitiveSpanProps = ComponentPropsWithoutRef<typeof Primitive.span>;

export type ContentPartPrimitiveTextProps = Omit<
  PrimitiveSpanProps,
  "children" | "asChild"
> & {
  smooth?: boolean;
  component?: ElementType;
};

export const ContentPartPrimitiveText = forwardRef<
  ContentPartPrimitiveTextElement,
  ContentPartPrimitiveTextProps
>(({ smooth = true, component: Component = "span", ...rest }, forwardedRef) => {
  const { text, status } = useSmooth(useContentPartText(), smooth);

  return (
    <Component data-status={status.type} {...rest} ref={forwardedRef}>
      {text}
    </Component>
  );
});

ContentPartPrimitiveText.displayName = "ContentPartPrimitive.Text";
