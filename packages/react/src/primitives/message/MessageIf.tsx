"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseMessageIfProps,
  useMessageIf,
} from "../../primitive-hooks/message/useMessageIf";

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
