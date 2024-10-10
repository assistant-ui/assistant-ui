"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { ComponentPropsWithoutRef, FC } from "react";

type PrimitiveSpanProps = ComponentPropsWithoutRef<typeof Primitive.span>;

/**
 * @deprecated Define a custom Text renderer via ContentPartPrimitiveInProgress instead. This will be removed in 0.6.
 */
export type MessagePrimitiveInProgressProps = PrimitiveSpanProps;

/**
 * @deprecated Define a custom Text renderer via ContentPartPrimitiveInProgress instead. This will be removed in 0.6.
 */
export const MessagePrimitiveInProgress: FC<
  MessagePrimitiveInProgressProps
> = () => {
  return null;
};

MessagePrimitiveInProgress.displayName = "MessagePrimitive.InProgress";
