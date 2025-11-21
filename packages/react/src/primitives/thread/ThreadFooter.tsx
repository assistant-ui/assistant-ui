"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef, FC } from "react";
import { THREAD_FOOTER_ATTR } from "./threadDataAttributes";

export namespace ThreadPrimitiveFooter {
  export type Props = ComponentPropsWithoutRef<typeof Slot> & {
    asChild?: boolean | undefined;
  };
}

export const ThreadPrimitiveFooter: FC<ThreadPrimitiveFooter.Props> = ({
  asChild,
  ...rest
}) => {
  const Comp = asChild ? Slot : "div";

  return <Comp {...rest} {...{ [THREAD_FOOTER_ATTR]: "" }} />;
};

ThreadPrimitiveFooter.displayName = "ThreadPrimitive.Footer";
