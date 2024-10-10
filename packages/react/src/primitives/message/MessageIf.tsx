"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseMessageIfProps,
  useMessageIf,
} from "../../primitive-hooks/message/useMessageIf";

/**
 * @deprecated Use `MessagePrimitive.If.Props` instead. This will be removed in 0.6.
 */
export type MessagePrimitiveIfProps = MessagePrimitiveIf.Props;

export namespace MessagePrimitiveIf {
  export type Props = PropsWithChildren<UseMessageIfProps>;
}

export const MessagePrimitiveIf: FC<MessagePrimitiveIf.Props> = ({
  children,
  ...query
}) => {
  const result = useMessageIf(query);
  return result ? children : null;
};

MessagePrimitiveIf.displayName = "MessagePrimitive.If";
