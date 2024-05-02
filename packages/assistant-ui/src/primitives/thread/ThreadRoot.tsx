"use client";

import { forwardRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";

type ThreadRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ThreadRootProps = PrimitiveDivProps;

export const ThreadRoot = forwardRef<ThreadRootElement, ThreadRootProps>(
  (props, ref) => {
    return <Primitive.div {...props} ref={ref} />;
  },
);
