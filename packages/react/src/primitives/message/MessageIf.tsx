"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseMessageIfProps,
  useMessageIf,
} from "../../primitive-hooks/message/useMessageIf";

export type MessagePrimitiveIfProps = PropsWithChildren<UseMessageIfProps>;

export const MessagePrimitiveIf: FC<MessagePrimitiveIfProps> = ({
  children,
  ...query
}) => {
  const result = useMessageIf(query);
  return result ? children : null;
};

MessagePrimitiveIf.displayName = "MessagePrimitive.If";
