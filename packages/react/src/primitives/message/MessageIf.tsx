"use client";

import type { FC, PropsWithChildren } from "react";
import { useAssistantState } from "../../context";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type MessageIfFilters = {
  user: boolean | undefined;
  assistant: boolean | undefined;
  system: boolean | undefined;
  hasBranches: boolean | undefined;
  copied: boolean | undefined;
  lastOrHover: boolean | undefined;
  last: boolean | undefined;
  speaking: boolean | undefined;
  hasAttachments: boolean | undefined;
  hasContent: boolean | undefined;
  submittedFeedback: "positive" | "negative" | null | undefined;
};
type UseMessageIfProps = RequireAtLeastOne<MessageIfFilters>;

const useMessageIf = (props: UseMessageIfProps) => {
  return useAssistantState(({ message }) => {
    const {
      role,
      attachments,
      parts,
      branchCount,
      isLast,
      speech,
      isCopied,
      isHovering,
    } = message;

    if (props.hasBranches === true && branchCount < 2) return false;

    if (props.user && role !== "user") return false;
    if (props.assistant && role !== "assistant") return false;
    if (props.system && role !== "system") return false;

    if (props.lastOrHover === true && !isHovering && !isLast) return false;
    if (props.last !== undefined && props.last !== isLast) return false;

    if (props.copied === true && !isCopied) return false;
    if (props.copied === false && isCopied) return false;

    if (props.speaking === true && speech == null) return false;
    if (props.speaking === false && speech != null) return false;

    if (
      props.hasAttachments === true &&
      (role !== "user" || !attachments?.length)
    )
      return false;
    if (
      props.hasAttachments === false &&
      role === "user" &&
      !!attachments?.length
    )
      return false;

    if (props.hasContent === true && parts.length === 0) return false;
    if (props.hasContent === false && parts.length > 0) return false;

    if (
      props.submittedFeedback !== undefined &&
      (message.metadata.submittedFeedback?.type ?? null) !==
        props.submittedFeedback
    )
      return false;

    return true;
  });
};

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
