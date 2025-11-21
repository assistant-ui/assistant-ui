"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef, FC } from "react";

const FOOTER_ATTR = "data-aui-thread-footer";

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

  return <Comp {...rest} {...{ [FOOTER_ATTR]: "" }} />;
};

ThreadPrimitiveFooter.displayName = "ThreadPrimitive.Footer";
