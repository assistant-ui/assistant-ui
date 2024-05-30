"use client";

import type { FC } from "react";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";
import { useMessageContext } from "../../utils/context/useMessageContext";

type MessageIfFilters = {
  user: boolean | undefined;
  assistant: boolean | undefined;
  hasBranches: boolean | undefined;
  copied: boolean | undefined;
  lastOrHover: boolean | undefined;
};

type MessageIfProps = RequireAtLeastOne<MessageIfFilters> & {
  children: React.ReactNode;
};

export const useMessageIf = (props: RequireAtLeastOne<MessageIfFilters>) => {
  const { useMessage } = useMessageContext();

  return useMessage(({ message, isLast, isCopied, isHovering }) => {
    if (props.hasBranches === true && message.branches.length < 2) return false;

    if (props.user && message.role !== "user") return false;
    if (props.assistant && message.role !== "assistant") return false;

    if (props.lastOrHover === true && !isHovering && !isLast) return false;

    if (props.copied === true && !isCopied) return false;
    if (props.copied === false && isCopied) return false;

    return true;
  });
};

export const MessageIf: FC<MessageIfProps> = ({ children, ...query }) => {
  const result = useMessageIf(query);
  return result ? children : null;
};
