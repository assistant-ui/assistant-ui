"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";

type ThreadRootElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ThreadRootProps = PrimitiveDivProps;

export const ThreadRoot = forwardRef<ThreadRootElement, ThreadRootProps>(
  (props, ref) => {
    return <Primitive.div {...props} ref={ref} />;
  },
);

ThreadRoot.displayName = "ThreadRoot";
