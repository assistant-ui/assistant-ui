"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  ElementType,
} from "react";
import { useContentPartReasoning } from "./useContentPartReasoning";
import { useSmooth } from "../../utils/smooth/useSmooth";

export namespace ContentPartPrimitiveReasoning {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.span>,
    "children" | "asChild"
  > & {
    smooth?: boolean;
    component?: ElementType;
  };
}

export const ContentPartPrimitiveReasoning = forwardRef<
  ContentPartPrimitiveReasoning.Element,
  ContentPartPrimitiveReasoning.Props
>(({ smooth = true, component: Component = "span", ...rest }, forwardedRef) => {
  const { text, status } = useSmooth(useContentPartReasoning(), smooth);

  return (
    <Component data-status={status.type} {...rest} ref={forwardedRef}>
      {text}
    </Component>
  );
});

ContentPartPrimitiveReasoning.displayName = "ContentPartPrimitive.Reasoning";
