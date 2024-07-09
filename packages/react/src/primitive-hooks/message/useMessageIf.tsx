"use client";
import { useMessageContext } from "../../context/react/MessageContext";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

type MessageIfFilters = {
  user: boolean | undefined;
  assistant: boolean | undefined;
  system: boolean | undefined;
  hasBranches: boolean | undefined;
  copied: boolean | undefined;
  lastOrHover: boolean | undefined;
};
export type UseMessageIfProps = RequireAtLeastOne<MessageIfFilters>;

export const useMessageIf = (props: UseMessageIfProps) => {
  const { useMessage, useMessageUtils } = useMessageContext();

  return useCombinedStore(
    [useMessage, useMessageUtils],
    ({ message, branches, isLast }, { isCopied, isHovering }) => {
      if (props.hasBranches === true && branches.length < 2) return false;

      if (props.user && message.role !== "user") return false;
      if (props.assistant && message.role !== "assistant") return false;
      if (props.system && message.role !== "system") return false;

      if (props.lastOrHover === true && !isHovering && !isLast) return false;

      if (props.copied === true && !isCopied) return false;
      if (props.copied === false && isCopied) return false;

      return true;
    },
  );
};
