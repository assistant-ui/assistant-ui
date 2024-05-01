"use client";

import { forwardRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";

type ThreadViewportElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ThreadViewportProps = PrimitiveDivProps;

export const ThreadViewport = forwardRef<
  ThreadViewportElement,
  ThreadViewportProps
>(({ ...rest }, ref) => {
  return <Primitive.div {...rest} ref={ref} />;
});
