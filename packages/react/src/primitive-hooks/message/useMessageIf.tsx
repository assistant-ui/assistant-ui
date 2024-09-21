"use client";
import {
  useMessageStore,
  useMessageUtilsStore,
} from "../../context/react/MessageContext";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

type MessageIfFilters = {
  user: boolean | undefined;
  assistant: boolean | undefined;
  system: boolean | undefined;
  hasBranches: boolean | undefined;
  copied: boolean | undefined;
  lastOrHover: boolean | undefined;
  speaking: boolean | undefined;
  hasAttachments: boolean | undefined;
  submittedFeedback: "positive" | "negative" | null | undefined;
};
export type UseMessageIfProps = RequireAtLeastOne<MessageIfFilters>;

export const useMessageIf = (props: UseMessageIfProps) => {
  const messageStore = useMessageStore();
  const messageUtilsStore = useMessageUtilsStore();

  return useCombinedStore(
    [messageStore, messageUtilsStore],
    (
      { message, branches, isLast },
      { isCopied, isHovering, isSpeaking, submittedFeedback },
    ) => {
      if (props.hasBranches === true && branches.length < 2) return false;

      if (props.user && message.role !== "user") return false;
      if (props.assistant && message.role !== "assistant") return false;
      if (props.system && message.role !== "system") return false;

      if (props.lastOrHover === true && !isHovering && !isLast) return false;

      if (props.copied === true && !isCopied) return false;
      if (props.copied === false && isCopied) return false;

      if (props.speaking === true && !isSpeaking) return false;
      if (props.speaking === false && isSpeaking) return false;

      if (
        props.hasAttachments === true &&
        (message.role !== "user" || !message.attachments.length)
      )
        return false;
      if (
        props.hasAttachments === false &&
        message.role === "user" &&
        !!message.attachments.length
      )
        return false;

      if (
        props.submittedFeedback !== undefined &&
        submittedFeedback !== props.submittedFeedback
      )
        return false;

      return true;
    },
  );
};
