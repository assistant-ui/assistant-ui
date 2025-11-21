"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef, FC } from "react";
import { useThreadViewportSpacerElement } from "./ThreadViewportSpacerContext";
import { THREAD_SPACER_ATTR } from "./threadDataAttributes";
const DEFAULT_SPACER_CLASS = "min-h-8 grow";

export namespace ThreadPrimitiveSpacer {
  export type Props = ComponentPropsWithoutRef<typeof Slot> & {
    asChild?: boolean | undefined;
  };
}

export const ThreadPrimitiveSpacer: FC<ThreadPrimitiveSpacer.Props> = ({
  asChild,
  className,
  ...rest
}) => {
  const Comp = asChild ? Slot : "div";
  const registerSpacerElement = useThreadViewportSpacerElement();
  const mergedClassName =
    className != null && className !== ""
      ? `${DEFAULT_SPACER_CLASS} ${className}`
      : DEFAULT_SPACER_CLASS;

  return (
    <Comp
      {...rest}
      ref={registerSpacerElement}
      className={mergedClassName}
      {...{ [THREAD_SPACER_ATTR]: "" }}
    />
  );
};

ThreadPrimitiveSpacer.displayName = "ThreadPrimitive.Spacer";
