"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
} from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace ErrorPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * The container of a message's error. It carries `data-run-state` (`stale` or
 * `in_progress`) when the error stands for a run another tab or session
 * drove, and announces an in-progress run as a status instead of an alert.
 */
export const ErrorPrimitiveRoot = forwardRef<
  ErrorPrimitiveRoot.Element,
  ErrorPrimitiveRoot.Props
>((props, forwardRef) => {
  const runState = useAuiState((s) => s.optional.message?.runState);
  return (
    <Primitive.div
      role={runState === "in_progress" ? "status" : "alert"}
      {...(runState ? { "data-run-state": runState } : undefined)}
      {...props}
      ref={forwardRef}
    />
  );
});

ErrorPrimitiveRoot.displayName = "ErrorPrimitive.Root";
