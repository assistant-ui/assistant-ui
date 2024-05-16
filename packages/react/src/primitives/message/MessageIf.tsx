"use client";

import type { Message } from "ai";
import type { FC } from "react";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";
import { useMessageContext } from "../../utils/context/MessageContext";
import { useThreadContext } from "../../utils/context/ThreadContext";
import {
  UPCOMING_MESSAGE_ID,
  type UseChatWithBranchesHelpers,
  hasUpcomingMessage,
} from "../../utils/hooks/useBranches";

type MessageIfFilters = {
  user: boolean | undefined;
  assistant: boolean | undefined;
  editing: boolean | undefined;
  hasBranches: boolean | undefined;
  copied: boolean | undefined;
  lastOrHover: boolean | undefined;
};

type MessageIfProps = RequireAtLeastOne<MessageIfFilters> & {
  children: React.ReactNode;
};

const isLast = (thread: UseChatWithBranchesHelpers, message: Message) => {
  const hasUpcoming = hasUpcomingMessage(thread);
  return hasUpcoming
    ? message.id === UPCOMING_MESSAGE_ID
    : thread.messages[thread.messages.length - 1]?.id === message.id;
};

const useMessageIf = (props: RequireAtLeastOne<MessageIfFilters>) => {
  const thread = useThreadContext("Message.If", (s) => s.chat);

  return useMessageContext(
    "Message.If",
    ({ message, editState: { isEditing }, isCopied, isHovering }) => {
      const { branchCount } = thread.getBranchState(message);

      if (props.hasBranches === true && branchCount < 2) return false;

      if (props.user && message.role !== "user") return false;
      if (props.assistant && message.role !== "assistant") return false;

      if (props.editing === true && !isEditing) return false;
      if (props.editing === false && isEditing) return false;

      if (props.lastOrHover === true && !isHovering && !isLast(thread, message))
        return false;

      if (props.copied === true && !isCopied) return false;
      if (props.copied === false && isCopied) return false;

      return true;
    },
  );
};

export const MessageIf: FC<MessageIfProps> = ({ children, ...query }) => {
  const result = useMessageIf(query);
  return result ? children : null;
};
