"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseMessageIfProps,
  useMessageIf,
} from "../../primitive-hooks/message/useMessageIf";

type MessageIfProps = PropsWithChildren<UseMessageIfProps>;

export const MessageIf: FC<MessageIfProps> = ({ children, ...query }) => {
  const result = useMessageIf(query);
  return result ? children : null;
};
