"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace ChainOfThoughtPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps;
}

/**
 * The root container for chain of thought components.
 *
 * This component provides a wrapper for chain of thought content,
 * including reasoning and tool-call parts that can be collapsed in an accordion.
 *
 * @example
 * ```tsx
 * <ChainOfThoughtPrimitive.Root>
 *   <ChainOfThoughtPrimitive.AccordionTrigger>
 *     Toggle reasoning
 *   </ChainOfThoughtPrimitive.AccordionTrigger>
 *   <ChainOfThoughtPrimitive.Parts />
 * </ChainOfThoughtPrimitive.Root>
 * ```
 */
export const ChainOfThoughtPrimitiveRoot = forwardRef<
  ChainOfThoughtPrimitiveRoot.Element,
  ChainOfThoughtPrimitiveRoot.Props
>((props, ref) => {
  return <Primitive.div {...props} ref={ref} />;
});

ChainOfThoughtPrimitiveRoot.displayName = "ChainOfThoughtPrimitive.Root";
